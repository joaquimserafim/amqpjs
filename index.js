'use strict';

var thunky        = require('thunky');
var amqplib       = require('amqplib/callback_api');
var sliced        = require('sliced');
var util          = require('util');
var domain        = require('domain');
var EventEmitter  = require('events').EventEmitter;
var url           = require('url');
var types         = require('core-util-is');
var amqpUri       = require('amqp-uri');

function checkUri(conf) {
  if (types.isString(conf)) {
    // valid if is an AMQP URI
    var valURI = url.parse(conf);

    if (!valURI.protocol ||
      !valURI.hostname ||
      !valURI.port) {
      return new Error('Invalid AMQP URI!');
    } else {
      return conf;
    }
  } else {
    return amqpUri(conf || {});
  }
}

//
// AMQPJS
//

module.exports = AMQPJS;

function AMQPJS(uri, socketOptions) {
  if (!(this instanceof AMQPJS)) {
    return new AMQPJS(uri, socketOptions);
  }
  EventEmitter.call(this);
  AMQPJS.init.call(this, uri, socketOptions);
}

util.inherits(AMQPJS, EventEmitter);

AMQPJS.init = function init(uri, socketOptions) {
  var self = this;
  // using domains to control
  // connection exceptions
  self._dom = domain.create();

  //
  // error handler
  //
  self._dom.on('error', function(err) {
    process.nextTick(function() {
      self.emit('error', err);
    });
  });

  self._get = thunky(function(cb) {
    function connectCb(conn) {
      self._dom.add(conn);
      cb(null, conn);
    }

    uri = checkUri(uri);

    if (types.isError(uri)) {
      self.emit('error', uri);
    } else {
      amqplib.connect(uri, socketOptions, self._dom.intercept(connectCb));
    }
  });
};

AMQPJS.prototype.createChannel = function createChannel() {
  var args = sliced(arguments);

  this._get(function(err, conn) {
    conn.createChannel.apply(conn, args);
  });

  return this;
};

AMQPJS.prototype.close = function close() {
  var self = this;

  self._get(function(err, conn) {
    conn.close(function() {
      self._dom.exit();
      self._dom.dispose();
      self.emit('close');
    });
  });

  return self;
};
