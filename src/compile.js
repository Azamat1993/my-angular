var _ = require('lodash');
var $ = require('jquery');
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

  this.$get = function($injector){
    function compile($compileNodes) {
      return compileNodes($compileNodes);
    }

    function compileNodes($compileNodes) {
      _.forEach($compileNodes, function(node) {
        var directives = collectDirectives(node);
        applyDirectivesToNode(directives, node);
        if (node.childNodes && node.childNodes.length) {
          compileNodes(node.childNodes);
        }
      });
    }

    function applyDirectivesToNode(directives, compileNode) {
      var $compileNode = $(compileNode);
      _.forEach(directives, function(directive){
        if (directive.compile) {
          directive.compile($compileNode);
        }
      })
    }

    function collectDirectives(node) {
      var directives = [];
      var normalizedNodeName = _.camelCase(nodeName(node).toLowerCase());
      addDirective(directives, normalizedNodeName);
      _.forEach(node.attributes, function(attr) {
        var normalizedAttrName = _.camelCase(attr.name.toLowerCase());
        addDirective(directives, normalizedAttrName);
      });
      return directives;
    }

    function nodeName(node) {
      return node.nodeName ? node.nodeName : node[0].nodeName;
    }

    function addDirective(directives, name) {
      if (hasDirectives.hasOwnProperty(name)) {
        directives.push.apply(directives, $injector.get(name + 'Directive'));
      }
    }

    return compile;
  }
}

$CompilerProvider.$inject = ['$provide'];

module.exports = $CompilerProvider;
