var _ = require('lodash');

function $QProvider() {
  this.$get = function($rootScope) {

    function scheduleProcessQueue(state) {
      $rootScope.$evalAsync(function() {
        processQueue(state);
      });
    }

    function processQueue(state) {
      var pending = state.pending;
      delete state.pending;
      _.forEach(pending,function(cb) {
        cb(state.value);
      })
    }

    function Promise() {
      this.$$state = {};
    }

    Promise.prototype.then = function(onFulFilled) {
      this.$$state.pending = this.$$state.pending || [];
      this.$$state.pending.push(onFulFilled);

      if (this.$$state.status > 0) {
        scheduleProcessQueue(this.$$state);
      }
    }

    function Deferred() {
      this.promise = new Promise();
    }

    Deferred.prototype.resolve = function(val) {
      if (this.promise.$$state.status) {
        return;
      }
      this.promise.$$state.value = val;
      this.promise.$$state.status = 1;
      scheduleProcessQueue(this.promise.$$state);
    }

    function defer() {
      return new Deferred();
    }

    return {
      defer: defer
    }
  }
}

module.exports = $QProvider;
