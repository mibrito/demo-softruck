var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');
var ObjectId = db.ObjectId;

// router to create citie routes...
var router = require('express').Router();

/**
 * [getAll get all cities]
 * @param  {[Object]} req [request]
 * @param  {[Object]} res [response]
 * @return {[Response<json>]}     [json with all data]
 */
var getAll = function getAll(req, res) {
	db.models.Cities.find({})
		.then(function(cities) {
			return res.json(cities);
		})
}
router.get('/', getAll);

/**
 * [getByName get cities by name]
 * @param  {[Object]} req [request]
 * @param  {[Object]} res [response]
 * @return {[Response<json>]}     [json with all data]
 */
var getByName = function getByName(req, res) {
	if (!req.params.name) return res.status(404).send('not found');
	db.models.Cities.find({name: req.params.name})
		.populate({ path: 'state', select: 'name' })
		.populate('stations')
		.then(function(cities){
			res.json(cities);
		});
};

router.get('/name/:name', getByName);

var getById = function getById (req, res){
	
	if(!req.params.id) return req.status(404).send('Not Found');
	db.models.Cities.findById(ObjectId(req.params.id))
		.sort('name')
		.populate('stations', 'name prices')
		.then(function(stations){
			res.json(stations);
		})
};

router.get('/id/:id', getById);

module.exports = router;