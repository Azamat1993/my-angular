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
  this.$$children = [];
  this.$root = this;
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
  this.$root.$$lastWatchFn = null;

  return function(){
    var index = self.$$watchers.indexOf(watcher);
    if (index >= 0) {
      self.$$watchers.splice(index, 1);
      self.$root.$$lastWatchFn = null;
    }
  }
}

Scope.prototype.$digest = function(){
  var dirty;
  var ttl = 10;
  this.$root.$$lastWatchFn = null;
  this.$beginPhase('$digest');

  if (this.$root.$$applyAsyncId !== null) {
    clearTimeout(this.$root.$$applyAsyncId);
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

Scope.prototype.$$everyScope = function(fn) {
  if (fn(this)) {
    return this.$$children.every(function(child) {
      return child.$$everyScope(fn);
    });
  } else {
    return false;
  }
}

Scope.prototype.$$digestOnce = function(){
  var self = this;
  var dirty = false;
  var continueLoop = true;

  this.$$everyScope(function(scope) {
    var newValue, oldValue;

    _.forEachRight(scope.$$watchers, function(watcher) {
      if (watcher) {
        try {
          newValue = watcher.watchFn(scope);
          oldValue = watcher.last;

          if (!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
            scope.$root.$$lastWatchFn = watcher;
            watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
            watcher.listenerFn(newValue,
              (oldValue === initWatchFn ? newValue : oldValue),
              scope);

            dirty = true;
          } else if(scope.$root.$$lastWatchFn === watcher) {
            continueLoop = false;
            return false;
          }
        } catch(e) {
          console.error(e);
        }
      }
    });

    return continueLoop;
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
    this.$root.$digest();
  }
}

Scope.prototype.$applyAsync = function(expr) {
  var self = this;
  self.$$applyAsyncQueue.push(function(){
    self.$eval(expr);
  });

  if (self.$root.$$applyAsyncId === null) {
    self.$root.$$applyAsyncId = setTimeout(function(){
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
  this.$root.$$applyAsyncId = null;
}

Scope.prototype.$evalAsync = function(expr) {
  var self = this;
  if (!this.$$phase && !this.$$asyncQueue.length) {
    setTimeout(function(){
      if (self.$$asyncQueue.length) {
        self.$root.$digest();
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

Scope.prototype.$watchGroup = function(watchFns, listenerFn) {
  var self = this;
  var newValues = new Array(watchFns.length);
  var oldValues = new Array(watchFns.length);

  if(watchFns.length === 0) {
    var destroy = false;
    self.$evalAsync(function(){
      if (!destroy) {
        listenerFn(newValues, oldValues, self);
      }
    });
    return function(){
      destroy = true;
    };
  }

  var changed = false;
  var firstRun = false;
  function listenerFns(){
    changed = false;
    listenerFn(newValues, (!firstRun ? newValues : oldValues), self);
    firstRun = true;
  }

  var destroyFns = _.map(watchFns, function(watchFn, i) {
     return self.$watch(watchFn, function(newValue, oldValue) {
       newValues[i] = newValue;
       oldValues[i] = oldValue;

       if (!changed) {
        changed = true;
        self.$evalAsync(listenerFns);
       }
     });
  });

  return function(){
    _.forEach(destroyFns, function(destroyFn) {
      destroyFn();
    });
  }
}

Scope.prototype.$new = function(isolated){
  var child;
  if (isolated) {
    child = new Scope();
    child.$root = this.$root;
    child.$$asyncQueue = this.$root.$$asyncQueue;
    child.$$postDigestQueue = this.$root.$$postDigestQueue;
    child.$$applyAsyncQueue = this.$root.$$applyAsyncQueue;
  } else {
    var ChildScope = function(){};
    ChildScope.prototype = this;
    child = new ChildScope();
  }
  child.$$watchers = [];
  child.$$children = [];

  this.$$children.push(child);

  return child;
}

module.exports = Scope;
