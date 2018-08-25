var setupModuleLoader = function(window) {
  var ensure = function(obj, name, factory) {
    if (!obj[name]) {
      obj[name] = factory();
    }
    return obj[name];
  }

  var angular = ensure(window, 'angular', Object);

  ensure(angular, 'module', function(){
    var modules = {};
    return function(name, requires) {
      if (requires) {
        return createModule(name, requires, modules);
      } else {
        return getModule(name, modules);
      }
    };
  });

  function createModule(name, requires, modules) {
    if (name === 'hasOwnProperty') {
      throw 'cannot be hasOwnProperty name';
    }

    var invokeQueue = [];

    var invokeLater = function(method, arrayMethod) {
      return function() {
        invokeQueue[arrayMethod || 'push']([method, arguments]);
        return moduleInstance;
      }
    }

    var moduleInstance = {
      name: name,
      requires: requires,
      constant: invokeLater('constant', 'unshift'),
      _invokeQueue: invokeQueue,
      provider: invokeLater('provider')
    };

    modules[name] = moduleInstance;

    return moduleInstance;
  }

  function getModule(name, modules) {
    if (!modules.hasOwnProperty(name)) {
      throw 'No such module';
    }
    return modules[name];
  }
};

module.exports = setupModuleLoader;
