'use strict';
var _ = require('lodash');

function Scope() {
  this.$$watchers = [];
  this.$$lastWatchFn = null;
  this.$$asyncQueue = [];
  this.$$phase = null;
  this.$$applyAsyncQueue = [];
  this.$$applyAsyncId = null;
  this.$$postDigestQueue = [];
  this.$root = this;
  this.$$children = [];
  this.$parent = null;
  this.$$listeners = {};
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

  return function() {
    var index = self.$$watchers.indexOf(watcher);

    if(index >= 0) {
      self.$$watchers.splice(index, 1);
      self.$$lastWatchFn = null;
    }
  }
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

Scope.prototype.$digest = function(){
  var dirty;
  var ttl = 10;

  this.$$lastWatchFn = null;

  if (this.$$applyAsyncId !== null) {
    clearTimeout(this.$$applyAsyncId);
    this.$$flushApplyAsync();
  }

  this.$beginPhase('$digest');
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
      throw 'ttl exceeded';
    }
  } while(dirty || this.$$asyncQueue.length);

  while (this.$$postDigestQueue.length) {
    try {
      this.$$postDigestQueue.shift()();
    } catch(e) {
      console.error(e);
    }
  }

  this.$clearPhase();
}

Scope.prototype.$$digestOnce = function(){
  var self = this;
  var continueLoop = true;
  var dirty = false;

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
              (oldValue === initWatchFn ? newValue : oldValue), scope);

            dirty = true;
          } else if (scope.$root.$$lastWatchFn === watcher) {
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

Scope.prototype.$applyAsync = function(expr) {
  var self = this;
  this.$$applyAsyncQueue.push(function(){
    self.$eval(expr);
  });

  if (this.$$applyAsyncId === null) {
    this.$$applyAsyncId = setTimeout(function(){
      self.$apply(self.$$flushApplyAsync.bind(self));
    }, 0);
  }
}

Scope.prototype.$$flushApplyAsync = function(){
  while (this.$$applyAsyncQueue.length) {
    try {
      this.$$applyAsyncQueue.shift()();
    } catch(e) {
      console.error(e);
    }
  }
  this.$$applyAsyncId = null;
}

Scope.prototype.$beginPhase = function(phase) {
  if (this.$$phase) {
    throw 'phase in use';
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
  var changed = false;
  var isFirstRun = true;

  if (watchFns.length === 0) {
    var shouldRun = true;
    self.$evalAsync(function(){
      if (shouldRun) {
        listenerFns(newValues, oldValues, self);
      }
    });
    return function(){
      shouldRun = false;
    };
  }

  function listenerFns(){
    listenerFn(newValues,
      (isFirstRun ? newValues : oldValues), self);
    changed = false;
    isFirstRun = false;
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

Scope.prototype.$destroy = function(){
  if (this.$parent) {
    var index = this.$parent.$$children.indexOf(this);
    if (index >= 0) {
      this.$parent.$$children.splice(index, 1);
    }
  }
  this.$$watchers = null;
}

Scope.prototype.$new = function(isolated, parent){
  var child;
  parent = parent || this;
  if (isolated) {
    child = new Scope();
    child.$root = parent.$root;
    child.$$asyncQueue = parent.$$asyncQueue;
    child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
    child.$$applyAsyncId = parent.$$applyAsyncId;
    child.$$postDigestQueue = parent.$$postDigestQueue;
  } else {
    var ChildScope = function(){};
    ChildScope.prototype = this;
    child = new ChildScope();
  }
  parent.$$children.push(child);
  child.$parent = parent;
  child.$$watchers = [];
  child.$$children = [];
  child.$$listeners = {};
  return child;
}

Scope.prototype.$on = function(eventName, listenerFn) {
  var self = this;
  if (!this.$$listeners[eventName]) {
    this.$$listeners[eventName] = [];
  }
  this.$$listeners[eventName].push(listenerFn);

  return function(){
    var index = self.$$listeners[eventName].indexOf(listenerFn);

    if (index >= 0) {
      self.$$listeners[eventName][index] = null;
    }
  }
}

Scope.prototype.$emit = function(eventName) {
  var shouldStop = false;
  var event = {
    name: eventName,
    targetScope: this,
    stopPropagation: function () {
      shouldStop = true;
    }
  };
  var listenerArgs = [event].concat(this.$$getRest(arguments));
  var scope = this;
  do {
    event.currentScope = scope;
    scope.$$fireFromEvent(eventName, listenerArgs);
    scope = scope.$parent;
  } while (scope && !shouldStop);
  event.currentScope = null;
  return event;
}

Scope.prototype.$broadcast = function(eventName) {
  var event = {
    name: eventName,
    targetScope: this,
    currentScope: this
  };
  var listenerArgs = [event].concat(this.$$getRest(arguments));
  this.$$everyScope(function(scope) {
    event.currentScope = scope;
    scope.$$fireFromEvent(eventName, listenerArgs);
    return true;
  });
  event.currentScope = null;
  return event;
}

Scope.prototype.$$getRest = function(args) {
  return Array.prototype.splice.call(args, 1);
}

Scope.prototype.$$fireFromEvent = function(eventName, listenerArgs) {
  var listeners = this.$$listeners[eventName] || [];

  var i = 0;
  while (i < listeners.length) {
    if (listeners[i] === null) {
      this.$$listeners[eventName].splice(i, 1);
    } else {
      listeners[i++].apply(null, listenerArgs);
    }
  }
}

module.exports = Scope;
