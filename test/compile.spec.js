var _ = require('lodash');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
var $ = require('jquery');

describe('$compile', function(){
  beforeEach(function(){
    delete window.angular;
    publishExternalAPI();
  });

  function makeInjectorWithDirectives() {
    var args = arguments;
    return createInjector(['ng', function($compileProvider) {
      $compileProvider.directive.apply($compileProvider, args);
    }])
  }

  it('allows creating directives', function(){
    var myModule = window.angular.module('myModule', []);
    myModule.directive('testing', function(){});
    var injector = createInjector(['ng', 'myModule']);
    expect(injector.has('testingDirective')).toBe(true);
  });

  it('allows creating many directives with the same name', function(){
    var myModule = window.angular.module('myModule', []);
    myModule.directive('testing', _.constant({d: 'one'}));
    myModule.directive('testing', _.constant({d: 'two'}));

    var injector = createInjector(['ng', 'myModule']);

    var result = injector.get('testingDirective');
    expect(result.length).toBe(2);
    expect(result[0].d).toEqual('one');
    expect(result[1].d).toEqual('two');
  });

  it('does not allow a directive called hasOwnProperty', function() {
    var myModule = window.angular.module('myModule', []);
    myModule.directive('hasOwnProperty', function() { });
    expect(function() { createInjector(['ng', 'myModule']); }).toThrow();
  });

  it('allows creating directives with object notation', function(){
    var myModule = window.angular.module('myModule', []);
    myModule.directive({
      a: function(){},
      b: function(){},
      c: function(){}
    });

    var injector = createInjector(['ng', 'myModule']);

    expect(injector.has('aDirective')).toBe(true);
    expect(injector.has('bDirective')).toBe(true);
    expect(injector.has('cDirective')).toBe(true);
  });

  it('compiles element directives from a single element', function(){
    var injector = makeInjectorWithDirectives('myDirective', function(){
      return {
        compile: function(element) {
          element.data('hasCompiled', true);
        }
      }
    })

    injector.invoke(function($compile) {
      var el = $('<my-directive></my-directive>');
      $compile(el);
      expect(el.data('hasCompiled')).toBe(true);
    });
  });

  it('compiles element directives found from several elements', function(){
    var idx = 1;
    var injector = makeInjectorWithDirectives('myDirective', function(){
      return {
        compile: function(element) {
          element.data('hasCompiled', idx++);
        }
      }
    });

    injector.invoke(function($compile) {
      var el = $('<my-directive></my-directive><my-directive></my-directive>');
      $compile(el);
      expect(el.eq(0).data('hasCompiled')).toBe(1);
      expect(el.eq(1).data('hasCompiled')).toBe(2);
    });
  });

  it('compiles element directives from child elements', function(){
    var idx = 1;
    var injector = makeInjectorWithDirectives('myDirective', function(){
      return {
        compile: function(element) {
          element.data('hasCompiled', idx++);
        }
      }
    });

    injector.invoke(function($compile) {
      var el = $('<div><my-directive></my-directive></div>');
      $compile(el);
      expect(el.data('hasCompiled')).toBeUndefined();
      expect(el.find('> my-directive').data('hasCompiled')).toBe(1);
    });
  });

  it('compiles attribute directives', function(){
    var injector = makeInjectorWithDirectives('myDirective', function(){
      return {
        compile: function(element) {
          element.data('hasCompiled', true);
        }
      }
    });

    injector.invoke(function($compile) {
      var el =$('<div my-directive></div>');
      $compile(el);
      expect(el.data('hasCompiled')).toBe(true);
    });
  });

  it('compiles several attribute directives in an element', function(){
    var injector = makeInjectorWithDirectives({
      myDirective: function(){
        return {
          compile: function(element) {
            element.data('hasCompiled', true);
          }
        }
      },
      mySecondDirective: function(){
        return {
          compile: function(element) {
            element.data('secondCompiled', true);
          }
        }
      }
    });

    injector.invoke(function($compile) {
      var el = $('<div my-directive my-second-directive></div>');
      $compile(el);
      expect(el.data('hasCompiled')).toBe(true);
      expect(el.data('secondCompiled')).toBe(true);
    });
  });

  it('compiles both element and attributes directives in an element', function(){
    var injector = makeInjectorWithDirectives({
      myDirective: function(){
        return {
          compile: function(element) {
            element.data('hasCompiled', true);
          }
        }
      },
      mySecondDirective: function(){
        return {
          compile: function(element) {
            element.data('secondCompiled', true);
          }
        }
      }
    });

    injector.invoke(function($compile) {
      var el = $('<my-directive my-second-directive></my-directive>');
      $compile(el);
      expect(el.data('hasCompiled')).toBe(true);
      expect(el.data('secondCompiled')).toBe(true)
    });
  });

  it('compiles class directives', function(){
    var injector = makeInjectorWithDirectives('myDirective', function(){
      return {
        compile: function(element) {
          element.data('hasCompiled', true);
        }
      }
    });

    injector.invoke(function($compile) {
      var el = $('<div class="my-directive"></div>');
      $compile(el);
      expect(el.data('hasCompiled')).toBe(true);
    });
  });

  it('compiles several class directives in an element', function(){
    var injector = makeInjectorWithDirectives({
      myDirective: function(){
        return {
          compile: function(element) {
            element.data('hasCompiled', true);
          }
        }
      },
      mySecondDirective: function() {
        return {
          compile: function(element) {
            element.data('secondCompiled', true);
          }
        }
      }
    });
    injector.invoke(function($compile) {
      var el = $('<div class="my-directive my-second-directive"></div>');
      $compile(el);
      expect(el.data('hasCompiled')).toBe(true);
      expect(el.data('secondCompiled')).toBe(true);
    });
  });

  it('applies in priority order', function(){
    var compilations = [];
    var injector = makeInjectorWithDirectives({
      lowerDirective: function(){
        return {
          priority: 1,
          compile: function(element) {
            compilations.push('lower');
          }
        }
      },
      higherDirective: function(){
        return {
          priority: 2,
          compile: function(element) {
            compilations.push('higher');
          }
        }
      }
    });

    injector.invoke(function($compile) {
      var el = $('<div lower-directive higher-directive></div>');
      $compile(el);
      expect(compilations).toEqual(['higher', 'lower']);
    });
  });

  it('applies in name order when priorities are the same', function(){
    var compilations = [];
    var injector = makeInjectorWithDirectives({
      firstDirective: function(){
        return {
          priority: 1,
          compile: function(element) {
            compilations.push('first');
          }
        }
      },
      secondDirective: function(){
        return {
          priority: 1,
          compile: function(element) {
            compilations.push('second');
          }
        }
      }
    });

    injector.invoke(function($compile) {
      var el = $('<div second-directive first-directive></div>');
      $compile(el);
      expect(compilations).toEqual(['first', 'second']);
    });
  });

  it('applies in registration order when names are the same', function(){
    var compilations = [];
    var myModule = window.angular.module('myModule', []);

    myModule.directive('aDirective', function(){
      return {
        priority: 1,
        compile: function(element) {
          compilations.push('first');
        }
      }
    });

    myModule.directive('aDirective', function(){
      return {
        priority: 1,
        compile: function(element) {
          compilations.push('second');
        }
      }
    })

    var injector = createInjector(['ng', 'myModule']);

    injector.invoke(function($compile) {
      var el = $('<div a-directive></div>');
      $compile(el);
      expect(compilations).toEqual(['first', 'second']);
    });
  });

  it('stops compiling at a terminal directive', function(){
    var compilations = [];
    var myModule = window.angular.module('myModule', []);
    myModule.directive('firstDirective', function(){
      return {
        priority: 1,
        terminal: true,
        compile: function(element) {
          compilations.push('first');
        }
      }
    });

    myModule.directive('secondDirective', function(){
      return {
        priority: 0,
        compile: function(element) {
          compilations.push('second');
        }
      }
    });

    var injector = createInjector(['ng','myModule']);
    injector.invoke(function($compile) {
      var el = $('<div first-directive second-directive></div>');
      $compile(el);
      expect(compilations).toEqual(['first']);
    });
  });

  it('still compiles directives with same priority after terminal', function(){
    var compilations = [];
    var myModule = window.angular.module('myModule', []);
    myModule.directive('firstDirective', function(){
      return {
        priority: 1,
        terminal: true,
        compile: function(element) {
          compilations.push('first');
        }
      }
    });

    myModule.directive('secondDirective', function(){
      return {
        priority: 1,
        compile: function(element) {
          compilations.push('second');
        }
      }
    });

    var injector = createInjector(['ng','myModule']);
    injector.invoke(function($compile) {
      var el = $('<div first-directive second-directive></div>');
      $compile(el);
      expect(compilations).toEqual(['first', 'second']);
    });
  });

  it('stops child compilation after a terminal directive', function(){
    var compilations = [];
    var myModule = window.angular.module('myModule', []);
    myModule.directive('parentDirective', function(){
      return {
        terminal: true,
        compile: function(element) {
          compilations.push('parent');
        }
      }
    });

    myModule.directive('childDirective', function(){
      return {
        compile: function(element) {
          compilations.push('second');
        }
      }
    });

    var injector = createInjector(['ng', 'myModule']);
    injector.invoke(function($compile) {
      var el = $('<div parent-directive><div child-directive></div></div>')
      $compile(el);
      expect(compilations).toEqual(['parent']);
    });
  });

  describe('attributes', function(){

    function registerAndCompile(dirName, domString, callback) {
      var givenAttrs;
      var injector = makeInjectorWithDirectives(dirName, function(){
        return {
          compile: function(element, attrs) {
            givenAttrs = attrs;
          }
        }
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $(domString);
        $compile(el);
        callback(el, givenAttrs, $rootScope);
      })
    }

    it('passes the element attributes to the compile function', function(){
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          compile: function(element, attrs) {
            element.data('givenAttrs', attrs);
          }
        }
      });

      injector.invoke(function($compile) {
        var el = $('<my-directive my-attr="1" my-other-attr="two"></my-directive>');
        $compile(el);

        expect(el.data('givenAttrs').myAttr).toEqual('1');
        expect(el.data('givenAttrs').myOtherAttr).toEqual('two');
      });
    });

    it('trims attribute values', function(){
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          compile: function(element, attrs) {
            element.data('givenAttrs', attrs);
          }
        }
      });

      injector.invoke(function($compile) {
        var el = $('<my-directive my-attr=" val "></my-directive>');
        $compile(el);

        expect(el.data('givenAttrs').myAttr).toEqual('val');
      });
    });

    it('sets the value of boolean attributes to true', function(){
      registerAndCompile(
        'myDirective',
        '<input my-directive disabled>',
        function(element, attrs) {
          expect(attrs.disabled).toBe(true);
        }
      )
    });

    it('does not set the value of custom boolean attributes to true', function(){
      registerAndCompile(
        'myDirective',
        '<input my-directive whatever>',
        function(element, attrs) {
          expect(attrs.whatever).toEqual('');
        }
      )
    });

    it('allows setting attributes', function(){
      registerAndCompile(
        'myDirective',
        '<my-directive attr="true"></my-directive>',
        function(element, attrs) {
          attrs.$set('attr', 'false');
          expect(attrs.attr).toBe('false');
        }
      )
    });

    it('sets attributes to DOM', function(){
      registerAndCompile(
        'myDirective',
        '<my-directive attr="true"></my-directive>',
        function(element, attrs) {
          attrs.$set('attr', 'false');
          expect(element.attr('attr')).toEqual('false');
        }
      )
    });

    it('does not set attributes to DOM when flag is false', function(){
      registerAndCompile(
        'myDirective',
        '<my-directive attr="true"></my-directive>',
        function(element, attrs) {
          attrs.$set('attr', 'false', false);
          expect(element.attr('attr')).toEqual('true');
        }
      )
    });

    it('shares attributes between directives', function(){
      var attrs1, attrs2;
      var injector = makeInjectorWithDirectives({
        myDir: function(){
          return {
            compile: function(element, attrs) {
              attrs1 = attrs;
            }
          }
        },
        myOtherDir: function(){
          return {
            compile: function(element, attrs) {
              attrs2 = attrs;
            }
          }
        }
      });

      injector.invoke(function($compile) {
        var el = $('<div my-dir my-other-dir></div>');
        $compile(el);
        expect(attrs1).toBe(attrs2);
      })
    });

    it('calls observer immediately when attribute is $set', function(){
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        function(element, attrs) {
          var gotValue;

          attrs.$observe('someAttribute', function(value) {
            gotValue = value;
          });

          attrs.$set('someAttribute', 42);

          expect(gotValue).toBe(42);
        }
      )
    });

    it('calls observer on next $digest after registration', function(){
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        function(element, attrs, $rootScope) {
          var gotValue;

          attrs.$observe('someAttribute', function(value) {
            gotValue = value;
          });

          $rootScope.$digest();

          expect(gotValue).toBe('42');
        }
      )
    });

    it('lets observers be deregistered', function(){
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        function(element, attrs) {
          var gotValue;

          var remove = attrs.$observe('someAttribute', function(value) {
            gotValue = value;
          })

          attrs.$set('someAttribute', '43');
          expect(gotValue).toEqual('43');

          remove();
          attrs.$set('someAttribute', '44');
          expect(gotValue).toEqual('43');
        }
      )
    });

    it('allows adding classes', function(){
      registerAndCompile(
        'myDirective',
        '<my-directive></my-directive>',
        function(element, attrs) {
          attrs.$addClass('some-class');
          expect(element.hasClass('some-class')).toBe(true);
        }
      )
    });

    it('allows removing classes', function(){
      registerAndCompile(
        'myDirective',
        '<my-directive class="some-class"></my-directive>',
        function(element, attrs) {
          attrs.$removeClass('some-class');
          expect(element.hasClass('some-class')).toBe(false)
        }
      )
    });
  });

  it('returns a public link function from compile', function(){
    var injector = makeInjectorWithDirectives('myDirective', function(){
      return {
        compile: _.noop
      }
    });

    injector.invoke(function($compile) {
      var el = $('<div my-directive></div>');
      var linkFn = $compile(el);
      expect(linkFn).toBeDefined();
      expect(_.isFunction(linkFn)).toBe(true);
    });
  });

  describe('linking', function() {
    it('takes a scope and attaches it to elements', function(){
      var injector = makeInjectorWithDirectives('myDirective', function() {
        return {compile: _.noop};
      });
      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        expect(el.data('$scope')).toBe($rootScope);
      });
    });

    it('calls directive link function with scope', function(){
      var givenScope, givenElement, givenAttrs;
      var injector = makeInjectorWithDirectives('myDirective', function() {
         return { compile: function() {
           return function link(scope, element, attrs) {
             givenScope = scope;
             givenElement = element;
             givenAttrs = attrs;
           };
         }
       };
     });
     injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        expect(givenScope).toBe($rootScope);
        expect(givenElement[0]).toBe(el[0]);
        expect(givenAttrs).toBeDefined();
        expect(givenAttrs.myDirective).toBeDefined();
      });
    });

    it('supports link function in directive definition object', function(){
      var givenScope, givenElement, givenAttrs;
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          link: function(scope, element, attrs) {
            givenScope = scope;
            givenElement = element;
            givenAttrs = attrs;
          }
        }
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        expect(givenScope).toBe($rootScope);
        expect(givenElement[0]).toBe(el[0]);
        expect(givenAttrs).toBeDefined();
        expect(givenAttrs.myDirective).toBeDefined();
      });
    });

    it('links directive on child elements first', function(){
      var givenElements = [];
      var injector = makeInjectorWithDirectives('myDirective', function() {
        return {
          link: function(scope, element, attrs) {
            givenElements.push(element);
          }
        };
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive><div my-directive></div></div>');
        $compile(el)($rootScope);
        expect(givenElements.length).toBe(2);
        expect(givenElements[0][0]).toBe(el[0].firstChild);
        expect(givenElements[1][0]).toBe(el[0]);
      });
    });

    it('links children when parent has no directives', function(){
      var givenElements = [];
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          link: function(scope, element, attrs) {
            givenElements.push(element);
          }
        };
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div><div my-directive></div></div>');
        $compile(el)($rootScope);
        expect(givenElements.length).toBe(1);
        expect(givenElements[0][0]).toBe(el[0].firstChild);
      });
    });

    it('supports link function objects', function(){
      var linked;
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          link: {
            post: function(scope, element, attrs) {
              linked = true;
            }
          }
        };
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div><div my-directive></div></div>');
        $compile(el)($rootScope);
        expect(linked).toBe(true);
      });
    });

    it('supports prelinking and postlinking', function(){
      var linkings = [];
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          link: {
            pre: function(scope, element) {
              linkings.push(['pre', element[0]]);
            },
            post: function(scope, element) {
              linkings.push(['post', element[0]]);
            }
          }
        };
      });

      injector.invoke(function($compile, $rootScope){
        var el = $('<div my-directive><div my-directive></div></div>');
        $compile(el)($rootScope);
        expect(linkings[0]).toEqual(['pre', el[0]]);
        expect(linkings[1]).toEqual(['pre', el[0].firstChild]);
        expect(linkings[2]).toEqual(['post', el[0].firstChild]);
        expect(linkings[3]).toEqual(['post', el[0]]);
      });
    });

    it('reverses priority for postlink functions', function(){
      var linkings = [];
      var injector = makeInjectorWithDirectives({
        firstDirective: function() {
          return {
            priority: 2,
            link: {
              pre: function(scope, element) {
                linkings.push('first-pre');
              },
              post: function(scope, element) {
                linkings.push('first-post');
              }
            }
          };
        },
        secondDirective: function(){
          return {
            priority: 1,
            link: {
              pre: function(scope, element) {
                linkings.push('second-pre');
              },
              post: function(scope, element) {
                linkings.push('second-post');
              }
            }
          };
        }
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div first-directive second-directive></div>');
        $compile(el)($rootScope);
        expect(linkings).toEqual([
          'first-pre',
          'second-pre',
          'second-post',
          'first-post'
        ]);
      });
    });

    it('stabilized node list during linking', function() {
      var givenElements = [];
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          link: function(scope, element, attrs) {
            givenElements.push(element[0]);
            element.after('<div></div>');
          }
        };
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div><div my-directive></div><div my-directive></div></div>');
        var el1 = el[0].childNodes[0], el2 = el[0].childNodes[1];
        $compile(el)($rootScope);
        expect(givenElements.length).toBe(2);
        expect(givenElements[0]).toBe(el1);
        expect(givenElements[1]).toBe(el2);
      });
    });

    it('makes new scope for element when directive asks for it', function(){
      var givenScope;
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          scope: true,
          link: function(scope) {
            givenScope = scope;
          }
        };
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        expect(givenScope.$parent).toBe($rootScope);
      });
    });

    it('given inherited scope to all directives on element', function(){
      var givenScope;
      var injector = makeInjectorWithDirectives({
        myDirective: function(){
          return {
            scope: true
          };
        },
        myOtherDirective: function() {
          return {
            link: function(scope) {
              givenScope = scope;
            }
          };
        }
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $("<div my-directive my-other-directive></div>");
        $compile(el)($rootScope);
        expect(givenScope.$parent).toBe($rootScope);
      });
    });

    it('adds scope class and data for element with new scope', function(){
      var givenScope;
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          scope: true,
          link: function(scope) {
            givenScope = scope;
          }
        };
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        expect(el.hasClass('ng-scope')).toBe(true);
        expect(el.data('$scope')).toBe(givenScope);
      });
    });

    xit('creates an isolate scope when requested', function(){
      var givenScope;
      var injector = makeInjectorWithDirectives('myDirective', function(){
        return {
          scope: {},
          link: function(scope) {
            givenScope = scope;
          }
        };
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        expect(givenScope.$parent).toBe($rootScope);
        expect(Object.getPrototypeOf(givenScope)).not.toBe($rootScope);
      });
    });

    xit('does not share isolate scope with other directives', function(){
      var givenScope;
      var injector = makeInjectorWithDirectives({
        myDirective: function(){
          return {
            scope: {}
          };
        },
        myOtherDirective: function() {
          return {
            link: function(scope) {
              givenScope = scope;
            }
          };
        }
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        expect(givenScope).toBe($rootScope);
      });
    });

    xit('does not use isolate scope on child elements', function(){
      var givenScope;
      var injector = makeInjectorWithDirectives({
        myDirective: function() {
          return {
            scope: {}
          };
        },
        myOtherDirective: function() {
          return {
            link: function(scope) {
              givenScope = scope;
            }
          };
        }
      });

      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive><div my-other-directive></div></div>');
        $compile(el)($rootScope);
        expect(givenScope).toBe($rootScope);
      });
    });
  });
});
