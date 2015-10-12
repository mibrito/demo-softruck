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
var debugMin = debug('crawler:min:CrawlerForResumoPorEstadoMunicipio');
var debugExtra = debug('crawler:extra:CrawlerForResumoPorEstadoMunicipio');
var debugError = debug('app:error');

// db
var db = require('../db');
var Cities = db.models.Cities;


var CrawlerForResumoPorEstadoMunicipio = function(selSemana, dates, stateRef, fuelRef) {
	console.log(selSemana, dates, stateRef, fuelRef);
	// request params
	this.selSemana = selSemana || null;
	this.dates = dates || null;
	this.stateRef = stateRef || null;
	this.fuelRef = fuelRef || null;

	// crawl data
	this.citiesRefs = {};

	// error messages
	this.error = null;
};

//now we have the whole body, parse it and select the nodes we want...
CrawlerForResumoPorEstadoMunicipio.prototype.bodyParserHandler = function() {

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


				// get cities =============
				var DOMStatistics = _.drop(DOMTds, 1);

				// verify if 
				Cities.findOne({ dates: self.dates, selMunicipio: selMunicipio })
					.then(function(cityFound){
						if(!cityFound){
							var newCity = new Cities(self.citiesRefs[selMunicipio]);
							newCity.dates = self.dates;
							console.log(self.stateRef);
							newCity._state = self.stateRef;
							return newCity.save();
						}else{
							return cityFound;
						}
					}).then(function(city){

						return Cities.count({ 'statistics.fuelType': self.fuelRef.fuelType })
							.then(function(count){
								if(!count){
									city.statistics.push({
										fuelType: self.fuelRef.fuelType,
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
								}

								return city.save();
							});
					}).then(function(city){
						self.citiesRefs[selMunicipio] = city;
					});
			});
		}
	}, {
		verbose: true,
		ignoreWhitespace: true
	});
};


CrawlerForResumoPorEstadoMunicipio.prototype.crawl = function(selSemana, dates, stateRef, fuelRef) {
	if(!arguments.length && (!this.selSemana || !this.dates || !this.stateRef || !this.fuelRef)){
		return Promise.reject(new Error('Request parameters doesnt exists ( selSemana || dates || state || fuelRef )'));
	}

	// has to be set to be used on this.bodyParserHandler
	this.selSemana = selSemana || this.selSemana;
	this.dates = dates || this.dates;
	this.stateRef = stateRef || this.stateRef;
	this.fuelRef = fuelRef || this.fuelRef;

	// sleep.usleep(500000); // 0.5 sec

	debugMin([this.selSemana, this.stateRef.selEstado, this.fuelRef.selCombustivel]);
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

		debugMin('parsing');
		// parsing ...
		var parser = new htmlparser.Parser(this.bodyParserHandler());	// set parser handler
		parser.parseComplete(body.toString());							// parse everything


		// returning ...
		if(this.error){
			debugError(this.error);
			return Promise.reject(this.error);	// booble up an error to promise chain
		}else{
			debugExtra([ this.selSemana, this.dates, this.citiesRefs, this.fuelRef ]);
			return Promise.resolve([ this.selSemana, this.dates, this.citiesRefs, this.fuelRef ]);	// spread initialparams	
		}

	}.bind(this)).catch(function(err){
		debugError(err);
		Promise.reject(err);
	});
};

// var crawlerForResumoPorCidadeMunicipio = new CrawlerForResumoPorEstadoMunicipio();

// var States = db.models.States;

// States.findOne({ selEstado: 'AC*ACRE' })
// 	.then(function(stateFound){
// 	crawlerForResumoPorCidadeMunicipio.crawl(
// 		'851*De 04/10/2015 a 10/10/2015',
// 		{ from: new Date('04/10/2015'), to: new Date('10/10/2015') },
// 		stateFound,
// 		{ selCombustivel: '487*Gasolina', fuelType: 'Gasolina' }
// 	);
// });

module.exports = CrawlerForResumoPorEstadoMunicipio;