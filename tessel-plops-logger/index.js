'use strict';
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var sp = new SerialPort('/dev/ttyACM0', {
  baudrate: 9600,
  parser: serialport.parsers.readline("\n")
});

function PlopsLogger(ambient, opts, tessel) {
  var self = this;
  self.ambient = ambient;
  self.level = opts.level || 0.017;
  self.maxLevel = opts.maxLevel || 0.023;
  self.debug = true;
  self.interval = opts.interval || 60;
  var ledNumber = opts.ledNumber || 1;
  self.log('Created new plop logger with options ', opts);
  //self.led1 = tessel.led[ledNumber];
  self.id = (Math.random() + '').substring(2);
  self.log('Starting plop logger with id', self.id);
  self.plopCallback = opts.plopCallback || function () {};
}

PlopsLogger.prototype.start = function(callback) {
  var self = this;
  var plops = 0;
  sp.on('open', function () {
    //self.ambient.setSoundTrigger(self.level);
    self.log('Serialport opened');

    sp.on('data', function(data) {
      data = data / 600;
      plops++;
      self.log('Sound triggered with level ' + data);
      self.plopCallback(null, data);
      // //self.ambient.clearSoundTrigger();
      // if (data > self.maxLevel) {
      //   setTimeout(function () {
      //     //self.ambient.setSoundTrigger(self.level);
      //   }, 400);
      //   return;
      // }
      // else {
      //   plops++;
      //   //self.led1.write(true);
      // }
      //
      // setTimeout(function () {
      //
      //   self.ambient.setSoundTrigger(self.level);
      //   self.led1.write(false);
      //
      // }, 400);
    });
  });
  sp.on('error', function(e) {
    if (self.stopped) {
      return;
    }
    self.stopped = true;
    self.log('Had an error with ambient:', e);
    self.callback(e);
  });
  self.callback = callback;
  var repeatFunction = function() {
    if (self.stopped) {
      return;
    }

    self.log('Sending callback for id', self.id);
    if (self.callback) {
      self.callback(null, plops);
    }
    plops = 0;
    self._repeater = setTimeout(repeatFunction, self.interval * 1000);
  };
  self._repeater = setTimeout(repeatFunction, self.interval * 1000);

};

PlopsLogger.prototype.stop = function() {
  this.stopped = true;
  clearTimeout(this._repeater);
  this.ambient.clearSoundTrigger();
  this.log('Interval check stopped and sound trigger cleared.');
};

PlopsLogger.prototype.log = function() {
  if (this.debug) {
    console.log.apply(console, arguments);
  }
};

module.exports = function(lib, opts, tessel) {
  // These parameters are really required.
  if (!lib || !opts || !tessel) {
    //throw new Error('Please provide all options required (lib and opts)');
  }
  var ambient = lib;
  return new PlopsLogger(ambient, opts, tessel);
};
