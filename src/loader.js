function setupModuleLoader(window){
  var ensure = function(obj, name, factory) {
    if (!obj[name]) {
      obj[name] = factory();
    }
    return obj[name];
  }
  var angular = ensure(window, 'angular', Object);

  var module = ensure(angular, 'module', function(){
    var modules = {};
    return function(name, requires){
      if (!requires) {
        return getModule(name, modules);
      } else {
        return createModule(name, requires, modules);
      }
    };
  });

  function createModule(name, requires, modules) {
    if (name === 'hasOwnProperty') {
      throw 'name cannot be hasOwnProperty';
    }

    var moduleInstance = {
      name: name,
      requires: requires
    }

    modules[name] = moduleInstance;

    return moduleInstance;
  }

  function getModule(name, modules) {
    if (modules.hasOwnProperty(name)) {
      return modules[name];
    } else {
      throw 'module dont exist';
    }
  }

}

module.exports = setupModuleLoader;
