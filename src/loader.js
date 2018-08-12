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

    var moduleInstance = {
      name: name,
      requires: requires,
      constant: function(key, value) {
        invokeQueue.push(['constant', [key, value]]);
      },
      _invokeQueue: invokeQueue
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
