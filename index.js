'use strict';

var thunky        = require('thunky');
var amqplib       = require('amqplib/callback_api');
var sliced        = require('sliced');
var util          = require('util');
var domain        = require('domain');
var EventEmitter  = require('events').EventEmitter;
var url           = require('url');
var types         = require('core-util-is');

function amqpURI(conf) {
  if (types.isString(conf)) {
    // valid AMQP URL
    var valURI = url.parse(conf);

    if (!valURI.protocol ||
      !valURI.hostname ||
      !valURI.port) {
      return new Error('Invalid AMQP URI!');
    } else {
      return conf;
    }
  } else {
    conf = conf || {};
    var auth = '';

    if (conf.user && conf.password) {
      auth = util.format('%s:%s@', conf.user, conf.password);
    }

    return util.format('%s://%s%s:%d%s',
      conf.ssl ? 'amqps' : 'amqp',
      auth,
      conf.host || 'localhost',
      conf.port || (conf.ssl ? 5671 : 5672),
      conf.vhost || '');
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
  // using domains to control
  // connection exceptions
  this._dom = domain.create();

  var self = this;

  //
  // single error handler in a single place
  //
  self._dom.on('error', function(err) {
    process.nextTick(function() {
      self.emit('error', err);
    });
  });

  self._get = thunky(function(cb) {
    function connectCb(conn) {
      self._dom.add(conn);
      return cb(null, conn);
    }

    uri = amqpURI(uri);

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
    conn.close(process.nextTick(function() {
      self._dom.exit();
      self._dom.dispose();
      self.emit('close');
    }));
  });
  return self;
};
