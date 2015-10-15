/**
 * File that contains all endpoints for cities requests
 */

var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');
var ObjectId = db.ObjectId;

// router to create citie routes...
var router = require('express').Router();


/*
 * Get an array of all cities from database
 */
var getAll = function getAll(req, res) {
	db.models.Cities.find({})
		.then(function(cities) {
			return res.json(cities);
		})
}

router.get('/', getAll);


/*
 * Get an array of cities by name
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


/*
 * Get a city by its id
 */
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