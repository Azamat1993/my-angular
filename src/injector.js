var _ = require('lodash');

var FN_ARGS = /^function\s*[^\[]*\(\s*([^\]]*)\)/m
var FN_ARG = /^\s*(\S+)\s*/;

function createInjector(modulesToLoad) {
  var cache = {};
  var providerCache = {};
  var modules = {};
  var $provide = {
    constant: function(key, value) {
      if (key === 'hasOwnProperty') {
        throw 'Cannot have such a name';
      }
      cache[key] = value;
    },
    provider: function(key, provider) {
      providerCache[key + 'Provider'] = provider;
    }
  };

  function getService(name) {
    if (cache.hasOwnProperty(name)) {
      return cache[name];
    } else if (providerCache.hasOwnProperty(name + 'Provider')) {
      var provider = providerCache[name + 'Provider'];
      return invoke(provider.$get, provider);
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

  function instantiate(fn, locals) {
    var UnwrappedType = _.isArray(fn) ? _.last(fn) : fn;
    var instance = Object.create(UnwrappedType.prototype);
    invoke(fn, instance, locals);
    return instance;
  }

  _.forEach(modulesToLoad, function loadModules(moduleName) {
    if (!modules.hasOwnProperty(moduleName)) {
      modules[moduleName] = true;
      var module = window.angular.module(moduleName);
      _.forEach(module.requires, loadModules);
      _.forEach(module._invokeQueue, function(invokeArgs) {
        var method = invokeArgs[0];
        var args = invokeArgs[1];
        $provide[method].apply($provide, args);
      });
    }
  });
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

module.exports = createInjector;
