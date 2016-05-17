'use strict';

function logger(debug) {
  return function() {
    if (!debug) {
      return;
    }
    var args = Array.prototype.slice.call(arguments);
    args.unshift(new Date().toString());
    console.log.apply(console, args);
  }
}

module.exports = logger;
