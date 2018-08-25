var _ = require('lodash');

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

  var modules = {};
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

  _.forEach(modulesToLoad, function loadModules(moduleName) {
    if (!modules.hasOwnProperty(moduleName)) {
      modules[moduleName] = true;
      var module = window.angular.module(moduleName);
      _.forEach(module.requires, loadModules);
      _.forEach(module._invokeQueue, function(invokeArgs) {
        var method = invokeArgs[0];
        var args = invokeArgs[1];
        providerCache.$provide[method].apply(providerCache.$provide, args);
      });
    }
  });

  return instanceInjector;
}

module.exports = createInjector;
