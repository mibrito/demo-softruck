var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');
var ObjectId = db.ObjectId;

// router to create citie routes...
var router = require('express').Router();

/**
 * [getAll get all states]
 * @param  {[Object]} req [request]
 * @param  {[Object]} res [response]
 * @return {[Response<json>]}     [json with all data]
 */
var getAll = function getAll(req, res){
	db.models.States.find({})
		.sort('name')
		.then(function(states){
			return res.json(states);
		});
}
router.get('', getAll);

var getByName = function getByName (req, res){
	if(!req.params.name) return req.status(404).send('Not Found');
	db.models.States.find({ name: req.params.name })
		.then(function(states){
			res.json(states);
		})
};

router.get('/name/:name', getByName);

var getById = function getById (req, res){
	
	if(!req.params.id) return req.status(404).send('Not Found');
	db.models.States.findById(ObjectId(req.params.id))
		.sort('name')
		.populate('cities')
		.then(function(states){
			res.json(states);
		})
};

router.get('/id/:id', getById);

module.exports = router;