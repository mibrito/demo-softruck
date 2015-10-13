// util libs ...
var _ = require('lodash');
var Promise = require('bluebird');
var mongoose = require('mongoose');
var sleep = require('sleep');

// http requests and DOM selection ...
var request = Promise.promisify(require('request'));
var cheerio = require('cheerio');

// debug ...
var debug = require('debug');
var debugMin = debug('crawler:min:CrawlerForResumoSemanalPosto');
var debugExtra = debug('crawler:extra:CrawlerForResumoSemanalPosto');
var debugError = debug('app:error');

// db
var db = require('../db');
var Stations = db.models.Stations;
var Cities = db.models.Cities;


var CrawlerForResumoSemanalPosto = function(selSemana, dates, cityRef){
	// request params
	this.selSemana = selSemana || null;
	this.dates = dates || null;
	this.cityRef = cityRef || null;
	// this.fuelRef = fuelRef || null;

	// crawl data
	this.pricesRefs = {}
	this.stationsRefs = {};
	
	// error messages
	this.error || null;
};

CrawlerForResumoSemanalPosto.prototype.parser = function(body){
	var $ = cheerio.load(body);

	var allPromises = [];

	var DOMTr = $('div.multi_box3 table.table_padrao tr');

	_.forEach(DOMTr.slice(1, DOMTr.length), function(row){
		var row = $(row); // make it a cheerio object
	
		var cols = row.children();	// get cols

		// get stations
		var name = cols.eq(0).text()
		var stationInfo = {
			name: name,
			address: cols.eq(1).text(),
			area: cols.eq(2).children().text(),
			flag: cols.eq(3).text(),
			prices: {
				fuelType: this.cityRef.statistics.fuelType,
				sellPrice: parseFloat(cols.eq(4).html().replace(',', '.')) || null,
				buyPrice: parseFloat(cols.eq(5).html().replace(',', '.')) || null,
				saleMode: cols.eq(6).html()  || null,
				provider: new Date(cols.eq(7).html()) || null,
				date: new Date(cols.eq(8).html()) || null,
			},
			dates: this.dates
		}

		// this.cityRef.stations.push(station);

		// allPromises.push(this.cityRef.save());

		// // get prices
		// this.pricesRefs[name] = {
		// 	fuelType: this.cityRef.statistics.fuelType,
		// 	sellPrice: parseFloat(cols.eq(4).html().replace(',', '.')) || null,
		// 	buyPrice: parseFloat(cols.eq(5).html().replace(',', '.')) || null,
		// 	saleMode: cols.eq(6).html()  || null,
		// 	provider: new Date(cols.eq(7).html()) || null,
		// 	date: new Date(cols.eq(8).html()) || null,
		// 	dates: this.dates
		// };

		allPromises.push(
			Stations.findOne(stationInfo)	// findOrCreate
				.then(function(stationFound){
					if(!stationFound){
						var station = new Stations(stationInfo);
						station.city = this.cityRef.name;
						return station.save()
							// .then(function(stationSaved){
							// 	this.cityRef.stations.push(stationSaved);
							// 	return this.cityRef.save();
							// }.bind(this));
					}else{
						return Promise.resolve(stationFound);
					}
				// }.bind(this)).then(function(station){
				// 	return Prices.findOne({ dates: this.dates, fuelType: this.cityRef.statistics.fuelType, _station: station })
				// 		.then(function(priceFound){
				// 			if(!priceFound){
				// 				var newPrice = new Prices(this.pricesRefs[name]);
				// 				newPrice._station = station;
				// 				return newPrice.save();
				// 			}else{
				// 				return Promise.resolve(priceFound);
				// 			}
				// 		}.bind(this));
				}.bind(this))
		);

		// add everything on mongo
		// allPromises.push(
		// 	Stations.findOne(this.stationsRefs[name])	// findOrCreate
		// 		.then(function(stationFound){
		// 			if(!stationFound){
		// 				var station = new Stations(this.stationsRefs[name]);
		// 				station._city = this.cityRef;
		// 				return station.save();
		// 			}else{
		// 				return Promise.resolve(stationFound);
		// 			}
		// 		}.bind(this)).then(function(station){
		// 			return Prices.findOne({ dates: this.dates, fuelType: this.cityRef.statistics.fuelType, _station: station })
		// 				.then(function(priceFound){
		// 					if(!priceFound){
		// 						var newPrice = new Prices(this.pricesRefs[name]);
		// 						newPrice._station = station;
		// 						return newPrice.save();
		// 					}else{
		// 						return Promise.resolve(priceFound);
		// 					}
		// 				}.bind(this));
		// 		}.bind(this))
		// );
	}.bind(this));

	if(allPromises.length) return Promise.all(allPromises); // found this fuels for this city
	else return Promise.resolve(); // doesn't found fuels for this city

}

CrawlerForResumoSemanalPosto.prototype.crawl = function(selSemana, dates, cityRef){
	if(!arguments.length && ( !this.selSemana || !this.dates || !this.cityRef )){
		return Promise.reject(new Error('Request parameters doesnt exit ( selSemana || dates || cityRef )'));
	}

	// has to be set to be used on this.bodyParserHandler
	this.selSemana = selSemana || this.selSemana;
	this.dates = dates || this.dates;
	this.cityRef = cityRef || this.cityRef;

	// sleep.usleep(500000);	// 0.5 sec
	debugMin(this.selSemana.split('*')[0], this.cityRef.selMunicipio, this.cityRef.selCombustivel.split('*')[0]);
	
	return Promise.delay(500).bind(this).then(function(){
		return request({
			url: 'http://www.anp.gov.br/preco/prc/Resumo_Semanal_Posto.asp',
			method: 'POST',
			encoding: 'binary',
			form: {
				'cod_semana': this.selSemana.split('*')[0],
				'selMunicipio': this.cityRef.selMunicipio,
				'cod_combustivel': this.cityRef.selCombustivel.split('*')[0]
			}
		});
	}).bind(this).then(function (body) {
		// // parsing ...
		
		debugMin([this.selSemana, this.cityRef.selMunicipio, this.cityRef.selCombustivel.split('*')[0]], 'parsing');
		return this.parser(body.toString());
	}).then(function(){

		// returning ...
		if(this.error){
			debugError(this.error);
			return Promise.reject(this.error);	// booble up an error to promise chain
		}else{
			debugExtra([ this.selSemana, this.dates, self.stationsRefs, self.pricesRefs ]);
			return Promise.resolve([ this.selSemana, this.dates, self.stationsRefs, self.pricesRefs ]);	// spread initialparams	
		}
	}).catch(function(err){
		debugError(err);
		Promise.reject(err);
	});
};

// var crawlerResumoSemanalPosto = new CrawlerForResumoSemanalPosto();

// var Cities = db.models.Cities;

// var dates = { from: new Date('04/10/2015'), to: new Date('10/10/2015') };

// if(!db.readyState()) db.connect(function(){
// 	Cities.findOne({ 'selMunicipio': '6*CRUZEIRO@DO@SUL', 'dates':dates })
// 		.then(function(cityFound){
// 			crawlerResumoSemanalPosto.crawl(
// 				'851*De 04/10/2015 a 10/10/2015',
// 				dates,
// 				cityFound,
// 				{ selCombustivel: '487*Gasolina', fuelType: 'Gasolina' }
// 			);
// 		});
// });

module.exports = CrawlerForResumoSemanalPosto;