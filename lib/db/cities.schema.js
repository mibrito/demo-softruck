var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var citiesSchema = Schema({
	// basic info
	_state: {
		type: Schema.Types.ObjectId,
		ref: 'States'
	},
	name: String,
	selMunicipio: String,
	dates: {
		from: Date,
		to: Date
	},

	// statistics
	statistics: [{
		fuelType: String,
		consumerPrice: [{
			averagePrice: Number,
			standardDeviation: Number,
			minPrice: Number,
			maxPrice: Number,
			averageMargin: Number
		}],
		distributionPrice: [{
			averagePrice: Number,
			standardDeviation: Number,
			minPrice: Number,
			maxPrice: Number
		}],
	}]
	
},{
	autoIndex: process.env.NODE_ENV ? true : false
});

citiesSchema.index({ 'selMunicipio': 1, 'dates.from': 1, 'dates.to': 1 });

module.exports = mongoose.model('Cities', citiesSchema);