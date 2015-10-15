/*
 * File with the encapsulation of mongoose, its model and some of its functions
 * to simplificate usage
 */
var mongoose = require('mongoose');
var debug = require('debug')('mongoose:connection');

// generate the object exported by module
var db = db || null;


/**
 * [initialize creates a synthetic db object with models and extra info]
 * @return {[db]} [database object with models]
 */
function initialize (){
	if(db) return db;

	// mongoose.Promise = require('bluebird');

	db = {};

	// define the connection url
	db.url = process.env.DB || 'mongodb://localhost/gastruck';

	// verify the connection state of mongoose
	db.readyState = function(){
		return mongoose.connection.readyState;
	};

	// creates a mongo connection with mongoose
	db.connect = function(callback){
		return mongoose.connect(
				db.url,{},
				callback
			);
	};

	// disconnect from mongo
	db.disconnect = function(callback){
		return mongoose.disconnect(callback);
	};

	
	// CONNECTION EVENTS
	// When successfully connected
	mongoose.connection.on('connected', function () {
		debug('Mongoose default connection open to ' + db.url);
	});

	// If the connection throws an error
	mongoose.connection.on('error',function (err) {
		debug('Mongoose default connection error: ' + err);
	});

	// When the connection is disconnected
	mongoose.connection.on('disconnected', function () {
		debug('Mongoose default connection disconnected');
	});

	// If the Node process ends, close the Mongoose connection
	process.on('SIGINT', function() {
		mongoose.connection.close(function () {
			debug('Mongoose default connection disconnected through app termination');
			process.exit(0);
		});
	});

	db.ObjectId = function(id){
		return mongoose.Types.ObjectId(id);
	};

	db.models = {
		States: require('./states.schema'),
		Cities: require('./cities.schema'),
		Stations: require('./stations.schema')
	};

	return db;
}


module.exports = initialize();
