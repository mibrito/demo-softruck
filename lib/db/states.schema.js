
var _ = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var statesSchema = Schema({
	name: String,
	selEstado: String
});

module.exports = mongoose.model('States', statesSchema);
