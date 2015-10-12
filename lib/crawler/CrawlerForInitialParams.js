// util libs
var _ = require('lodash');
var Promise = require('bluebird');

// http requests and DOM selection
var request = Promise.promisify(require('request'));
var select = require('soupselect').select;
var htmlparser = require('htmlparser');

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
 * [bodyParserHandler generate a handle for HTML dom parse]
 * @return {[DefaultHandler]}
 */
CrawlerForInitialParams.prototype.bodyParserHandler =  function(){

	self = this;

	return new htmlparser.DefaultHandler(function(err, dom){
		if (err) {
			self.error = err;
		} else {
			// get all input DOMs
			var DOMInputs = select(dom, 'input');


			// get selSemana value
			self.selSemana = select(DOMInputs, 'input[name="selSemana"]')[0].attribs.value;
			

			// get dates from desc_semana
			var dates = select(DOMInputs, 'input[name="desc_Semana"]')[0]
				.attribs
				.value					// desc_semana value
				.replace('de ', '')		// remove initial 'de '
				.split(' a ');			// split using ' a '


			// get dates
			self.dates = {
				from: new Date(dates[0]),
				to: new Date(dates[0])
			}


			// get all states
			_.forEach(select(dom, 'select[name=selEstado] option'), function(state){
				var selEstado = state.attribs.value;

				self.statesRefs[selEstado] = {
					name: state.children[0].data,
					selEstado: selEstado
				};
			});


			// get all fuels
			_.forEach(select(dom, 'select[name=selCombustivel] option'), function(fuel){
				var selCombustivel = fuel.attribs.value;

				self.fuelsRefs[selCombustivel] = {
					fuelType: fuel.children[0].data,
					selCombustivel: selCombustivel
				};
			});
		}
	}, { verbose: true, ignoreWhitespace: true });
};



/**
 * [crawl get the initial params required to start a full crawl]
 * @return {[Promise<Array(params, states, fuels)>]} [description]
 */
CrawlerForInitialParams.prototype.crawl = function(){
	
	debugMin('Started');
	return request({
		url: 'http://www.anp.gov.br/preco/prc/Resumo_Por_Estado_Index.asp',
		method: 'get',
		encoding: 'binary'
	}).then(function(body){
		// parse body
		var parser = new htmlparser.Parser(this.bodyParserHandler());
		parser.parseComplete(body.toString());

		self = this;

		// insert stateRefs on mongo
		var allPromises = _.map(self.statesRefs, function(state, key){
			return States.findOne(state)
				.then(function(stateFound){
					if(!stateFound){
						var newState = new States(self.statesRefs[selEstado]);
						return newState.save();
					}else{
						return Promise.resolve(stateFound);
					}
				}).then(function(stateRef){
					self.statesRefs[key] = stateRef;
					return Promise.resolve(stateRef);
				});
		});

		// need to update self.statesRefs objects
		return Promise.all(allPromises).then(function(){
			if(self.error){
				debugError(self.error);
				return Promise.reject(self.error);	// booble up an error to promise chain
			}else{
				debugExtra([self.selSemana, self.dates, self.statesRefs, self.fuelsRefs]);
				return Promise.resolve([self.selSemana, self.dates, self.statesRefs, self.fuelsRefs]);	// spread initialparams	
			}
		});
	}.bind(this));
};



// var crawlerForInitialParams = new CrawlerForInitialParams();

// crawlerForInitialParams.crawl();



module.exports = CrawlerForInitialParams;