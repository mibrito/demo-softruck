// util libs
var _ = require('lodash');
var Promise = require('bluebird');
var sleep = require('sleep');

// http requests and DOM selection
var request = Promise.promisify(require("request"));
var select = require('soupselect').select;
var htmlparser = require('htmlparser');

// db
var db = require('../db');
if(!db.readyState()) db.connect();
var States = db.models.States;
var Cities = db.models.Cities;

// debug
var debug = require('debug');
var debugCrawl = debug('crawler');
var debugError = debug('app:error');



/**
 * [crawlInitialParams get the initial params required to start a full crawl]
 * @return {[Promise<Array(params, states, fuels)>]} [description]
 */
var crawlInitialParams = function () {
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
		method: 'get',
		encoding: 'binary'
	}).then(function(body){
		var params = {};
		var states = [];
		var fuels = [];

		var error = null;

		//now we have the whole body, parse it and select the nodes we want...
		var handler = new htmlparser.DefaultHandler(function(err, dom) {
			if (err) {
				error = err;
			} else {

				// soupselect happening here...
				var input = select(dom, 'input');

				// hidden params
				params.selSemana = select(input, 'input[name="selSemana"]')[0].attribs.value;
				params.cod_semana = select(input, 'input[name="cod_Semana"]')[0].attribs.value;
				params.desc_Semana = select(dom, 'input[name="desc_Semana"]')[0].attribs.value;

				// remove 'de ' and split using ' a '
				var dates = params.desc_Semana.replace('de ', '').split(' a ');
				params.dates = {
					from: dates[0],
					to: dates[1]
				}

				// states
				_.forEach(select(dom, 'select[name=selEstado] option'), function(estado){
					var newState = {
						name: estado.children[0].data,
						selEstado: estado.attribs.value
					};

					states.push(newState);
				});

				_.forEach(select(dom, 'select[name=selCombustivel] option'), function(fuel){
					fuels.push({
						selCombustivel: fuel.attribs.value,
						name: fuel.children[0].data
					});
				});
			}
		}, { verbose: true, ignoreWhitespace: true });

		var parser = new htmlparser.Parser(handler);
		parser.parseComplete(body.toString());

		if(error){
			debugError(error);
			return Promise.reject(error);	// booble up an error to promise chain

		}else{

			// save states
			var allStateInsertions = [];
			states.forEach(function(state){
				allStateInsertions.push(
					States.findOne({ name: state.name })
						.then(function(stateFound){
							if(!stateFound){
								var newState = new States(state);
								return newState.save();
							}
						}).catch(function(err){
							console.error(err);
						})
					);
			});
			
			// sync all state insertions
			return allStateInsertions.all(function(){
				debugCrawl([params.dates, states, fuels]);
				return Promise.resolve([params, states, fuels]);	// spread initialparams	
			});
		}
	});
};



/**
 * [crawlResumePerState Crawl all cities and its statistics from a brazilian state]
 * @param  {[Object]} params	[request parameters]
 * @param  {[Object]} state		[state to be crawl]
 * @param  {[Object]} fuels		[fuel]
 * @return {[Promise<Array(params, cities)>]}		[description]
 */
var crawlResumePerStateCity = function (params, state, fuel){

	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
		method: 'POST',
		encoding: 'binary',
		form: {
			'selSemana': params.selSemana,
			'selEstado': state.selEstado,
			'selCombustivel': fuel.selCombustivel
		}
	}).then(function(body) {
		var error = null;	// error handler
		var cities = [];	// cities found

		//now we have the whole body, parse it and select the nodes we want...
		var handler = new htmlparser.DefaultHandler(function(err, dom) {

			if (err) {	// found an error
				error = err;
			} else {
				// select all tr's
				var rows = select(dom, 'tr');
				rows = _.drop(rows, 3);	// remove thead's that are messed with tr's

				// get city name and statistics
				rows.forEach(function(row){
					var cityDom = select(row, 'td.lincol a')[0];
					var tokens = _.words(cityDom.data);	// tokenize
					var selMunicipio = tokens[6] + '*' + _.drop(_.words(tokens), 7).join('@');
					var name = cityDom.children[0].data;

					// get prices
					var tdPrices = select(row, 'td');
					tdPrices = _.drop(tdPrices, 2);	// remove city name and gas stations visited

					var cnt = 0;	// keep track of td's order

					// create an empty consumerPrice object
					var consumerPrice = {
						averagePrice: null,
						standardDeviation: null,
						minPrice: null,
						maxPrice: null,
						averageMargin: null
					};

					// iterate over consumerPrice and tds (cnt)
					_.forEach(consumerPrice, function(item, key){
						consumerPrice[key] = tdPrices[cnt++].children[0].data.replace(',', '.');
					});

					// create an empty distributionPrice object
					var distributionPrice = {
						averagePrice: null,
						standardDeviation: null,
						minPrice: null,
						maxPrice: null
					};

					// iterate over distributionPrice and tds (cnt)
					_.forEach(distributionPrice, function(item, key){
						distributionPrice[key] = tdPrices[cnt++].children[0].data.replace(',', '.');
					});

					// push the city found
					cities.push({
						name: name,
						selMunicipio: selMunicipio,
						consumerPrice: consumerPrice,
						distributionPrice: distributionPrice
					});
				});
				
			}
		}, { verbose: true, ignoreWhitespace: true });

		// call html parser...
		var parser = new htmlparser.Parser(handler);
		parser.parseComplete(body.toString());

		// return promises to chain
		if(error){
			debugError(error);
			return Promise.reject(error);	// booble up an error to promise chain
		}else{
			
			// save states
			var allCitiesInsertions = [];

			States.findOne({ selEstado: params.selEstado })
				.then(function(state){
					cities.forEach(function(city){
						allCitiesInsertions.push(
							Cities.findOne({ name: city.name })
								.then(function(cityFound){
									if(!cityFound){
										var newCity = new Citys(state);
										return newCity.save();
									}else{

									}
								}).catch(function(err){
									console.error(err);
								})
						);
					});
				})
			
			
			// sync all state insertions
			return allStateInsertions.all(function(){
				debugCrawl([params.dates, states, fuels]);
				return Promise.resolve([params, states, fuels]);	// spread initialparams	
			});





			debugCrawl(crawlResumePerStateCity.displayName,cities);
			return Promise.resolve([params,cities]);	// spread initialparams
		}

	}).catch(function(error) {
		console.log(error);
	});
};

crawlResumePerStateCity.displayName = 'crawlResumePerStateCity';


/**
 * [crawlStations description]
 * @return {[type]} [description]
 */
var crawlWeeklyGasStation = function(params, city){
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Semanal_Posto.asp',
		method: 'POST',
		encoding: 'binary',
		form: {
			'cod_semana': params.cod_semana,
			'cod_combustivel': params.cod_combustivel,
			'selMunicipio': city.selMunicipio
		}
	}).then(function(body) {
		var error;
		var stations = [];

		//now we have the whole body, parse it and select the nodes we want...
		var handler = new htmlparser.DefaultHandler(function(err, dom) {
			if (err) {
				error = err;
			} else {
				
				// select all rows from prices' tables
				var rows = select(dom, 'div.multi_box3 table.table_padrao tr');
				rows = _.drop(rows, 1);

				rows.forEach(function(row){
					var col = select(row, 'td');
					var info = {
						name: null,		// col 0: Razao Social
						address: null,	// col 1: Endereco
						area: null,		// col 2: Bairro
						flag: null		// col 3: Bandeira
					}
					
					var cnt = 0;

					_.forEach(info,function(item, key){
						if(key === 'area') info[key] = col[cnt++].children[0].children[0].data;
						else info[key] = col[cnt++].children[0].data;
					});

					var prices = {
						sellPrice: null,
						buyPrice: null,
						saleMode: null,
						provider: null,
						date: null
					}

					_.forEach(prices,function(item, key){
						prices[key] = col[cnt++].children[0].data;
					});

					info.prices = [prices];
					info.type = params.cod_combustivel;
					stations.push(info);
				});
			}
		});

		var parser = new htmlparser.Parser(handler);
		parser.parseComplete(body.toString());

		// return promises to chain
		if(error){
			debugError(error);
			return Promise.reject(error);	// booble up an error to promise chain
		}else{
			debugCrawl(stations);
			return Promise.resolve(stations);	// spread initialparams
		}

	}).catch(function(error) {
		console.log(error.stack);
	});
};

// crawlWeeklyGasStation.displayName = 'crawlWeeklyGasStation';

// crawlSemanalPosto({cod_semana: '851', cod_combustivel: '487'}, {selMunicipio:'6*CRUZEIRO@DO@SUL'});

// crawlInitialParams();
// .spread(function(params, states, fuels){
// 	var allStates = [];
// 	_.forEach(states, function(state, key){
// 		_.forEach(fuels, function(fuel,key){
// 			allStates.push(crawlResumePerStateCity(params, states, fuel));
// 		});
// 	});
// 	return allStates;
// }).each(function(rtn){
// 	console.log(rtn);
// });

//module.exports = crawlState;
