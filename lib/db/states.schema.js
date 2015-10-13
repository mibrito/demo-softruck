
var _ = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var statesSchema = Schema({
	name: String,
	cities: [{
		type: Schema.Types.ObjectId,
		ref: 'States'
	}],
	dates: {
		from: Date,
		to: Date
	}
});

module.exports = mongoose.model('States', statesSchema);
