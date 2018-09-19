var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('q', function(){
  var $q;

  beforeEach(function(){
    publishExternalAPI();
    $q = createInjector(['ng']).get('$q');
  });

  it('can create a deferred', function(){
    var d = $q.defer();
    expect(d).toBeDefined();
  });

  it('has a promise for each Deferred', function(){
    var d = $q.defer();
    expect(d.promise).toBeDefined();
  });

  it('can resolve a promise', function(done) {
    var deferred = $q.defer();
    var promise = deferred.promise;

    var promiseSpy = jasmine.createSpy();

    promise.then(promiseSpy);

    deferred.resolve('a-ok');

    setTimeout(function(){
      expect(promiseSpy).toHaveBeenCalledWith('a-ok');
      done();
    }, 1)
  });

  it('works when resolved before promise listener', function(){
    var d = $q.defer();
    d.resolve(42);

    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);

    setTimeout(function(){
      expect(promiseSpy).toHaveBeenCalledWith(42);
      done();
    }, 0);
  });

  it('does not resolve promise immediately', function(){
    var d = $q.defer();

    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);

    d.resolve(42);

    expect(promiseSpy).not.toHaveBeenCalled();
  });
});
