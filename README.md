## amqpjs

**wraps the connection object from the `amqplib` module to a simple way to be used**

<a href="https://nodei.co/npm/amqpjs/"><img src="https://nodei.co/npm/amqpjs.png?downloads=true"></a>


* **code coverage:** 	
`npm test && npm run coverage`

* **codestyle:** 	
`npm run codestyle`

* **jshint:** 	
`npm run jshint`

*attention:* `amqp://guest:guest@localhost:5672/test` this should be the amqp URI to run the tests

####App

	amqpjs([uri], [socketOptions])
	
**uri:** can be a string `amqp://guest:guest@localhost:5672/test` or an object 
`{vhost: vhost, port: 5672, user: 'guest', password: 'guest', ssl: false}`

**socketOptions:** an object `{channelMax: 100, heartbeat: 300, noDelay: true}`
see [here](http://www.squaremobius.net/amqp.node/doc/channel_api.html) for more information (search by socket options :-) )

**event to handle the connection issues**

	on('error', function(err) {...})
	
**create a channel** `This channel is a "virtual" connection inside the "real" TCP connection, and it is over the channel that you issue AMQP commands.`

	createChannel([channelOptions], function(err, channel) {...})
	
**close the connection** 
	
	close([function() {...}])


####Example

	var amqpjs  = require('amqpjs');
	
	var client = amqpjs([uri], [socketOptions]);
	
	//
	// with this event you can capture
	// connections failures
	//
	client.on('error', function(err) {...});
	
	//
	// can create several channels
	//
	client.createChannel([channelOptions], function(err, channel) {...});
	
	client.createChannel([channelOptions], function(err, channel) {
		// err
		// do something with channel
		channel...
		// close this channel
		channel.close();
	});
	

you can check a better example of a producer & a consumer in [here](https://github.com/joaquimserafim/amqpjs/blob/master/test/queue.js).


for full understanding you can follow the `amqplib` documentation [here](http://www.squaremobius.net/amqp.node/doc/channel_api.html).