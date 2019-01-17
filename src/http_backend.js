'use strict';

function $HttpBackendProvider() {
  this.$get = function() {
    return function(method, url, post) {
      var xhr = new window.XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.send(post || null);  
    }
  }
}

module.exports = $HttpBackendProvider;
