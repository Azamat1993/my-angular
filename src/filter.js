var _ = require('lodash');

var filters = {};

function register(name, factoryFn) {
  if (_.isObject(name)) {
    return _.map(name, function(factory, name) {
      return register(name, factory);
    })
  } else {
    return filters[name] = factoryFn();  
  }
}

function filter(name) {
  return filters[name];
}

module.exports = {
  register: register,
  filter: filter
}
