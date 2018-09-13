var _ = require('lodash');

function $FilterProvider() {
  var filters = {};

  this.register = function(name, factoryFn) {
    if (_.isObject(name)) {
      return _.map(name, function(factory, name) {
        return this.register(name, factory);
      }.bind(this))
    } else {
      return filters[name] = factoryFn();
    }
  }

  this.$get = function() {
    return function filter(name) {
      return filters[name];
    }
  }
}

module.exports = $FilterProvider
