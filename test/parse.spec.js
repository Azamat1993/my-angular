
var parse = require('../src/parse');
var _ = require('lodash');

describe('parse', function(){
  it('can parse an integer', function(){
    var fn = parse('42');
    expect(fn).toBeDefined();
    expect(fn()).toBe(42);
  });

  it('can parse a string in single quotes', function(){
    var fn = parse("'abc'");
    expect(fn()).toEqual('abc');
  });

  it('can parse a string in double quotes', function(){
    var fn = parse('"abc"');

    expect(fn()).toEqual('abc');
  });

  it('will not parse a string with mismatching quotes', function(){
    expect(function() { parse('"abc\'')}).toThrow();
  });

  it('will parse null', function(){
    var fn = parse('null');
    expect(fn()).toBe(null);
  });

  it('will parse true', function(){
    var fn = parse('true');
    expect(fn()).toBe(true);
  });

  it('will parse false', function(){
    var fn = parse('false');
    expect(fn()).toBe(false);
  });

  it('ignores whitespace', function(){
    var fn = parse(' \n42 ');
    expect(fn()).toEqual(42);
  });

  it('will parse an empty array', function(){
    var fn = parse('[]');
    expect(fn()).toEqual([]);
  });

  it('will parse a non-empty array', function(){
    var fn = parse('[1, "two", [3], true]');
    expect(fn()).toEqual([1, 'two', [3], true]);
  });

  it('will parse an array with trailing commas', function(){
    var fn = parse('[1,2,3,]');
    expect(fn()).toEqual([1,2,3]);
  });

  it('will parse an empty object', function(){
    var fn = parse('{}');
    expect(fn()).toEqual({});
  });

  it('will parse a non-empty object', function(){
    var fn = parse('{"a key": 1, \'another-key\': 2}');
    expect(fn()).toEqual({'a key': 1, 'another-key': 2});
  });

  it('will parse an object with identifier keys', function(){
    var fn = parse('{a: 1, b: [2,3], c: {d: 4}}');
    expect(fn()).toEqual({a:1, b:[2,3], c:{d:4}});
  });

  it('looks up an attribute from the scope', function(){
    var fn = parse('aKey');
    expect(fn({aKey: 42})).toBe(42);
    expect(fn({})).toBeUndefined();
  });

  it('returns undefined when looking up attribute from undefined', function(){
    var fn = parse('aKey');
    expect(fn()).toBeUndefined();
  });

  it('will parse this', function(){
    var fn = parse('this');
    var scope = {};
    expect(fn(scope)).toBe(scope);
    expect(fn()).toBeUndefined();
  });

  it('looks up a 2-part identifier path from the scope', function(){
    var fn = parse('aKey.anotherKey');
    expect(fn({aKey: {anotherKey: 42}})).toBe(42);
    expect(fn({aKey:{}})).toBeUndefined();
    expect(fn({})).toBeUndefined();
  });

  it('looks up a member from an object', function(){
    var fn = parse('{aKey:42}.aKey');
    expect(fn()).toBe(42);
  });

  it('looks up a 4-part identifier path from the scope', function(){
    var fn = parse('aKey.secondKey.thirdKey.fourthKey');
    expect(fn({aKey: {secondKey: {thirdKey: {fourthKey: 42}}}})).toBe(42);
    expect(fn({aKey: {secondKey: {thirdKey: {}}}})).toBeUndefined();
    expect(fn({aKey: {}})).toBeUndefined();
    expect(fn()).toBeUndefined();
  });

  it('uses locals instead of scope when there is a matching key', function(){
    var fn = parse('aKey');
    var scope = {aKey: 42};
    var locals = {aKey: 43};
    expect(fn(scope, locals)).toBe(43);
  });

  it('does not use locals instead of scope when no matching key', function(){
    var fn = parse('aKey');
    var scope = {aKey: 42};
    var locals = {otherKey: 43};
    expect(fn(scope, locals)).toBe(42);
  });

  it('uses locals instead of scope when the first part matches', function(){
    var fn = parse('aKey.anotherKey');
    var scope = {aKey: {anotherKey: 42}};
    var locals = {aKey: {}};
    expect(fn(scope, locals)).toBeUndefined();
  });

  it('parses a simple computed property access', function(){
    var fn = parse('aKey["anotherKey"]');
    expect(fn({aKey: {anotherKey: 42}})).toBe(42);
  })

  it('parses a computed numeric array access', function(){
    var fn = parse('anArray[1]');
    expect(fn({anArray: [1,2,3]})).toBe(2);
  });

  it('parses a computed access with another key as property', function(){
    var fn = parse('lock[key]');
    expect(fn({key: 'theKey', lock: {theKey: 42}})).toBe(42);
  });

  it('parses a function call', function(){
    var fn = parse('aFunction()');
    expect(fn({aFunction: function() {return 42}})).toBe(42);
  });

  it('parses a function call with a single number argument', function(){
    var fn = parse('aFunction(42)');
    expect(fn({aFunction: function(n){ return n}})).toBe(42);
  });

  it('parses a function call with a single identifier argument', function(){
    var fn = parse('aFunction(n)');
    expect(fn({n: 42, aFunction: function(arg) { return arg}})).toBe(42);
  });

  it('parses a function call with a single function call argument', function(){
    var fn = parse('aFunction(argFn())');

    expect(fn({
      argFn: _.constant(42),
      aFunction: function(arg) { return arg;}
    })).toBe(42);
  });

  it('parses a function call with multiple arguments', function(){
    var fn = parse('aFunction(37, n, argFn())');

    expect(fn({
      n: 3,
      argFn: _.constant(2),
      aFunction: function(a1, a2, a3) { return a1+a2+a3;}
    })).toBe(42);
  });

  it('calls methods accessed as computed properties', function(){
    var scope = {
      anObject: {
        aMember: 42,
        aFunction: function() {
          return this.aMember;
        }
      }
    }
    var fn = parse('anObject["aFunction"]()');
    expect(fn(scope)).toBe(42);
  });

  it('calls methods access as non-computed properties', function(){
    var scope = {
      anObject: {
        aMember: 42,
        aFunction: function() {
          return this.aMember;
        }
      }
    }
    var fn = parse('anObject.aFunction()');
    expect(fn(scope)).toBe(42);
  });

  it('binds bare functions to the scope', function(){
    var scope = {
      aFunction: function() {
        return this;
      }
    };

    var fn = parse('aFunction()');
    expect(fn(scope)).toBe(scope);
  });

  it('binds bare functions on locals to the locals', function(){
    var scope = {};
    var locals = {
      aFunction: function(){
        return this;
      }
    };

    var fn = parse('aFunction()');
    expect(fn(scope, locals)).toBe(locals);
  });
});
