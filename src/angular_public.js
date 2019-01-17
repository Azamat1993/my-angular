var setupModuleLoader = require('./loader');

function publishExternalAPI() {
  setupModuleLoader(window);

  var ngModule = window.angular.module('ng', []);
  ngModule.provider('$filter', require('./filter'));
  ngModule.provider('$q', require('./q'));
  ngModule.provider('$rootScope', require('./scope'));
  ngModule.provider('$compile', require('./compile'));
  ngModule.provider('$httpBackend', require('./http_backend'));
  ngModule.provider('$http', require('./http'));
}

module.exports = publishExternalAPI;
