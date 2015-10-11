var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var pricesSchema = Schema({
	_station: {
		type: Schema.Types.ObjectId,
		ref: 'Stations'
	},
	typeFuels: String,
	sellPrice: Number,
	buyPrice: Number,
	saleMode: String,
	provider: Date,
	date: Date,
	dates: {
		from: Date,
		to: Date
	}
});

module.exports = mongoose.model('Prices', pricesSchema);