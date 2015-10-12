// util libs ...
var _ = require('lodash');
var Promise = require('bluebird');
var mongoose = require('mongoose');
var sleep = require('sleep');

// http requests and DOM selection ...
var request = Promise.promisify(require('request'));
var select = require('soupselect').select;
var htmlparser = require('htmlparser');

// debug ...
var debug = require('debug');
var debugMin = debug('crawler:min:CrawlerForResumoPorCidadeMunicipio');
var debugExtra = debug('crawler:extra:CrawlerForResumoPorCidadeMunicipio');
var debugError = debug('app:error');

// db
var db = require('../db');
var Stations = db.models.Stations;
var Prices = db.models.Prices;
var Cities = db.models.Cities;


var CrawlerForResumoSemanalPosto = function(selSemana, dates, cityRef, fuelRef){
	// request params
	this.selSemana = selSemana || null;
	this.dates = dates || null;
	this.cityRef = cityRef || null;
	this.fuelRef = fuelRef || null;

	// crawl data
	this.pricesRefs = {}
	this.stationsRefs = {};
	
	// error messages
	this.error || null;
};

CrawlerForResumoSemanalPosto.prototype.bodyParserHandler = function() {

	self = this;

	// now we have the whole body, parse it and select the nodes we want...
	return new htmlparser.DefaultHandler(function(err, dom) {
		if (err) {
			self.error = err;
		} else {

			// select all rows from prices' tables
			var DOMTrs = select(dom, 'div.multi_box3 table.table_padrao tr');
			DOMTrs = _.drop(DOMTrs, 1);

			// look over all rows
			DOMTrs.forEach(function(row){

				// get all columns
				var DOMTds = select(row, 'td');

				var name = DOMTds[0].children[0].data

				// get stations
				self.stationsRefs[name] = {
					name: name,
					address: DOMTds[1].children[0].data,
					area: DOMTds[2].children[0].children[0].data,
					flag: DOMTds[3].children[0].data,
				}

				// get prices
				self.pricesRefs[name] = {
					fuelType: self.fuelRef.fuelType,
					sellPrice: parseFloat(DOMTds[4].children[0].data.replace(',', '.')) || null,
					buyPrice: parseFloat(DOMTds[5].children[0].data.replace(',', '.')) || null,
					saleMode: DOMTds[6].children[0].data,
					provider: new Date(DOMTds[7].children[0].data) || null,
					date: new Date(DOMTds[8].children[0].data) || null,
					dates: self.dates
				};

				// add everything on mongo
				Stations.findOne(self.stationsRefs[name])	// findOrCreate
					.then(function(stationFound){
						if(!stationFound){
							return Cities.findOne(self.cityRef).then(function(city){
								if(city){
									var station = new Stations(self.stationsRefs[name]);
									station._city = city;
									return station.save()
								}else{
									console.log(new Error('city doenst exists on MongoDB'));
								}
							});
							
						}else{
							return Promise.resolve(stationFound);
						}
					}).then(function(station){
						return Prices.findOne({ dates: self.dates, fuelType: self.fuelRef.fuelType, _station: station })
							.then(function(priceFound){
								if(!priceFound){
									var newPrice = new Prices(self.pricesRefs[name]);
									newPrice._station = station;
									return newPrice.save();
								}else{
									return Promise.resolve(priceFound);
								}
							});
					});
				// console.log(DOMTds[0].children[0].data);
			});
		}
	}, {
		verbose: true,
		ignoreWhitespace: true
	});
};

CrawlerForResumoSemanalPosto.prototype.crawl = function(selSemana, dates, cityRef, fuelRef){
	if(!arguments.length && ( !this.selSemana || !this.dates || !this.cityRef || !this.fuelRef )){
		return Promise.reject(new Error('Request parameters doesnt exit ( selSemana || dates || cityRef || fuelRef )'));
	}

	// has to be set to be used on this.bodyParserHandler
	this.selSemana = selSemana || this.selSemana;
	this.dates = dates || this.dates;
	this.cityRef = cityRef || this.cityRef;
	this.fuelRef = fuelRef || this.fuelRef;

	sleep.usleep(500000);	// 0.5 sec
	debugMin(this.selSemana.split('*')[0], this.cityRef.selMunicipio, this.fuelRef.selCombustivel.split('*')[0]);
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Semanal_Posto.asp',
		method: 'POST',
		encoding: 'binary',
		form: {
			'cod_semana': this.selSemana.split('*')[0],
			'selMunicipio': this.cityRef.selMunicipio,
			'cod_combustivel': this.fuelRef.selCombustivel.split('*')[0]
		}
	}).then(function (body) {
		// parsing ...
		var parser = new htmlparser.Parser(this.bodyParserHandler());	// set parser handler
		parser.parseComplete(body.toString());							// parse everything


		// returning ...
		if(this.error){
			debugError(this.error);
			return Promise.reject(this.error);	// booble up an error to promise chain
		}else{
			debugExtra([ this.selSemana, this.dates, self.stationsRefs, self.pricesRefs ]);
			return Promise.resolve([ this.selSemana, this.dates, self.stationsRefs, self.pricesRefs ]);	// spread initialparams	
		}
	}.bind(this));
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