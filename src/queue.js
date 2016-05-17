'use strict';
var http = require('http');
var url = require('url');
var debug = true;
var logger = require('./logger')(debug);

function Queue(config) {
  this.inProgress = false;
  this.config = config;
  this.queue = [];
  this.errorCallback = function() {
    logger('Queue error callback');
  };
  if (config.errorCallback) {
    this.errorCallback = config.errorCallback;
  }
}

Queue.prototype.start = function() {
  var q = this;
  logger('Starting queue');
  this.timer = setTimeout(q.processQueue.bind(q), 1000);
};

Queue.prototype.append = function(obj) {
  this.queue.push(obj);
};

Queue.prototype.processQueue = function() {
  var q = this;
  if (!this.inProgress && this.queue.length) {
    var row = this.queue.splice(0, 1);
    this.processRow(row);
  }
  setTimeout(q.processQueue.bind(q), 1000);
};

Queue.prototype.processRow = function(row) {
  var queue = this;
  if (!row.length) {
    logger('Have no elements in this row. Aborting.');
    return;
  }
  this.inProgress = true;
  var data = row[0];
  var path = data.path;
  logger('Sending data,', data.val, 'to ', path);
  var opts = url.parse(this.config.url + path);
  opts.method = 'POST';
  var ended = false;
  var req = http.request(opts, function(res) {
    logger('STATUS: ' + res.statusCode + ' (path ' + path + ')');
    res.setEncoding('utf8');
    res.on('err', function(e) {
      logger('Error on res: ' + e);
      // Put item back in queue.
      queue.append(data);
    });
    res.on('data', function(c) {
      logger('Path ' + path + ' has data');
    });
    res.on('abort', function() {
      console.log('aborr');
    });
    res.on('close', function() {
      logger('Request closed for path ' + path);
      ended = true;
      queue.inProgress = false;
    });
    res.on('end', function() {
      logger('Request ended for path ' + path);
      ended = true;
      queue.inProgress = false;
      if (res.statusCode !== 201) {
        logger('Request ended with an unfortunate status code. Putting row back in queue.');
        queue.append(data);
      }
    });
  });
  setTimeout(function() {
    if (!ended) {
      logger('Timing out request. Will abort. Path is ' + path);
      queue.inProgress = false;
      req.abort();
    }
  }, 15000);
  req.on('error', function(e) {
    logger('Problem with request on path ', path, e.message);
    ended = true;
    queue.inProgress = false;
    queue.append(data);
    queue.errorCallback();
    req.abort();
  });
  req.on('abort', function() {
    logger('Request aborted');
  });
  req.setHeader('x-sheeet', data.header);
  req.setHeader('Content-type', 'application/json');
  req.write(JSON.stringify({value: data.val}));
  req.end();
};

module.exports = Queue;
