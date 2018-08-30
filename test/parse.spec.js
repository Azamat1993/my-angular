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
})
