// util libs
var _ = require('lodash');
var Promise = require('bluebird');
var sleep = require('sleep');

// http requests and DOM selection
var request = Promise.promisify(require('request'));
var select = require('soupselect').select;
var htmlparser = require('htmlparser');

// debug
var debug = require('debug');
var debugCrawl = debug('crawler:main');
var debugError = debug('app:error');

// db
var db = require('../db');

// crawlers
var CrawlerForInitialParams = require('./CrawlerForInitialParams');
var CrawlerForResumoPorEstadoMunicipio = require('./CrawlerForResumoPorEstadoMunicipio');
var CrawlerForResumoSemanalPosto = require('./CrawlerForResumoSemanalPosto');

// start crawl
var crawler = function () {
	if(!db.readyState()) db.connect(function(){
		var crawlerForInitialParams = new CrawlerForInitialParams();
		
		debugCrawl('crawler started .....');

		return crawlerForInitialParams.crawl()
			.spread(function(selSemana, dates, statesRefs, fuelsRefs){
				var allForResumoPorEstadoMunicipio = [];
				
				_.forEach(statesRefs, function(stateRef){
					_.forEach(fuelsRefs, function(fuelRef){
		
						// var crawlerForResumoPorEstadoMunicipio = new CrawlerForResumoPorEstadoMunicipio(selSemana, dates, statesRefs['AC*ACRE'], fuelsRefs['643*Etanol']);
						var crawlerForResumoPorEstadoMunicipio = new CrawlerForResumoPorEstadoMunicipio(selSemana, dates, stateRef, fuelRef);
						allForResumoPorEstadoMunicipio.push(
							crawlerForResumoPorEstadoMunicipio.crawl()
								.spread(function(selSemana, dates, citiesRefs, fuelRef){
									var allResumoSemanalPosto = [];
									_.forEach(citiesRefs, function(cityRef){
											
										var crawlerResumoSemanalPosto = new CrawlerForResumoSemanalPosto(selSemana, dates, cityRef);
										allResumoSemanalPosto.push(crawlerResumoSemanalPosto.crawl());

									});
									return Promise.all(allResumoSemanalPosto);
								})
						);
					});
				});

				return Promise.all(allForResumoPorEstadoMunicipio);
				// return Promise.resolve();
			}).then(function(rtn){
				debugCrawl('crawler finished .....');
				db.disconnect();
				return Promise.resolve(rtn);
			}).catch(function(err){
				debugError(err);
				return Promise.reject(err);
			});
	});
}

module.exports = crawler();