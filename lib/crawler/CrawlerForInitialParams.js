// util libs
var _ = require('lodash');
var Promise = require('bluebird');

// http requests and DOM selection
var request = Promise.promisify(require('request'));
// var request = require('request');
var cheerio = require('cheerio');


// debug
var debug = require('debug');
var debugMin = debug('crawler:min:CrawlerForInitialParams');
var debugExtra = debug('crawler:extra:CrawlerForInitialParams');
var debugError = debug('app:error');

// db
var db = require('../db');
var States = db.models.States;

/**
 * [CrawlerForInitialParams constructor for a new initial's parameters crawler]
 */
var CrawlerForInitialParams = function() {
	this.selSemana = null;	// (id*De fromDate a toDate)::String
	this.dates = {};		// { from: DateString, to: DateString }
	this.statesRefs = {};		// {selEstado: { name: String, selEstado: String }}
	this.fuelsRefs = {};		// {selCombustivel: { type: String, selCombustivel: (id*type)::String}}

	this.error = null;	// if errors occure

};

/**
 * [parser parse initial values found on http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp]
 * @param  {[type]} body [description]
 * @return {[type]}      [description]
 */
CrawlerForInitialParams.prototype.parser = function(body){
	var $ = cheerio.load(body);

	this.selSemana = $('input[name="selSemana"]')[0].attribs.value;

	// get dates from desc_semana
	var dates = $('input[name="desc_Semana"]')[0]
		.attribs
		.value					// desc_semana value
		.replace('de ', '')		// remove initial 'de '
		.split(' a ');			// split using ' a '


	// get dates
	this.dates = {
		from: new Date(dates[0]),
		to: new Date(dates[0])
	}

	self = this;

	// get all states
	var allPromisesStates = _.map($('select[name=selEstado] option'), function(state){
		var selEstado = state.attribs.value;

		self.statesRefs[selEstado] = {
			name: state.children[0].data,
			selEstado: selEstado
		};

		// return States.findOne(self.statesRefs[selEstado])
		// 	.then(function(stateFound){
		// 		if(!stateFound){
		// 			var newState = new States(self.statesRefs[selEstado]);
		// 			return newState.save();
		// 		}else{
		// 			return Promise.resolve(stateFound);
		// 		}
		// 	}).then(function(stateRef){

		// 		// update statesRefs values with full object inserted or retrived
		// 		return self.statesRefs[selEstado] = stateRef;
		// 	});
	});


	// get all fuels
	_.forEach($('select[name=selCombustivel] option'), function(fuel){
		var selCombustivel = fuel.attribs.value;

		this.fuelsRefs[selCombustivel] = {
			fuelType: fuel.children[0].data,
			selCombustivel: selCombustivel
		};
	}.bind(this));

	return Promise.all(allPromisesStates);
} 


/**
 * [crawl get the initial params required to start a full crawl]
 * @return {[Promise<Array(params, states, fuels)>]} [description]
 */
CrawlerForInitialParams.prototype.crawl = function(){
	
	debugMin('Started');
	return Promise.delay(1000).then(function(){
		return request({
			url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
			method: 'get',
			encoding: 'binary'
		})
	}).bind(this).then(function(body){
		return this.parser(body.toString());
	}).then(function(){
		// need to update self.statesRefs objects
		
		if(this.error){
			debugError(this.error);
			return Promise.reject(this.error);	// booble up an error to promise chain
		}else{
			debugExtra([this.selSemana, this.dates, this.statesRefs, this.fuelsRefs]);
			return Promise.resolve([this.selSemana, this.dates, this.statesRefs, this.fuelsRefs]);	// spread initialparams	
		}
	}).catch(function(err){
		debugError(err);
	});
};



// var crawlerForInitialParams = new CrawlerForInitialParams();

// db.connect(function(){
// crawlerForInitialParams.crawl();
// })



module.exports = CrawlerForInitialParams;