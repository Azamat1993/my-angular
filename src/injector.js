var _ = require('lodash');

function createInjector(modulesToLoad) {
  var cache = {};
  var modules = {};
  var $provide = {
    constant: function(key, value) {
      if (key === 'hasOwnProperty') {
        throw 'Cannot have such a name';
      }
      cache[key] = value;
    }
  };

  function invoke(fn, context, mapper) {
    mapper = mapper || {};
    var args = _.map(fn.$inject, function(injectArg) {
      if (mapper.hasOwnProperty(injectArg)) {
        return mapper[injectArg];
      } else if (_.isString(injectArg)) {
        return cache[injectArg];
      } else {
        throw 'Incorrect type';
      }
    });
    return fn.apply(context, args);
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
      return cache.hasOwnProperty(key);
    },
    get: function(name) {
      return cache[name];
    },
    invoke: invoke
  };
}

module.exports = createInjector;
