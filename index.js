// ./index.js


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
	name: "gastruck",		// logger name
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

server.use(bodyParser.json({ type: 'application/vnd.api+json' }));
server.use(bodyParser.urlencoded({ extended: true }));
server.use(function (req, res, next) {
	log.info({req:req}, req.method);
	next();
});

// Routes ======================================================================

// main request
server.get( '/', function(req, res){
	res.send("Wellcome to gastruck API!");
});

//require('./routes/posts.routes')(server, express, log);


// Start app ===================================================================

// startup our app at http://localhost:port
server.listen(port);

// shoutout to the user
log.info('Magic happens on port ' + port);

// expose server
exports = module.exports = server;
