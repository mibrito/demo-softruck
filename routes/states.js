/*
 * File that contains the endpoint to get states info.
 */

var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');
var ObjectId = db.ObjectId;

// router to create citie routes...
var router = require('express').Router();

/*
 * Get an array of all states
 */
var getAll = function getAll(req, res){
	db.models.States.find({})
		.sort('name')
		.then(function(states){
			return res.json(states);
		});
}
router.get('', getAll);

/*
 * Get an array of states by name
 */
var getByName = function getByName (req, res){
	if(!req.params.name) return req.status(404).send('Not Found');
	db.models.States.find({ name: req.params.name })
		.sort('-date.to')
		.limit(27)
		.then(function(states){
			res.json(states);
		})
};

router.get('/name/:name', getByName);

/*
 * Get a state by id
 */
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