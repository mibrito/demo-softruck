var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var citiesHistorySchema = Schema({
	_city: {
		type: Schema.Types.ObjectId,
		ref: 'Cities'
	},
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
	stations: [{
		type: Schema.Types.ObjectId,
		ref: 'Stations'
	}],
	dates: {
		from: Date,
		to: Date
	}
});

module.exports = mongoose.model('CitiesHistory', citiesHistorySchema);