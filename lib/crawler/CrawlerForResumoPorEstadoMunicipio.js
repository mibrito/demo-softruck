// util libs ...
var _ = require('lodash');
var Promise = require('bluebird');
var mongoose = require('mongoose');



// http requests and DOM selection ...
var request = Promise.promisify(require('request'));
var cheerio = require('cheerio');

// debug ...
var debug = require('debug');
var debugMin = debug('crawler:min:CrawlerForResumoPorEstadoMunicipio');
var debugExtra = debug('crawler:extra:CrawlerForResumoPorEstadoMunicipio');
var debugError = debug('app:error');

// db
var db = require('../db');
var Cities = db.models.Cities;
var States = db.models.States;


var CrawlerForResumoPorEstadoMunicipio = function(selSemana, dates, stateRef, fuelRef) {
	// console.log(selSemana, dates, stateRef, fuelRef);
	// request params
	this.selSemana = selSemana || null;
	this.dates = dates || null;
	this.stateRef = stateRef || null;
	this.fuelRef = fuelRef || null;

	// crawl data
	this.citiesRefs = [];

	// error messages
	this.error = null;
};

CrawlerForResumoPorEstadoMunicipio.prototype.parser = function(body){
	var $ = cheerio.load(body);

	var allPromises = [];

	var DOMTr = $('tr');

	_.forEach(DOMTr.slice(3, DOMTr.length), function(row){
		var row = $(row); // make it a cheerio object
	
		var cols = row.children();	// get cols

		// console.log(cols.eq(0).children()[0].attribs.href.split('\'')[1]);

		// get sel municipio
		// var selMunicipio = cols.eq(0).children()[0].attribs.href.split('\'')[1];
		// var name = cols.eq(0).children().text();	// get the anchor value on a's child

		var city = {
			state: this.stateRef.name,
			name: cols.eq(0).children().text(),
			selMunicipio: cols.eq(0).children()[0].attribs.href.split('\'')[1],
			dates: this.dates,
			selCombustivel: this.fuelRef.selCombustivel,
			statistics: {
				fuelType: this.fuelRef.fuelType,
				consumerPrice: [{
					averagePrice: parseFloat(cols.eq(2).html().replace(',', '.')) || null,
					standardDeviation:  parseFloat(cols.eq(3).html().replace(',', '.'))  || null,
					minPrice:  parseFloat(cols.eq(4).html().replace(',', '.'))  || null,
					maxPrice:  parseFloat(cols.eq(5).html().replace(',', '.'))  || null,
					averageMargin:  parseFloat(cols.eq(6).html().replace(',', '.'))  || null
				}],
				distributionPrice: [{
					averagePrice:  parseFloat(cols.eq(7).html().replace(',', '.'))  || null,
					standardDeviation:  parseFloat(cols.eq(8).html().replace(',', '.'))  || null,
					minPrice:  parseFloat(cols.eq(9).html().replace(',', '.'))  || null,
					maxPrice:  parseFloat(cols.eq(10).html().replace(',', '.'))  || null
				}]
			}
		}

		allPromises.push(
			Cities.findOne(_.omit(city, 'statistics'))
			.then(function(cityFound){
				if(!cityFound){
					var newCity = new Cities(city);
					return newCity.save();
				}else{
					return Promise.resolve(cityFound);
				}
			}.bind(this)).then(function(citySaved){
				this.citiesRefs.push(citySaved);
			}.bind(this))
		);
		// var city = new Cities({
		// 	name: 
		// 	selMunicipio: selMunicipio,
		// 	dates: this.dates,
		// 	_state: this.stateRef,
		// 	selCombustivel: this.fuelRef.selCombustivel,
		// 	statistics: {
		// 		fuelType: this.fuelRef.fuelType,
		// 		consumerPrice: [{
		// 			averagePrice: parseFloat(cols.eq(2).html().replace(',', '.')) || null,
		// 			standardDeviation:  parseFloat(cols.eq(3).html().replace(',', '.'))  || null,
		// 			minPrice:  parseFloat(cols.eq(4).html().replace(',', '.'))  || null,
		// 			maxPrice:  parseFloat(cols.eq(5).html().replace(',', '.'))  || null,
		// 			averageMargin:  parseFloat(cols.eq(6).html().replace(',', '.'))  || null
		// 		}],
		// 		distributionPrice: [{
		// 			averagePrice:  parseFloat(cols.eq(7).html().replace(',', '.'))  || null,
		// 			standardDeviation:  parseFloat(cols.eq(8).html().replace(',', '.'))  || null,
		// 			minPrice:  parseFloat(cols.eq(9).html().replace(',', '.'))  || null,
		// 			maxPrice:  parseFloat(cols.eq(10).html().replace(',', '.'))  || null
		// 		}]
		// 	}
		// });

		// allPromises.push(city.save()
		// 	.then(function(citySaved){
		// 		this.citiesRefs.push(citySaved);
		// 	}.bind(this)));
		// verify if city exists
		// allPromises.push(
			// Cities.findOne({ dates: this.dates, selMunicipio: selMunicipio })
			// 	.then(function(cityFound){
			// 		if(!cityFound){
			// 			var newCity = new Cities(this.citiesRefs[selMunicipio]);
			// 			newCity.dates = this.dates;
			// 			newCity._state = this.stateRef;
			// 			return newCity.save();
			// 		}else{
			// 			return cityFound;
			// 		}
			// 	}.bind(this)).then(function(cityRef){
			// 		// if(!_.isEmpty(cityRef.statistics) && _.find(cityRef.statistics, function(stat) {
			// 		// 	return stat.fuelType === this.fuelRef.fuelType;
			// 		// }.bind(this))) return Promise.resolve(cityRef);

			// 		cityRef.statistics.push({
			// 			fuelType: this.fuelRef.fuelType,
			// 			consumerPrice: [{
			// 				averagePrice: parseFloat(cols.eq(2).html().replace(',', '.')) || null,
			// 				standardDeviation:  parseFloat(cols.eq(3).html().replace(',', '.'))  || null,
			// 				minPrice:  parseFloat(cols.eq(4).html().replace(',', '.'))  || null,
			// 				maxPrice:  parseFloat(cols.eq(5).html().replace(',', '.'))  || null,
			// 				averageMargin:  parseFloat(cols.eq(6).html().replace(',', '.'))  || null
			// 			}],
			// 			distributionPrice: [{
			// 				averagePrice:  parseFloat(cols.eq(7).html().replace(',', '.'))  || null,
			// 				standardDeviation:  parseFloat(cols.eq(8).html().replace(',', '.'))  || null,
			// 				minPrice:  parseFloat(cols.eq(9).html().replace(',', '.'))  || null,
			// 				maxPrice:  parseFloat(cols.eq(10).html().replace(',', '.'))  || null
			// 			}]
			// 		});

			// 		return cityRef.save();
			// 	}.bind(this)).then(function(city){
			// 		this.citiesRefs[selMunicipio] = city;

			// 		return Promise.resolve(city);
			// 	}.bind(this))
		// );
	}.bind(this));

	if(allPromises.length) return Promise.all(allPromises); // found this fuels for this state
	else return Promise.resolve(); // doesn't found fuels for this state
	
}


CrawlerForResumoPorEstadoMunicipio.prototype.crawl = function(selSemana, dates, stateRef, fuelRef) {
	if(!arguments.length && (!this.selSemana || !this.dates || !this.stateRef || !this.fuelRef)){
		return Promise.reject(new Error('Request parameters doesnt exists ( selSemana || dates || state || fuelRef )'));
	}

	// has to be set to be used on this.bodyParserHandler
	this.selSemana = selSemana || this.selSemana;
	this.dates = dates || this.dates;
	this.stateRef = stateRef || this.stateRef;
	this.fuelRef = fuelRef || this.fuelRef;

	this.citiesRefs = [];

	debugMin([this.selSemana, this.stateRef.selEstado, this.fuelRef.selCombustivel]);

	return Promise.delay(500).bind(this).then(function(){
		return request({
			url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
			method: 'POST',
			encoding: 'binary',
			form: {
				selSemana: this.selSemana,
				selEstado: this.stateRef.selEstado,
				selCombustivel: this.fuelRef.selCombustivel
			}
		});
	}).then(function(body) {
		debugMin([this.selSemana, this.stateRef.selEstado, this.fuelRef.selCombustivel], 'parsing');
		return this.parser(body.toString());
	}).then(function(){

		// returning ...
		if(this.error){
			debugError(this.error);
			return Promise.reject(this.error);	// booble up an error to promise chain
		}else{
			debugExtra([ this.selSemana, this.dates, this.citiesRefs ]);
			return Promise.resolve([ this.selSemana, this.dates, this.citiesRefs ]);	// spread initialparams	
		}

	}).catch(function(err){
		debugError(err);
		Promise.reject(err);
	});
};

// var crawlerForResumoPorCidadeMunicipio = new CrawlerForResumoPorEstadoMunicipio();

// var States = db.models.States;

// db.connect(function(){
// 	States.findOne({  name: 'Acre', selEstado: 'AC*ACRE' }).then(function(stateFound){
// 		console.log(stateFound);
// 		crawlerForResumoPorCidadeMunicipio.crawl(
// 			'851*De 04/10/2015 a 10/10/2015',
// 			{ from: new Date('04/10/2015'), to: new Date('10/10/2015') },
// 			stateFound,
// 			{ selCombustivel: '487*Gasolina', fuelType: 'Gasolina' }
// 		);
// 	});
// });

module.exports = CrawlerForResumoPorEstadoMunicipio;