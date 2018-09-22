var _ = require('lodash');
var $ = require('jquery');
function $CompilerProvider($provide) {
  var hasDirectives = {};
  var BOOLEAN_ATTRS = {
    multiple: true,
    selected: true,
    checked: true,
    disabled: true,
    readOnly: true,
    required: true,
    open: true
  };

  var BOOLEAN_ELEMENTS = {
    INPUT: true,
    SELECT: true,
    OPTION: true,
    TEXTAREA: true,
    BUTTON: true,
    FORM: true,
    DETAILS: true
  };

  this.directive = function(name, directiveFactory) {
    if (_.isString(name)) {
      if (name === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid directive name';
      }

      if (!hasDirectives.hasOwnProperty(name)) {
        hasDirectives[name] = [];

        $provide.factory(name + 'Directive', ['$injector', function($injector) {
          var factories = hasDirectives[name];
          return _.map(factories, function(factory, i) {
            var directive = $injector.invoke(factory);
            directive.name = directive.name || name;
            directive.priority = directive.priority || 0;
            directive.index = i;
            return directive;
          });
        }]);
      }
      hasDirectives[name].push(directiveFactory);
    } else {
      _.forEach(name, function(factory, key) {
        this.directive(key, factory);
      }.bind(this));
    }
  }

  this.$get = function($injector, $rootScope){
    function Attributes(element) {
      this.$$element = element;
    }

    Attributes.prototype.$set = function(key, value, writeAttr) {
      this[key] = value;
      if (writeAttr !== false) {
        this.$$element.attr(key, value);
      }

      if (this.$$observers && this.$$observers[key]) {
        _.forEach(this.$$observers[key], function(observer) {
          try {
            observer(value);
          } catch(e) {
            console.log(e)
          }
        });
      }
    }

    Attributes.prototype.$observe = function(key ,fn) {
      var self = this;
      this.$$observers = this.$$observers || Object.create(null);
      this.$$observers[key] = this.$$observers[key] || [];
      this.$$observers[key].push(fn);

      $rootScope.$evalAsync(function() {
        fn(self[key]);
      });

      return function(){
        var index = self.$$observers[key].indexOf(fn);

        if (index >= 0) {
          self.$$observers[key].splice(index, 1);
        }
      }
    }

    function compile($compileNodes) {
      return compileNodes($compileNodes);
    }

    function compileNodes($compileNodes) {
      _.forEach($compileNodes, function(node) {
        var attrs = new Attributes($(node));
        var directives = collectDirectives(node, attrs);
        var terminal = applyDirectivesToNode(directives, node, attrs);
        if (!terminal && node.childNodes && node.childNodes.length) {
          compileNodes(node.childNodes);
        }
      });
    }

    function applyDirectivesToNode(directives, compileNode, attrs) {
      var $compileNode = $(compileNode);
      var terminalPriority = -Number.MAX_VALUE;
      var terminal = false;
      _.forEach(directives, function(directive){
        if (directive.priority < terminalPriority) {
          return false;
        }

        if (directive.compile) {
          directive.compile($compileNode, attrs);
        }
        if (directive.terminal) {
          terminal = true;
          terminalPriority = directive.priority;
        }
      });

      return terminal;
    }

    function collectDirectives(node, attrs) {
      var directives = [];
      var normalizedNodeName = _.camelCase(nodeName(node).toLowerCase());
      addDirective(directives, normalizedNodeName);
      _.forEach(node.attributes, function(attr) {
        var normalizedAttrName = _.camelCase(attr.name.toLowerCase());
        addDirective(directives, normalizedAttrName);

        attrs[normalizedAttrName] = attr.value.trim();

        if (isBooleanAttribute(node, normalizedAttrName)) {
          attrs[normalizedAttrName] = true;
        }
      });

      _.forEach(node.classList, function(className) {
        var normalizedClassName = _.camelCase(className.toLowerCase());
        addDirective(directives, normalizedClassName);
      });

      directives.sort(byPriority);
      return directives;
    }

    function isBooleanAttribute(node, attrName) {
      return BOOLEAN_ATTRS[attrName] && BOOLEAN_ELEMENTS[node.nodeName];
    }

    function byPriority(a, b) {
      var diff = b.priority - a.priority;
      if (diff !== 0) {
        return diff;
      } else {
        if (a.name !== b.name) {
          return (a.name < b.name ? -1 : 1);
        } else {
          return a.index - b.index;
        }
      }
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
