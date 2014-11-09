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

AMQPJS.init = function init(uri, socketOptions) {
  // using domains to control
  // connection exceptions
  var dom = domain.create();

  var self = this;

  //
  // single error handler in a single place
  //
  dom.on('error', function(err) {
    process.nextTick(function() {
      self.emit('error', err);
    });
  });

  self._get = thunky(function(cb) {
    function connectCb(conn) {
      dom.add(conn);
      return cb(null, conn);
    }

    uri = amqpURI(uri);

    if (types.isError(uri)) {
      self.emit('error', uri);
    } else {
      amqplib.connect(uri, socketOptions, dom.intercept(connectCb));
    }
  });
};

util.inherits(AMQPJS, EventEmitter);

AMQPJS.prototype._apply = function _apply(fn, args) {
  // err - remember the `domain.intercept` in the connection
  this._get(function(err, conn) {
    conn[fn].apply(conn, args);
  });

  return this;
};

AMQPJS.prototype.createChannel = function createChannel() {
  var args = sliced(arguments);
  return this._apply('createChannel', args);
};

AMQPJS.prototype.close = function close() {
  var args = sliced(arguments);
  var self = this;
  process.nextTick(function() {
    self._apply('close', args);
  });
};
