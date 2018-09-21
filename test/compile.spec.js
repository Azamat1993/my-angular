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
});
