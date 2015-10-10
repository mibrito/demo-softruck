var _ = require('lodash');
var reqwest = require('reqwest');

var select = require('soupselect').select;
var htmlparser = require('htmlparser');

var debug = require('debug')('crawler');

// get the initial params required to start a full crawl
var crawlInitialParams = function () {
	return reqwest({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
		method: 'get',
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

				// states
				_.forEach(select(dom, 'select[name=selEstado] option'), function(estado){
					states.push({
						selEstado: estado.attribs.value,
						name: estado.children[0].data
					});
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
		parser.parseComplete(body);

		if(error){
			debug(error);
			return Promise.reject(error);	// booble up an error to promise chain
		}else{
			debug([params, states, fuels]);
			return Promise.resolve([params, states, fuels]);	// spread initialparams
		}
	});
};

// Crawl all cities and its statistics from a brazilian state
var crawlResumePerState = function (params, state, fuel){
	return reqwest({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
		method: 'post',
		data: {
			'selSemana': params.selSemana,
			'selCombustivel': fuel.selCombustivel,
			'selEstado': state.selEstado
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
		parser.parseComplete(body);

		debug(cities);

		// return promises to chain
		if(error){
			debug(error);
			return Promise.reject(error);	// booble up an error to promise chain
		}else{
			debug(cities);
			return Promise.resolve(cities);	// spread initialparams
		}

	}).catch(function(error) {
		console.log(error);
	});
};

crawlResumePerState.displayName = 'crawlStatistics';

crawlResumePerState({selSemana: '851*De 04/10/2015 a 10/10/2015'}, {selEstado: 'AC*ACRE'}, {selCombustivel: '487*Gasolina'});


/**
 * [crawlStations description]
 * @return {[type]} [description]
 */
var crawlStations = function(cod_semana, cod_combustivel, selMunicipio){
	return reqwest({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Semanal_Posto.asp',
		method: 'post',
		data: {
			'cod_semana': cod_semana,
			'cod_combustivel': cod_combustivel,
			'selMunicipio': selMunicipio
		}
	}).then(function(body) {
		//now we have the whole body, parse it and select the nodes we want...
		var handler = new htmlparser.DefaultHandler(function(err, dom) {
			if (err) {
				console.error(err);
			} else {
				var pricesTemplate = _.clone(config.pricesTemplate);
				var stationTemplate = _.clone(config.stationTemplate);

				// soupselect happening here...
				var tr = select(dom, 'div.multi_box3 table.table_padrao tr');

				tr = _.drop(tr, 1);



				tr.forEach(function(values) {
					pricesTemplate = _.merge(pricesTemplate, config.pricesTemplate);
					stationTemplate = _.merge(stationTemplate, config.stationTemplate);
					stationTemplate.prices = [];
					var cnt = 0;

					values = values.children;

					_.forEach(stationTemplate, function(item, key){
						if(key === 'prices') return;
						if(key === 'area'){
							stationTemplate[key] = values[cnt++].children[0].children[0].data;
						}else{
							stationTemplate[key] = values[cnt++].children[0].data;
						}
					});


					_.forEach(pricesTemplate, function(item, key){

						if(key === 'type'){
							pricesTemplate[key] = config.combustivel[cod_combustivel].name;
						}else {
							var data = values[cnt++].children[0].data;

							if(key === 'date'){
								pricesTemplate[key] = data.replace(/\//g,'-');
							}else{
								pricesTemplate[key] = data.replace(',', '.');
							}
						}
					});

					stationTemplate.prices.push(pricesTemplate);
					console.log(stationTemplate);
				});
			}
		});

		var parser = new htmlparser.Parser(handler);
		parser.parseComplete(body);

	}).catch(function(error) {
		console.log(error);
	});
};

crawlStations.displayName = 'crawlStations';

//crawlStations('851', '487', '6*CRUZEIRO@DO@SUL');

//module.exports = crawlState;
