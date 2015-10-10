var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var stationsSchema = Schema({
	name: String,
	address: String,
	area: String,
	flag: String,
	prices: [{
		type: String,
		sellPrice: Number,
		buyPrice: Number,
		saleMode: Number,
		provider: Number,
		date: Date
	}],
	dates: {
		from: Date,
		to: Date
	}
});

module.exports = mongoose.model('Stations', stationsSchema);
