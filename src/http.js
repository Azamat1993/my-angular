'use strict';

function $HttpProvider() {
  this.$get = ['$httpBackend', '$q', '$rootScope', function($httpBackend, $q, $rootScope) {
    return function $http(config) {
      var deferred = $q.defer();

      function isSuccess(status) {
          return status >= 200 && status <= 299;
      }

      function done(status, response, statusText) {
        status = Math.max(status, 0);
        deferred[isSuccess(status) ? 'resolve' : 'reject']({
          status: status,
          data: response,
          statusText: statusText,
          config: config
        });

        if (!$rootScope.$$phase) {
          $rootScope.$apply();
        }
      }

      $httpBackend(config.method, config.url, config.data, done);
      return deferred.promise;
    }
  }]
}

module.exports = $HttpProvider;
