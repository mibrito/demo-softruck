var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var formatDate = require('../formatDate');

var stationsSchema = new Schema({
	city: {
		type: Schema.Types.ObjectId,
		ref: 'Cities'
	},
	name: String,
	address: String,
	area: String,
	flag: { type: String, get: function(v) { return v==='-' ? 'BRANCA' : v ; } },
	prices: [{
		fuelType: { type: String, get: function(v) { return v ? v : '-'; } },
		sellPrice: { type: Number, get: function(v) { return v ? v : 'null'; } },
		buyPrice: { type: Number, get: function(v) { return v ? v : 'null'; } },
		saleMode: { type: String, get: function(v) { return v ? v : '-'; } },
		provider: { type: Date, get: function(d){ return d ? (formatDate(d, '/') === '12/31/1969' ? '-' : formatDate(d, '/')) : '-' ; } },
		date: { type: Date, get: function(d){ return d ? (formatDate(d, '-', true) === '1969-31-12' ? '-' : formatDate(d, '-', true)) : '-' ; } }
	}],
	dates: {
		from: { type: Date, get: function(d){ return formatDate(d, '-', true);} },
		to: { type: Date, get: function(d){ return formatDate(d, '-', true);} }
	}
});

stationsSchema.index({ name: 1, _city: 1, 'prices.fuelType': 1 });

module.exports = mongoose.model('Stations', stationsSchema);
