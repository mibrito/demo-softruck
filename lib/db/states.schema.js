
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var stateSchema = Schema({
	name: String,
	cities: [{ type: Schema.Types.ObjectId, ref: 'Cities' }]
});

module.exports = mongoose.model('State', stateSchema);
