'use strict';

var sinon = require('sinon');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

fdescribe('$http', function(){
  var $http;
  var xhr, requests;

  beforeEach(function(){
    publishExternalAPI();
    var injector = createInjector(['ng']);
    $http = injector.get('$http');
  });

  beforeEach(function(){
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = function(req) {
      requests.push(req);
    }
  });

  afterEach(function(){
    xhr.restore();
  });

  it('is a function', function(){
    expect($http instanceof Function).toBe(true);
  });

  it('returns a Promise', function(){
    var result = $http({});

    expect(result).toBeDefined();
    expect(result.then).toBeDefined();
  });

  it('makes an XMLHttpRequest to given URL', function(){
    $http({
      method: 'POST',
      url: 'http://teropa.info',
      data: 'hello'
    });

    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe('POST');
    expect(requests[0].url).toBe('http://teropa.info');
    expect(requests[0].async).toBe(true);
    expect(requests[0].requestBody).toBe('hello');
  })
});
