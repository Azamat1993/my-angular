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

module.exports = {
  hashKey: hashKey
}
