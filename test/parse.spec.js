'use strict';

var parse = require('../src/parse');

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
})
