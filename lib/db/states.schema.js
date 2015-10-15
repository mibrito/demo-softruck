/*
 * File with states schema for mongoose
 */
var _ = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var formatDate = require('../formatDate');

var statesSchema = new Schema({
	_id: Schema.Types.ObjectId,
	name: String,
	cities: [{
		type: Schema.Types.ObjectId,
		ref: 'Cities'
	}],
	dates: {
		from: { type: Date, get: function(d){ return formatDate(d, '-', true);} },
		to: { type: Date, get: function(d){ return formatDate(d, '-', true);} }
	}
});

module.exports = mongoose.model('States', statesSchema);
