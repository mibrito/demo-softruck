var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var citiesSchema = Schema({
	_state: {
		type: Schema.Types.ObjectId,
		ref: 'States'
	},
	name: String,
	selMunicipio: String,
	statistics: [{
		typeName: String,
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
	dates: {
		from: Date,
		to: Date
	}
});

module.exports = mongoose.model('Cities', citiesSchema);