var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var citiesSchema = new Schema({
	state: {
		type: Schema.Types.ObjectId,
		ref: 'States'
	},
	name: String,
	// statistics
	statistics: [{
		fuelType: String,
		consumerPrice: [{
			averagePrice: { type: Number, get: function(v) { return v ? v : 'null'; } },
			standardDeviation: { type: Number, get: function(v) { return v ? v : 'null'; } },
			minPrice: { type: Number, get: function(v) { return v ? v : 'null'; } },
			maxPrice: { type: Number, get: function(v) { return v ? v : 'null'; } },
			averageMargin: { type: Number, get: function(v) { return v ? v : 'null'; } }
		}],
		distributionPrice: [{
			averagePrice: { type: Number, get: function(v) { return v ? v : 'null'; } },
			standardDeviation: { type: Number, get: function(v) { return v ? v : 'null'; } },
			minPrice: { type: Number, get: function(v) { return v ? v : 'null'; } },
			maxPrice: { type: Number, get: function(v) { return v ? v : 'null'; } }
		}],
	}],
	stations: [{
		type: Schema.Types.ObjectId,
		ref: 'Stations'
	}],
	dates: {
		from: { type: Date, get: function(d){ return formatDate(d, '-', true);} },
		to: { type: Date, get: function(d){ return formatDate(d, '-', true);} }
	}
},{
	toObject: {	virtuals: true },
	toJSON: { virtuals: true },
	autoIndex: process.env.NODE_ENV ? true : false
});

module.exports = mongoose.model('Cities', citiesSchema);