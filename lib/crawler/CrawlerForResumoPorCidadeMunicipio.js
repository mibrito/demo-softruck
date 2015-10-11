// util libs ...
var _ = require('lodash');
var sleep = require('sleep');
var Promise = require('bluebird');
var mongoose = require('mongoose');

// http requests and DOM selection ...
var request = Promise.promisify(require("request"));
var select = require('soupselect').select;
var htmlparser = require('htmlparser');

// debug ...
var debug = require('debug');
var debugInfo = debug('crawler:CrawlerForResumoPorCidadeMunicipio');
var debugError = debug('app:error');

// db
var db = require('../db');
if(!db.readyState()) db.connect();
var Cities = db.models.Cities;
var States = db.models.States;
var CitiesHistory = db.models.CitiesHistory;


var CrawlerForResumoPorCidadeMunicipio = function(selSemana, dates, stateRef, fuelRef) {
	// request params
	this.selSemana = selSemana || null;
	this.dates = dates || null;
	this.stateRef = stateRef || null;
	this.fuelRef = fuelRef || null;

	// crawl data
	this.cities = {};
	this.citiesRefs = {};

	// error messages
	this.error = null;
}

//now we have the whole body, parse it and select the nodes we want...
CrawlerForResumoPorCidadeMunicipio.prototype.bodyParserHandler = function() {

	self = this;

	return new htmlparser.DefaultHandler(function(err, dom) {

		if (err) { // found an error
			error = err;
		} else {

			// get all rows cities resume 
			var DOMTr = select(dom, 'tr');
			DOMTr = _.drop(DOMTr, 3);	// drop tr from headers


			// look over all rows
			DOMTr.forEach(function(row){

				// get all tds of this row
				var DOMTds = select(row, 'td');


				// get refs params ========

				// get DOM with td of city
				var DOMAnchorCity = select(DOMTds, '.lincol a');

				var selMunicipio = DOMAnchorCity[0].data.split('\'')[1];	// split using ' and get the middle element

				// extract city refs from DOM
				self.citiesRefs[selMunicipio] = {
					name: DOMAnchorCity[0].children[0].data,	// get the anchor value on a's child
					selMunicipio: selMunicipio
				};


				// get statistics =========
				var DOMStatistics = _.drop(DOMTds, 1);

				// add statistics to cities history
				Cities.findOne(self.citiesRefs[selMunicipio])
					.then(function(cityFound){
						if(!cityFound){
							var newCity = new Cities(self.citiesRefs[selMunicipio]);
							newCity._state = self.stateRef;			
							return newCity.save()
								.then(function(city){
									States.findByIdAndUpdate(
										self.stateRef._id,
										{$push: {"cities": city}},
										{safe: true, upsert: true},
										function(err, model) {
											console.log(err);
										}
									);
									return city;
								});
						}else{
							return cityFound;
						}
					}).then(function(city){
						return CitiesHistory.findOne({ _city: city, dates: self.dates })	// findOrCreate
							.then(function(cityHistory){
								if(!cityHistory){	// verify if exists and create
									var newCityHistory = new CitiesHistory({
										_city: city._id,
										dates: self.dates,
										statistics: []
									});
									return newCityHistory.save();
								}else{
									return Promise.resolve(cityHistory);
								}
							})
							.then(function(cityHistory){	// add new statistic to cityHistory
								// return CitiesHistory.findByIdAndUpdate(
								// 	cityHistory._id,
								// 	{ $push: { "statistics":  } }
								// );
								console.log(self.fuelRef.type);
								cityHistory.statistics.push({
									typeName: self.fuelRef.type,
									consumerPrice: [{
										averagePrice: parseFloat(DOMStatistics[1].children[0].data.replace(',', '.')),
										standardDeviation:  parseFloat(DOMStatistics[2].children[0].data.replace(',', '.')),
										minPrice:  parseFloat(DOMStatistics[3].children[0].data.replace(',', '.')),
										maxPrice:  parseFloat(DOMStatistics[4].children[0].data.replace(',', '.')),
										averageMargin:  parseFloat(DOMStatistics[5].children[0].data.replace(',', '.'))
									}],
									distributionPrice: [{
										averagePrice:  parseFloat(DOMStatistics[6].children[0].data.replace(',', '.')),
										standardDeviation:  parseFloat(DOMStatistics[7].children[0].data.replace(',', '.')),
										minPrice:  parseFloat(DOMStatistics[8].children[0].data.replace(',', '.')),
										maxPrice:  parseFloat(DOMStatistics[9].children[0].data.replace(',', '.'))
									}]
								});
								return cityHistory.save();
							}).then(function(cityHistory){	
								city.history.push(cityHistory);
								return city.save();
							});
					});
			});

			// // get city name and statistics
			// rows.forEach(function(row){
			// 	var cityDom = select(row, 'td.lincol a')[0];
			// 	var tokens = _.words(cityDom.data);	// tokenize
			// 	var selMunicipio = tokens[6] + '*' + _.drop(_.words(tokens), 7).join('@');
			// 	var name = cityDom.children[0].data;

			// 	// get prices
			// 	var tdPrices = select(row, 'td');
			// 	tdPrices = _.drop(tdPrices, 2);	// remove city name and gas stations visited

			// 	var cnt = 0;	// keep track of td's order

			// 	// create an empty consumerPrice object
			// 	var consumerPrice = {
			// 		averagePrice: null,
			// 		standardDeviation: null,
			// 		minPrice: null,
			// 		maxPrice: null,
			// 		averageMargin: null
			// 	};

			// 	// iterate over consumerPrice and tds (cnt)
			// 	_.forEach(consumerPrice, function(item, key){
			// 		consumerPrice[key] = tdPrices[cnt++].children[0].data.replace(',', '.');
			// 	});

			// 	// create an empty distributionPrice object
			// 	var distributionPrice = {
			// 		averagePrice: null,
			// 		standardDeviation: null,
			// 		minPrice: null,
			// 		maxPrice: null
			// 	};

			// 	// iterate over distributionPrice and tds (cnt)
			// 	_.forEach(distributionPrice, function(item, key){
			// 		distributionPrice[key] = tdPrices[cnt++].children[0].data.replace(',', '.');
			// 	});

			// 	// push the city found
			// 	cities.push({
			// 		name: name,
			// 		selMunicipio: selMunicipio,
			// 		consumerPrice: consumerPrice,
			// 		distributionPrice: distributionPrice
			// 	});
			// });

		}
	}, {
		verbose: true,
		ignoreWhitespace: true
	});
};


CrawlerForResumoPorCidadeMunicipio.prototype.crawl = function(selSemana, dates, stateRef, fuelRef) {
	if(!arguments.length && (!this.selSemana || !this.dates || !this.state || !this.fuel)){
		return Promise.reject(new Error('Request parameters doesnt exit ( selSemana || dates || state || fuel )'));
	}

	// has to be set to be used on this.bodyParserHandler
	this.selSemana = selSemana || this.selSemana;
	this.dates = dates || this.dates;
	this.stateRef = stateRef || this.stateRef;
	this.fuelRef = fuelRef || this.fuelRef;

	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
		method: 'POST',
		encoding: 'binary',
		form: {
			selSemana: this.selSemana,
			selEstado: this.stateRef.selEstado,
			selCombustivel: this.fuelRef.selCombustivel
		}
	}).then(function(body) {

		// parsing ...
		var parser = new htmlparser.Parser(this.bodyParserHandler());	// set parser handler
		parser.parseComplete(body.toString());							// parse everything


		// returning ...
		if(this.error){
			debugError(this.error);
			return Promise.reject(this.error);	// booble up an error to promise chain
		}else{
			debugInfo([this.selSemana, this.dates, this.citiesRefs]);
			return Promise.resolve([this.selSemana, this.dates, this.citiesRefs]);	// spread initialparams	
		}

	}.bind(this));
};

var crawlerForResumoPorCidadeMunicipio = new CrawlerForResumoPorCidadeMunicipio();

var States = db.models.States;

States.findOne({ selEstado: 'AC*ACRE' })
	.then(function(stateFound){
	crawlerForResumoPorCidadeMunicipio.crawl(
		'851*De 04/10/2015 a 10/10/2015',
		{ from: new Date('04/10/2015'), to: new Date('10/10/2015') },
		stateFound,
		{ selCombustivel: '487*Gasolina', type: 'Gasolina' }
	);
});
