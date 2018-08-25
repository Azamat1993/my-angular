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
    var configBlocks = [];

    var invokeLater = function(service, method, arrayMethod, queue) {
      return function() {
        queue = queue || invokeQueue;
        var item = [service, method, arguments];
        queue[arrayMethod || 'push'](item);
        return moduleInstance;
      }
    }

    var moduleInstance = {
      name: name,
      requires: requires,
      constant: invokeLater('$provide', 'constant', 'unshift'),
      _invokeQueue: invokeQueue,
      provider: invokeLater('$provide', 'provider'),
      config: invokeLater('$injector', 'invoke', 'push', configBlocks),
      _configBlocks: configBlocks
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
