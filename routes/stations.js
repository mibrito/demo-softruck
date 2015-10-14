var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');
var ObjectId = db.ObjectId;

// router to create citie routes...
var router = require('express').Router();

var getAll = function(req, res){
	db.models.Stations.find()
		.then(function(stations){
			return res.json(stations);
		});
}

router.get('/', getAll);

/**
 * [getByName get cities by name]
 * @param  {[Object]} req [request]
 * @param  {[Object]} res [response]
 * @return {[Response<json>]}     [json with all data]
 */
var getByName = function getByName(req, res) {
	if(!req.params.name) return req.status(404).send('Not Found');
	db.models.Stations.find({ name: req.params.name })
		// .populate('city', 'name statistics')
		.then(function(station){
			return res.json(station);
		})
};

router.get('/name/:name', getByName);

var getById = function getById (req, res){
	
	if(!req.params.id) return req.status(404).send('Not Found');
	db.models.Stations.findById(ObjectId(req.params.id))
		.sort('name')
		.then(function(station){
			console.log(station);
			res.json(station);
		})
};

router.get('/id/:id', getById);

module.exports = router;