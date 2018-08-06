'use strict';
var _ = require('lodash');

function Scope(){
  this.$$watchers = [];
  this.$$lastWatchFn = null;
  this.$$asyncQueue = [];
  this.$$phase = null;
  this.$$applyAsyncQueue = [];
  this.$$applyAsyncId = null;
  this.$$postDigestQueue = [];
}

function initWatchFn(){}

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
  var self = this;
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function(){},
    last: initWatchFn,
    valueEq: !!valueEq
  };

  this.$$watchers.unshift(watcher);
  this.$$lastWatchFn = null;

  return function(){
    var index = self.$$watchers.indexOf(watcher);
    if (index >= 0) {
      self.$$watchers.splice(index, 1);
      self.$$lastWatchFn = null;
    }
  }
}

Scope.prototype.$digest = function(){
  var dirty;
  var ttl = 10;
  this.$$lastWatchFn = null;
  this.$beginPhase('$digest');

  if (this.$$applyAsyncId !== null) {
    clearTimeout(this.$$applyAsyncId);
    this.$$flushApplyAsync();
  }

  do {
    while (this.$$asyncQueue.length) {
      try {
        var asyncTask = this.$$asyncQueue.shift();
        asyncTask.scope.$eval(asyncTask.expression);
      } catch (e) {
        console.error(e);
      }
    }

    dirty = this.$$digestOnce();
    if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
      this.$clearPhase();
      throw 'TTl exceeded';
    }
  } while (dirty || this.$$asyncQueue.length);

  while (this.$$postDigestQueue.length) {
    try {
      this.$$postDigestQueue.shift()();
    } catch (e) {
      console.error(e);
    }
  }

  this.$clearPhase();
}

Scope.prototype.$$digestOnce = function(){
  var self = this;
  var newValue, oldValue;
  var dirty = false;

  _.forEachRight(this.$$watchers, function(watcher){
    try {
      if (watcher) {
        newValue = watcher.watchFn(self);
        oldValue = watcher.last;

        if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
          self.$$lastWatchFn = watcher;
          watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
          watcher.listenerFn(newValue,
            (oldValue === initWatchFn ? newValue : oldValue), self);

          dirty = true;
        } else if (self.$$lastWatchFn === watcher) {
          return false;
        }
      }
    } catch(e) {
      console.error(e);
    }
  });

  return dirty;
}

Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq) {
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue || (typeof newValue === 'number' &&
    typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
  }
}

Scope.prototype.$eval = function(expr, args) {
  return expr(this, args);
}

Scope.prototype.$apply = function(expr) {
  try {
    this.$beginPhase('$apply');
    this.$eval(expr);
  } finally {
    this.$clearPhase();
    this.$digest();
  }
}

Scope.prototype.$applyAsync = function(expr) {
  var self = this;
  self.$$applyAsyncQueue.push(function(){
    self.$eval(expr);
  });

  if (self.$$applyAsyncId === null) {
    self.$$applyAsyncId = setTimeout(function(){
      self.$apply(self.$$flushApplyAsync.bind(self));
    }, 0);
  }
}

Scope.prototype.$$flushApplyAsync = function(){
  while (this.$$applyAsyncQueue.length) {
    try {
      this.$$applyAsyncQueue.shift()();
    } catch (e) {
      console.error(e);
    }
  }
  this.$$applyAsyncId = null;
}

Scope.prototype.$evalAsync = function(expr) {
  var self = this;
  if (!this.$$phase && !this.$$asyncQueue.length) {
    setTimeout(function(){
      if (self.$$asyncQueue.length) {
        self.$digest();
      }
    }, 0);
  }
  this.$$asyncQueue.push({scope: this, expression: expr});
}

Scope.prototype.$beginPhase = function(phase) {
  if (this.$$phase) {
    throw 'phase already running!';
  }
  this.$$phase = phase;
}

Scope.prototype.$clearPhase = function(){
  this.$$phase = null;
}

Scope.prototype.$$postDigest = function(expr){
  this.$$postDigestQueue.push(expr);
}

Scope.prototype.$watchGroup = function(watchers, listenerFn) {
  var self = this;
  var newValues = new Array(watchers.length);
  var oldValues = new Array(watchers.length);

  var changeReactionScheduled = false;

  function watchGroupListener(){
    listenerFn(newValues, oldValues, self);
    changeReactionScheduled = false;
  }

  _.forEach(watchers, function(watchFn, i) {
    self.$watch(watchFn, function(newValue, oldValue) {
      newValues[i] = newValue;
      oldValues[i] = oldValue;

      if (!changeReactionScheduled) {
        changeReactionScheduled = true;
        self.$evalAsync(watchGroupListener);
      }
    });
  });
}

module.exports = Scope;
