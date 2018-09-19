function $QProvider() {
  this.$get = function() {
    function Promise(){
      this.$$state = {};
    }

    Promise.prototype.then = function(onFulFilled) {
      this.$$state.pending = onFulFilled;
    }

    function Deferred() {
      this.promise = new Promise();
    }

    Deferred.prototype.resolve = function(val) {
      return this.promise.$$state.pending(val);
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
