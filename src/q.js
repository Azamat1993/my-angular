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
      _.forEach(pending,function(handlers) {
        var fn = handlers[state.status];
        if (_.isFunction(fn)) {
          fn(state.value);
        }
      })
    }

    function Promise() {
      this.$$state = {};
    }

    Promise.prototype.then = function(onFulFilled, onRejected) {
      this.$$state.pending = this.$$state.pending || [];
      this.$$state.pending.push([null, onFulFilled, onRejected]);

      if (this.$$state.status > 0) {
        scheduleProcessQueue(this.$$state);
      }
    }

    Promise.prototype.catch = function(onRejected) {
      return this.then(null, onRejected);
    }

    Promise.prototype.finally = function(callback) {
      return this.then(function(){
        callback();
      }, function() {
        callback();
      });
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

    Deferred.prototype.reject = function(reason) {
      if (this.promise.$$state.status) {
        return;
      }
      this.promise.$$state.value = reason;
      this.promise.$$state.status = 2;

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
