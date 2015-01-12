'use strict';

var tape    = require('tape');
var amqpjs  = require('../index');

test('testing with a producer & consumer', function(assert) {
  var uri = 'amqp://guest:guest@localhost:5672';

  var producer = amqpjs(uri);
  var consumer = amqpjs(uri);

  var DONE;

  assert.ok(producer);
  assert.ok(consumer);

  var messages = [
    '1234567890',
    'wow',
    '{"cats": "peter"}',
    'Lorem ipsum dolor sit amet, consectetur adipisicing elit, ' +
    'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' +
    ' Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris' +
    ' nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in ' +
    'reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla ' +
    'pariatur. Excepteur sint occaecat cupidatat non proident, sunt in ' +
    'culpa qui officia deserunt mollit anim id est laborum'
  ];

  function onError(err) {
    assert.pass('Error: ' + err.message);
  }

  function onClose() {
    assert.pass('closing connection');
  }

  function infoChannelClosed() {
    assert.pass('channel is closed');
  }

  var routingKeys = ['cats'];

  var exchange = {
    name: 'test',
    type: 'direct',
    options: {}
  };

  producer.on('error', onError);
  producer.on('close', onClose);

  consumer.on('error', onError);
  consumer.on('close', onClose);

  //
  //  PRODUCER
  //
  producer.createChannel(function(err, channel) {
    assert.deepEqual(err, null);
    assert.ok(channel, 'producer');

    var producerOptions = {
      persistent: true
    };

    channel.on('close', infoChannelClosed);
    channel.on('error', onError);

    function tearDown() {
      DONE = true;
      channel.close(function(err) {
        assert.deepEqual(err, null);
        assert.pass('closing `producer` channel');
        producer.close();
      });
    }

    function assertExchangeCb(err) {
      if (err) {
        onError(err);
      } else {
        setTimeout(function() {
          messages.forEach(function(msg) {
            assert.pass('TX: ' + msg);
            channel.publish(exchange.name,
              routingKeys[0],
              new Buffer(msg),
              producerOptions);
          });
          tearDown();
        }, 1000);
      }
    }

    channel.assertExchange(exchange.name,
      exchange.type,
      exchange.options,
      assertExchangeCb);
  });

  //
  //  CONSUMER
  //
  consumer.createChannel(function(err, channel) {
    assert.deepEqual(err, null);
    assert.ok(channel, 'consumer');

    var queueId;

    var consumerOptions = {
      noAck: false,
      exclusive: false
    };

    var queueOptions = {
      autoDelete: true
    };

    var routingKey;

    channel.on('close', infoChannelClosed);
    channel.on('error', onError);

    channel.assertExchange(exchange.name,
      exchange.type,
      exchange.options);

    function sub(err) {
      if (err) {
        onError(err);
      } else if (!routingKey) {
        routingKey = routingKeys[0];
        assert.pass('bindQueue' + routingKey);
        channel.bindQueue(queueId, exchange.name, routingKey, {}, sub);
      }
    }

    function consumeCb(err) {
      if (err) {
        onError(err);
      } else {
        sub();
      }
    }

    function rx(msg) {
      assert.ok(msg);
      assert.ok(msg.content);
      assert.pass('RX: ' + msg.content.toString());
      channel.ack(msg);
    }

    function tearDown() {
      setTimeout(function() {
        if (DONE) {
          channel.close(function(err) {
            assert.deepEqual(err, null);
            assert.pass('closing `consumer` channel');
            consumer.close();
            assert.end();
          });
        } else {
          tearDown();
        }
      }, 500);
    }

    function assertQueueCb(_err, res) {
      if (_err) {
        onError(_err);
      } else {
        queueId = res.queue;
        tearDown();
        channel.consume(queueId, rx, consumerOptions, consumeCb);
      }
    }

    channel.assertQueue('', queueOptions, assertQueueCb);
  });
});
