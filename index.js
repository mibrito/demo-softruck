// ./index.js

var _ = require('lodash');
var cors = require('cors');	// cross doamin requests
var bunyan = require('bunyan');	// logger

var express	= require('express');
var bodyParser	= require('body-parser');

var mongoose = require('mongoose');


// Setups ======================================================================

db = require('./lib/db');		// always call before use models ()
db.connect();

// set our port
var port	= process.env.PORT || 3000;
var server = express();

// logger
var log = bunyan.createLogger({
	name: 'gastruck',		// logger name
	serializers: {
		req: bunyan.stdSerializers.req,		// standard bunyan req serializer
		err: bunyan.stdSerializers.err		// standard bunyan error serializer
	},
	streams: [
		{
		level: 'info',		// loging level
		stream: process.stdout		// log INFO and above to stdout
		}
	]
});


// Apply middlewares ===========================================================
server.use(cors());
server.use(bodyParser.json({ type: 'application/vnd.api+json' }));
server.use(bodyParser.urlencoded({ extended: true }));
server.use(function (req, res, next) {
	log.info({req:req}, req.method);
	next();
});

// Routes ======================================================================

// APPLY ROUTES ================================================================

// index
server.use(require('./routes/index'));

// states
server.use('/states', require('./routes/states'));

// cities
server.use('/cities', require('./routes/cities'));

// cities
server.use('/stations', require('./routes/stations'));

server.get( '/stations', function(req, res){
	return db.models.Stations.find({})
		.then(function(stations){	
			return res.json(stations);
		});
});

server.get( '/prices', function(req, res){
	return db.models.Prices.find({})
		.then(function(prices){	
			return res.json(prices);
		});
});

//require('./routes/posts.routes')(server, express, log);


// Start app ===================================================================

// startup our app at http://localhost:port
server.listen(port);

// shoutout to the user
log.info('Magic happens on port ' + port);

// expose server
exports = module.exports = server;
