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
	db.url = "mongodb://localhost/gastruck";

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

	// // manualy load models
	// db.load = function(name){
	// 	db.model[name] = require('./schemas/'+name);
	// 	return db.model[name];
	// };
	//
	// // load all models
	// db.loadModels= function(){
	// 	return [
	// 		//db.load('users'),
	// 		db.load('applications')
	// 	];
	// };

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

	db.models = {
		//users: require('./users.schema'),
		States: require('./states.schema'),
		Cities: require('./cities.schema'),
		Stations: require('./stations.schema'),
		Prices: require('./prices.schema')
	};

	return db;
}


module.exports = db || initialize();
