'use strict';
var _ = require('lodash')

function $HttpProvider() {
  var defaults = this.defaults = {
    headers: {
      common: {
        Accept: 'application/json, text/plain, */*'
      },
      post: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      put: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      patch: {
        'Content-Type': 'application/json;charset=utf-8'
      }
    }
  }

  this.$get = ['$httpBackend', '$q', '$rootScope', function($httpBackend, $q, $rootScope) {
    function $http(requestConfig) {
      var deferred = $q.defer();

      var config = _.extend({
        method: 'GET'
      }, requestConfig);
      config.headers = mergeHeaders(requestConfig);

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

      function mergeHeaders(config) {
        return _.extend(
          {},
          defaults.headers.common,
          defaults.headers[(config.method || 'get').toLowerCase()],
          config.headers
        )
      }

      $httpBackend(config.method, config.url, config.data, done, config.headers);
      return deferred.promise;
    }

    $http.defaults = defaults;
    return $http;
  }]
}

module.exports = $HttpProvider;
