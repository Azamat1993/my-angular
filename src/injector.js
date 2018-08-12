var _ = require('lodash');

function createInjector(modulesToLoad) {
  var cache = {};
  var $provide = {
    constant: function(key, value) {
      constants[key] = value;
    }
  };

  _.forEach(modulesToLoad, function(moduleName) {
    var module = window.angular.module(moduleName);
    _.forEach(module._invokeQueue, function(invokeArgs) {
      var method = invokeArgs[0];
      var args = invokeArgs[1];
      $provide[method].apply($provide, args);
    });
  });
  return {
    has: function(key) {
      return cache.hasOwnProperty(key);
    }
  };
}

module.exports = createInjector;
