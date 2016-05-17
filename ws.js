'use strict';
//var tessel = require('tessel');
var ambient, tessel;
var ws = require('nodejs-websocket');
var port = 3001;
//var ambientlib = require('ambient-attx4');
//var ambient = ambientlib.use(tessel.port.B);
//var climateLib = require('climate-si7005');
//var climate = climateLib.use(tessel.port.A);
//var wifi = require('wifi-cc3000');
var config = require('./config');
var interval = config.interval;
var plopId = config.plopId;
var plopHeader = config.plopHeader;
var tempId = config.tempId;
var tempHeader = config.tempHeader;
var alreadyTrying = false;
// Change this to "true" to display more verbose output.
var debug = true;
var logger = require('./src/logger')(debug);
var Queue = require('./src/queue');

config.errorCallback = function() {
  console.log('error callback');
};
var connection = false;
config.plopCallback = function(err, data) {
  console.log('plop callback', data)
  if (connection === false) {
    console.log('connectin is false')
    return;
  }
  if (connection && connection.readyState == connection.OPEN) {
    console.log('sending data', data);
    connection.sendText(data + '');
  }
  else {
    console.log('problem here');
  }
}
var processQueue = new Queue(config);

function tryToWs() {
  if (connection === false) {
    connection = undefined;
    connection = ws.connect('ws://' + config.wsHost + ':' + port, function(e) {
      console.log('Conenct, e obj is')
      console.log(e)
    });
    connection.on('error', function() {
      setTimeout(tryToWs, 3000);
      connection = false;
    })
  }
  else {
    console.log('Trying to ws when ws is false');
  }
}
tryToWs();

function sendData(val, path, header) {
  processQueue.append({
    val: val,
    path: path,
    header: header
  });
}

logger('Starting timers');
var tp = require('./tessel-plops-logger')(ambient, {
  interval: interval,
  debug: debug,
  plopCallback: config.plopCallback,
  maxLevel: 0.42,
  level: 0.02,
  ledNumber: 1
}, tessel);
// var ttl = require('tessel-temp-logger')(climate, {
//   interval: interval,
//   debug: debug
// });
// ttl.start(function(err, d) {
//   if (err) {
//     logger('Error from climate. Will restart board', err);
//     config.errorCallback();
//     return;
//   }
//   logger('Data from climate:', d);
//   sendData(d, tempId, tempHeader);
// });
tp.start(function(err, d) {
  if (err) {
    logger('Error from ambient. Will restart board', err);
    config.errorCallback();
    return;
  }
  logger('Data from ambient:', d);
  sendData(d, plopId, plopHeader);
});
processQueue.start();
