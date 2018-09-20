var _ = require('lodash');
function $CompilerProvider($provide) {
  var hasDirectives = {};

  this.directive = function(name, directiveFactory) {
    if (_.isString(name)) {
      if (name === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid directive name';
      }

      if (!hasDirectives.hasOwnProperty(name)) {
        hasDirectives[name] = [];

        $provide.factory(name + 'Directive', ['$injector', function($injector) {
          var factories = hasDirectives[name];
          return _.map(factories, $injector.invoke);
        }]);
      }
      hasDirectives[name].push(directiveFactory);
    } else {
      _.forEach(name, function(factory, key) {
        this.directive(key, factory);
      }.bind(this));
    }
  }

  this.$get = function(){

  }
}

$CompilerProvider.$inject = ['$provide'];

module.exports = $CompilerProvider;
