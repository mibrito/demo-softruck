var _ = require('lodash');
var reqwest = require('reqwest');
var select = require('soupselect').select;
var htmlparser = require('htmlparser');


var config = require('./config/crawler');

var crawlStatistics = function (){
	return reqwest({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Municipio.asp',
		method: 'post',
		data: {
			'selSemana': '850*',
			'selCombustivel': '487*Gasolina',
			'selEstado': config.estado[0]
		}
	}).then(function(body) {

		//now we have the whole body, parse it and select the nodes we want...
		var handler = new htmlparser.DefaultHandler(function(err, dom) {
			if (err) {
				console.error(err);
			} else {

				// soupselect happening here...
				var tr = select(dom, 'tr');

				tr = _.drop(tr, 3);

				var el = {};

				tr.forEach(function(values) {
					values.children.forEach(function(td){
						el = td.children[0]
						if(el.type === 'tag'){
							console.log(el.raw.replace("a class=linkpadrao href=javascript:Direciona", '').replace(/(\(|\)|'|;)/g, ''));
						}else{
							console.log(el.data);
						}
					})
				})
			}
		}, { verbose: true, ignoreWhitespace: true });

		var parser = new htmlparser.Parser(handler);
		parser.parseComplete(body);

	}).catch(function(error) {
		console.log(error);
	});
}

crawlStatistics.displayName = 'crawlStatistics';

// crawlState();


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
}

crawlStations.displayName = 'crawlStations';

crawlStations('851', '487', '6*CRUZEIRO@DO@SUL');

//module.exports = crawlState;