var _ = require('lodash');
var Promise = require('bluebird');
var sleep = require('sleep');

var cheerio = require('cheerio');
var request = Promise.promisify(require('request'));

var debug = require('debug');

var db = require('../db');
var States = db.models.States;
var Cities = db.models.Cities;
var Stations = db.models.Stations;

var crawlStates = function(cb){

	debug('crawler:min:crawlStates')('request');
	// request the page
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
		method: 'get',
		encoding: 'binary'
	}).then(function(html){

		debug('crawler:min:crawlStates')('parsing');
		// parsing .....
		var $ = cheerio.load(html.toString());

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
		return Promise.all(allInsertions)
			.then(function(){

				debug('crawler:min:crawlStates')('finish');
				debug('crawler:extra:crawlStates')([selSemana, states, fuels]);

				return Promise.resolve([selSemana, states, fuels]);
			});
	});
};





var crawlCities = function(selSemana, fuel, state, cb){
	var semana = selSemana.split(' ');
	var dates = {
		from: new Date(semana[1]),
		to: new Date(semana[3])
	};


	var crawlmenssage = [selSemana,state.document.name,fuel.fuelType].join()
	debug('crawler:min:crawlCities')(crawlmenssage, 'request');
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
		method: 'POST',
		encoding: 'binary',
		form: {
			selSemana: selSemana,
			selEstado: state.selEstado,
			selCombustivel: fuel.selCombustivel
			// selSemana: '851*De 04/10/2015 a 10/10/2015',
			// selEstado: 'AC*ACRE',
			// selCombustivel: '487*Gasolina'
		}
	}).then(function(html){
		debug('crawler:min:crawlCities')(crawlmenssage, 'parsing');

		// parsing .....
		var $ = cheerio.load(html.toString());

		// get all rows from table of cities stats
		var rows = $('tr');

		var cities = [];
		var citiesRef = {};
		var allInsertions = [];
		rows.slice(3, rows.length).each(function(i, row){

			var cols = $(row).children();	// all columns

			// get city info
			var name = cols.eq(0).text();
			var selMunicipio = cols.eq(0).children('a')[0].attribs.href.split('\'')[1]
			citiesRef[selMunicipio] = {
				name: name,
				state: state.document._id
			};

			// get statistics
			var statistics = {
				fuelType: fuel.fuelType,
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
				Cities.findOne(citiesRef[selMunicipio])
					.then(function(cityFound){
						if(!cityFound){
							var newCity = new Cities(citiesRef[selMunicipio]);
							newCity.dates = dates;
							return newCity.save().then(function(cityInserted){
								States.findByIdAndUpdate(
									state.document._id,
									{$push: {'cities': cityInserted}},
									{safe: true, upsert: true},
									function(err, model) {
										debug('crawler:min:crawlCities')(crawlmenssage+' -> '+cityInserted.name, 'inserted');
									}
								);
								return Promise.resolve(cityInserted);
							})
						}else{
							return Promise.resolve(cityFound);
						}
					}).then(function(cityDoc){
						cityDoc.statistics.push(statistics);
						return cityDoc.save();
					}).then(function(cityDoc){
						cities.push({
							document: cityDoc,
							selMunicipio: selMunicipio,
						});
						return Promise.resolve(cityDoc);
					})
			);
		});

		return Promise.all(allInsertions)
			.then(function(){
				debug('crawler:min:crawlCities')(crawlmenssage, 'finish');
				debug('crawler:extra:crawlCities')([selSemana, cities]);

				return Promise.resolve([selSemana, cities]);
			});
	});
};



/**
 * Crawl the last level of ANP Fuels' page, collecting the stations and its prices
 * It scraps the page to find the stations info and prices for the fuel(parameter).
 * Then on one hand it verifies if the station already exist, if not a new station
 * is created with the prices found. On the other hand, if the station already
 * exists the algorithm just push prices on the array of prices of that station
 * document.
 * @param  {String} selSemana - week identification
 * @param  {[type]} fuel      - collect info of this kind of fuel
 * @param  {[type]} city      - city that contains the stations
 * @return {Promise<Object>}  - return all the stations found
 */
var crawlStations = function(selSemana, fuel, city){

	var semana = selSemana.split(' ');
	var dates = {
		from: new Date(semana[1]),
		to: new Date(semana[3])
	};

	var crawlmenssage = [selSemana,city.document.name,fuel.fuelType].join()
	debug('crawler:min:crawlStations')(crawlmenssage, 'request');
	
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Semanal_Posto.asp',
			method: 'POST',
			encoding: 'binary',
			form: {
				'cod_semana': selSemana.split('*')[0],
				'selMunicipio': city.selMunicipio,
				'cod_combustivel': fuel.selCombustivel.split('*')[0]
			}
	}).then(function(html){

		debug('crawler:min:crawlStations')(crawlmenssage, 'parsing');

		// parsing .....
		var $ = cheerio.load(html.toString());

		// get all rows from table of cities stats
		var rows = $('div.multi_box3 table.table_padrao tr');

		var stations = {};
		var allInsertions = [];	// keep all insertions promised
		rows.slice(1, rows.length).each(function(i, row){
			var cols = $(row).children();	// all columns

			// get stations
			var name = cols.eq(0).text()
			stations[name] = {
				name: name,
				address: cols.eq(1).text(),
				area: cols.eq(2).children().text(),
				flag: cols.eq(3).text(),
				city: city.document_id
			};

			// get prices
			var prices = {
				fuelType: fuel.fuelType,
				sellPrice: parseFloat(cols.eq(4).html().replace(',', '.')) || null,
				buyPrice: parseFloat(cols.eq(5).html().replace(',', '.')) || null,
				saleMode: cols.eq(6).html()  || null,
				provider: cols.eq(7).html() ? new Date(cols.eq(7).html()) : null,
				date: cols.eq(8).html() ? new Date(cols.eq(8).html()) : null
			};

			// push to sincronize with allInsertions
			allInsertions.push(
				Stations.findOne({
					name: stations[name].name,
					address: stations[name].address,
					area:  stations[name].area
				})	// verify if the station already exists
					.then(function(stationFound){

						if(!stationFound){	// if doesnt exists create a new station
							var newStation = new Stations(stations[name]);
							newStation.dates = dates;
							return newStation.save()
								.then(function(stationInserted){
									Cities.findByIdAndUpdate(
										city.document._id,
										{$push: {'stations': stationInserted}},
										{safe: true, upsert: true},
										function(err, model) {
											debug('crawler:min:crawlStations')(crawlmenssage+' -> '+stationInserted.name, 'inserted');
										}
									);
									return Promise.resolve(stationInserted);
								});
						}else{						// if exists, just return the station
							return Promise.resolve(stationFound);
						}
					}).then(function(stationDoc){
						stationDoc.prices.push(prices);		// add prices for this fuel
						return stationDoc.save()
							.then(function(){
								return Promise.resolve();
							});
					}).catch(function(err){
						console.log(dates, semana, stations[name]);
						return Promise.reject(err);
					})
			);
		});
		
		return Promise.all(allInsertions)	// sincronize all insertions
			.then(function(){
				debug('crawler:min:crawlStations')(crawlmenssage, 'finish');
				debug('crawler:extra:crawlStations')([selSemana, stations]);

				return Promise.resolve([selSemana, stations]);
			});
	});
}

var walkTreeOfPages = function(selSemana, fuel, states, sleeptime){
	var allCitiesPromised = [];
	states.forEach(function(state){
		
		// go deep on cities
		sleep.usleep(sleeptime);	// been polited
		allCitiesPromised.push(
			crawlCities(selSemana, fuel, state)	// crawl all cities statistics one by one
				.spread(function(selSemana, cities){

					// go deep on stations
					var allStationsPromised = [];
					cities.forEach(function(city){
						sleep.usleep(sleeptime);	// been polited
						allStationsPromised.push(crawlStations(selSemana, fuel, city)); // crawl all stations prices one by one
					});

					return Promise.all(allStationsPromised);
				})
		);
	});

	return Promise.all(allCitiesPromised);
}



db.connect(function(){
	var sleeptime = 500000;
	debug('crawler:min:start')('start crawling.....');
 	crawlStates().spread(function(selSemana, states, fuels){
 		walkTreeOfPages(selSemana, fuels[0], states, sleeptime)	// create all documents
 		.then(function(){
 			return walkTreeOfPages(selSemana, fuels[1], states, sleeptime)
 		}).then(function(){
 			return walkTreeOfPages(selSemana, fuels[2], states, sleeptime)
 		}).then(function(){
 			return walkTreeOfPages(selSemana, fuels[3], states, sleeptime)
 		}).then(function(){
 			return walkTreeOfPages(selSemana, fuels[4], states, sleeptime)
 		}).then(function(){
 			return walkTreeOfPages(selSemana, fuels[5], states, sleeptime)
 		}).then(function(){
 			debug('crawler:min:end')('end crawling.....');
 			db.disconnect();
 		});
 	});
});

// crawlInitialParameters();