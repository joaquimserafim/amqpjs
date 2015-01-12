'use strict';

var tape    = require('tape');
var amqpjs  = require('../index');
var fs      = require('fs');

var client;
var vhost = '';
var sslFiles = '/vagrant/fixtures/';

tape('a normal connection', function(assert) {
  client = new amqpjs({vhost: vhost, channelMax: 1});
  assert.ok(client);
  client.createChannel(function(err, channel) {
    assert.deepEqual(err, null);
    assert.deepEqual(typeof channel, 'object');
    assert.deepEqual(channel.ch, 1);
    client.close();
    assert.end();
  });
});

tape('a ssl connection', function(assert) {
  var opts = {
    cert      : fs.readFileSync(sslFiles + 'cert.pem'),
    key       : fs.readFileSync(sslFiles + 'key.pem'),
    passphrase: 'MySecretPassword',
    ca        : [
      fs.readFileSync(sslFiles + 'cacert.pem')
    ]
  };
  client = new amqpjs({
    ssl     : true,
    host    : 'vm'
    }, opts);
  assert.ok(client);
  client.createChannel(function(err, channel) {
    assert.deepEqual(err, null);
    assert.deepEqual(typeof channel, 'object');
    assert.deepEqual(channel.ch, 1);
    client.close();
    assert.end();
  });
});

tape('a bad host soon a bad ssl connection', function(assert) {
  var opts = {
    cert      : fs.readFileSync(sslFiles + 'cert.pem'),
    key       : fs.readFileSync(sslFiles + 'key.pem'),
    passphrase: 'MySecretPassword',
    ca        : [
      fs.readFileSync(sslFiles + 'cacert.pem')
    ]
  };
  client = new amqpjs({
    ssl     : true,
    host    : 'bad_host'
    }, opts);
  assert.ok(client);
  client.on('error', function(err) {
    assert.ok(/getaddrinfo/.test(err.message));
    assert.end();
  });
  client.createChannel();
});

tape('pass some configurations to the connection', function(assert) {
  client = new amqpjs({
    vhost   : vhost,
    port    : 5672,
    user    : 'guest',
    password: 'guest',
    ssl     : false
  });
  assert.ok(client);
  client.createChannel(function(err, channel) {
    assert.deepEqual(err, null);
    assert.deepEqual(typeof channel, 'object');
    assert.deepEqual(channel.ch, 1);
    channel.close(function() {
      assert.pass('channel closed');
      client.close();
      assert.end();
    });
  });
});

tape('pass some a bad configuration to the connection', function(assert) {
  client = amqpjs('wow');
  client.on('error', function(err) {
    assert.equal(err.message, 'Invalid AMQP URI!');
    assert.end();
  });
  client.createChannel();
});

tape('bad connection string should emit an amqpjs.error', function(assert) {
  client = amqpjs({port: 3333});
  client.on('error', function(err) {
    assert.equal(err.message, 'connect ECONNREFUSED');
    assert.end();
  });
  client.createChannel();
});

tape('close a connection before to call `createChannel`',
function(assert) {
  client = amqpjs();
  client.on('close', assert.end);
  client.close();
  client.createChannel(function(err) {
    assert.equal(err.message, 'Channel ended, no reply will be forthcoming');
  });
});

//
// this last test you must restart your rabbitmq server
// trying to find a better approach for this test
//
tape('connection closed unexpectedly then should emit an amqpjs.error',
function(assert) {
  client = amqpjs('amqp://guest:guest@localhost:5672');
  client.on('error', function(err) {
    assert.ok(err.message);
    assert.end();
  });
  client.createChannel(function(err, channel) {
    assert.deepEqual(err, null);
    assert.deepEqual(typeof channel, 'object');
    assert.deepEqual(channel.ch, 1);
  });
});
