var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var citiesSchema = Schema({
	name: String,
	selMunicipio: String, 
	statistics: [{
		type: String,
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
	}],
	stations: [{ type: Schema.Types.ObjectId, ref: 'Stations' }],
	dates: {
		from: Date,
		to: Date
	}
});

module.exports = mongoose.model('Cities', citiesSchema);
