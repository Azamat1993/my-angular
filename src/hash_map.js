var _ = require('lodash');

var hashKey = function(value) {
  var type = typeof value;
  var uid;
  if (type === 'function' || (type === 'object' && value !== null)) {
    if (typeof value.$$hashKey === 'function') {
      uid = value.$$hashKey();
    } else {
      uid = value.$$hashKey;
      if (uid === undefined) {
        uid = value.$$hashKey = _.uniqueId();
      }
    }
  } else {
    uid = value;
  }
  return type + ':' + uid;
}

function HashMap() {
}

HashMap.prototype = {
  put: function(key, value) {
    this[hashKey(key)] = value;
  },
  get: function(key, value) {
    return this[hashKey(key)];
  },
  remove: function(key) {
    var value = this.get(key);
    if (value) {
      delete this[hashKey(key)];
    }
    return value;
  }
}

module.exports = {
  hashKey: hashKey,
  HashMap: HashMap
}
