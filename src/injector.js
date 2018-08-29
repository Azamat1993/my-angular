var _ = require('lodash');
var HashMap = require('./hash_map').HashMap;

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]+)\)/m
var FN_ARG = /^\s*(\S+)\s*/;

var INSTANTIATING = {};

function createInjector(modulesToLoad) {
  var providerCache = {};
  var providerInjector = createInternalInjector(providerCache, function(){
    throw 'Unknown provider: ' + path.join(' <- ');
  });

  var instanceCache = {};
  var instanceInjector = createInternalInjector(instanceCache, function(name){
    var provider = providerInjector.get(name + 'Provider');
    return instanceInjector.invoke(provider.$get, provider);
  });

  instanceCache.$injector = instanceInjector;
  providerCache.$injector = providerInjector;

  var modules = new HashMap();
  var path = [];

  providerCache.$provide = {
    constant: function(key, value) {
      if (key === 'hasOwnProperty') {
        throw 'Cannot have such a name';
      }
      instanceCache[key] = value;
      providerCache[key] = value;
    },
    provider: function(key, provider) {
      if (_.isFunction(provider)) {
        provider = providerInjector.instantiate(provider);
      }
      providerCache[key + 'Provider'] = provider;
    }
  }

  function createInternalInjector(cache, factoryFn) {
    function getService(name) {
      if (cache.hasOwnProperty(name)) {
        if (cache[name] === INSTANTIATING) {
          throw  new Error('Circular dependency found: ' + name + ' <- ' + path.join(' <- '))
        }
        return cache[name];
      } else {
        path.unshift(name);
        cache[name] = INSTANTIATING;

        try {
          cache[name] = factoryFn(name);
          return cache[name];
        } finally {
          path.shift();
          if (cache[name] === INSTANTIATING) {
            delete cache[name];
          }
        }
      }
    }

    function invoke(fn, context, mapper) {
      mapper = mapper || {};
      var args = _.map(annotate(fn), function(injectArg) {
        if (mapper.hasOwnProperty(injectArg)) {
          return mapper[injectArg];
        } else if (_.isString(injectArg)) {
          return getService(injectArg);
        } else {
          throw 'Incorrect type';
        }
      });

      if(_.isArray(fn)) {
        fn = _.last(fn);
      }

      return fn.apply(context, args);
    }

    function instantiate(fn, locals) {
      var UnwrappedType = _.isArray(fn) ? _.last(fn) : fn;
      var instance = Object.create(UnwrappedType.prototype);
      invoke(fn, instance, locals);
      return instance;
    }

    return {
      has: function(key) {
        return cache.hasOwnProperty(key)
          || providerCache.hasOwnProperty(key + 'Provider');
      },
      get: getService,
      invoke: invoke,
      annotate: annotate,
      instantiate: instantiate
    };
  }

  function annotate(fn) {
    if (_.isArray(fn)) {
      return fn.splice(0, fn.length - 1);
    } else if (fn.$inject) {
      return fn.$inject;
    } else if (!fn.length) {
      return [];
    } else {
      var argDeclaration = fn.toString().match(FN_ARGS);
      return _.map(argDeclaration[1].split(','), function(arg) {
        return arg.match(FN_ARG)[1];
      });
    }
  }

  function runInvokeQueue(queue) {
    _.forEach(queue, function(invokeArgs) {
      var service = providerInjector.get(invokeArgs[0]);
      var method = invokeArgs[1];
      var args = invokeArgs[2];

      service[method].apply(service, args);
    })
  }

  var runBlocks = [];
  _.forEach(modulesToLoad, function loadModules(module) {
    if (!modules.get(module)) {
      modules.put(module, true);
      if (_.isString(module)) {
        modules[module] = true;
        module = window.angular.module(module);
        _.forEach(module.requires, loadModules);
        runInvokeQueue(module._invokeQueue);
        runInvokeQueue(module._configBlocks);
        runBlocks = runBlocks.concat(module._runBlocks);
      } else if (_.isFunction(module) || _.isArray(module)) {
        runBlocks.push(providerInjector.invoke(module));
      }
    }
  });

  _.forEach(_.compact(runBlocks), function(runBlock) {
    instanceInjector.invoke(runBlock);
  })

  return instanceInjector;
}

module.exports = createInjector;
