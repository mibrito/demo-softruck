var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var stationsSchema = Schema({
	city: {
		type: Schema.Types.ObjectId,
		ref: 'Cities'
	},
	name: String,
	address: String,
	area: String,
	flag: String,
	prices: [{
		fuelType: String,
		sellPrice: Number,
		buyPrice: Number,
		saleMode: String,
		provider: Date,
		date: Date,
	}]
});

stationsSchema.index({ name: 1, _city: 1, 'prices.fuelType': 1 });

module.exports = mongoose.model('Stations', stationsSchema);
