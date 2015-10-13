var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var citiesSchema = Schema({
	// basic info
	// _state: {
	// 	type: Schema.Types.ObjectId,
	// 	ref: 'States'
	// },
	state: String,
	name: String,
	selMunicipio: String,
	dates: {
		from: Date,
		to: Date
	},
	selCombustivel: String,
	// statistics
	statistics: {
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
	},
	stations: [{
		type: Schema.Types.ObjectId,
		ref: 'Stations'
	}]
},{
	autoIndex: process.env.NODE_ENV ? true : false
});


module.exports = mongoose.model('Cities', citiesSchema);