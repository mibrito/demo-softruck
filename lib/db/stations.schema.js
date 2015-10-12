var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var stationsSchema = Schema({
	_city: {
		type: Schema.Types.ObjectId,
		ref: 'Cities'
	},
	name: String,
	address: String,
	area: String,
	flag: String
});

// stationsSchema.index({ name: 1, _city: 1 });

module.exports = mongoose.model('Stations', stationsSchema);
