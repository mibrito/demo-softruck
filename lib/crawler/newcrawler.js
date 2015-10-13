var _ = require('lodash');
var cheerio = require('cheerio');
var request = require('request');
var sleep = require('sleep');

var debug = require('debug');

var db = require('../db');
var States = db.models.States;
var Cities = db.models.Cities;

var crawlInitialParameters = function(cb){

	debug('crawler:start:crawlInitialParameters')('request');
	// request the page
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
		method: 'get',
		encoding: 'binary'
	}, function(err, response, html){

		debug('crawler:start:crawlInitialParameters')('parsing');
		// parsing .....
		var $ = cheerio.load(html);

		// get hidden params
		var selSemana = $('input[type=hidden]').eq(0)[0].attribs.value;
		var desc_semana = $('input[type=hidden]').eq(1)[0].attribs.value.replace('de ', '').split(' a ');
		var dates = {
			from: new Date(desc_semana[0]),
			to: new Date(desc_semana[1])
		};

		var statesRefs = {};
		var states = [];
		var allInsertions = [];
		$('select[name=selEstado] option').each(function(i, optState){
			var selEstado = optState.attribs.value;

			// get states info
			statesRefs[selEstado] = {
				name: optState.children[0].data,
				dates: dates
			};

			// save all insertion promises
			allInsertions.push(
				States.findOne(statesRefs[selEstado])
				.then(function(stateFound){
					if(!stateFound){
						var newState = new States(statesRefs[selEstado]);
						return newState.save();
					}else{
						return Promise.resolve(stateFound);
					}
				}).then(function(stateDoc){
					states.push({
						document: stateDoc,
						selEstado: selEstado
					});
					return Promise.resolve(stateDoc);
				})
			);
		});

		// get all fuels
		var fuels = [];
		$('select[name=selCombustivel] option').each(function(i, fuel){
			var selCombustivel = fuel.attribs.value;

			fuels.push({
				fuelType: fuel.children[0].data,
				selCombustivel: selCombustivel
			});
		});

		// wait all insertions
		Promise.all(allInsertions)
			.then(function(){
				debug('crawler:finish:crawlInitialParameters')([selSemana, states, fuels]);

				if(cb) cb(selSemana, states, fuels);
			});
	});
};





var crawlCitiesStatisticsPerState = function(selSemana, stateRef, fuelRef, cb){

	debug('crawler:start:crawlCitiesStatisticsPerState')([stateRef.document.name,fuelRef.fuelType].join(), 'request');
	request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
		method: 'POST',
		encoding: 'binary',
		form: {
			selSemana: selSemana,
			selEstado: stateRef.selEstado,
			selCombustivel: fuelRef.selCombustivel
			// selSemana: '851*De 04/10/2015 a 10/10/2015',
			// selEstado: 'AC*ACRE',
			// selCombustivel: '487*Gasolina'
		}
	}, function(err, response, html){
		debug('crawler:start:crawlInitialParameters')([stateRef.document.name,fuelRef.fuelType].join(), 'parsing');

		// parsing .....
		var $ = cheerio.load(html);

		// get all rows from table of cities stats
		var rows = $('tr');

		var citiesRefs = {};
		var allInsertions = [];
		rows.slice(3, rows.length).each(function(i, row){

			var cols = $(row).children();	// all columns

			// get city info
			var name = cols.eq(0).text();
			var selMunicipio = cols.eq(0).children('a')[0].attribs.href.split('\'')[1]
			citiesRefs[selMunicipio] = {
				name: name,
				state: stateRef.document._id
			};

			var statistics = {
				fuelType: fuelRef.fuelType,
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
			};


			allInsertions.push(
				Cities.findOne(citiesRefs[selMunicipio])
					.then(function(cityFound){
						if(!cityFound){
							var newCity = new Cities(citiesRefs[selMunicipio]);
							return newCity.save();
						}else{
							return Promise.resolve(cityFound);
						}
					}).then(function(cityDoc){
						cityDoc.statistics.push(statistics);
						return cityDoc.save();
					}).then(function(cityDoc){
						citiesRefs[selMunicipio] = {
							document: cityDoc,
							selMunicipio: selMunicipio,
							fuelRef: fuelRef
						};
						return Promise.resolve(cityDoc);
					})
			);
		});
		
		Promise.all(allInsertions)
			.then(function(){
				debug('crawler:finish:crawlInitialParameters')([selSemana, citiesRefs]);

				if(cb) cb(selSemana, citiesRefs);
			});
	});
};
		// 	var row = $(row); // make it a cheerio object
		
		// 	var cols = row.children();	// get cols

		// 	// get sel municipio
		// 	// var selMunicipio = cols.eq(0).children()[0].attribs.href.split('\'')[1];
		// 	// var name = cols.eq(0).children().text();	// get the anchor value on a's child

		// 	var city = {
		// 		state: this.stateRef.name,
		// 		name: cols.eq(0).children().text(),
		// 		selMunicipio: cols.eq(0).children()[0].attribs.href.split('\'')[1],
		// 		dates: this.dates,
		// 		selCombustivel: this.fuelRef.selCombustivel,
		// 		statistics: {
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
		// 		}
		// 	}

		// 	allPromises.push(
		// 		Cities.findOne(_.omit(city, 'statistics'))
		// 		.then(function(cityFound){
		// 			if(!cityFound){
		// 				var newCity = new Cities(city);
		// 				return newCity.save();
		// 			}else{
		// 				return Promise.resolve(cityFound);
		// 			}
		// 		}.bind(this)).then(function(citySaved){
		// 			this.citiesRefs.push(citySaved);
		// 		}.bind(this))
		// 	);
		// });


// var nextState = 0;
// var nextFuel = 0;

var recurciveCrawlStateByFuel = function(selSemana, state, fuels, nextFuel){
	sleep.usleep(500000);
	crawlCitiesStatisticsPerState(selSemana, state, fuels[nextFuel], function(){
		if(nextFuel >= fuels.length){
			return; // finished
		}
		debug('crawler:recurciveCrawlStateByFuel')( nextFuel );
		recurciveCrawlStateByFuel(selSemana, state, fuels, ++nextFuel);
		
	});
};

db.connect(function(){
 	crawlInitialParameters(function(selSemana, states, fuels){
 		recurciveCrawlStateByFuel(selSemana, states[0], fuels, 0);
 	});
});

// crawlInitialParameters();