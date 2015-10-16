/**
 * File that contains endpoint for find any objec
 */

var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');
var ObjectId = db.ObjectId;

// router to create citie routes...
var router = require('express').Router();

/*
 * seach for this name on database
 */
var find = function find(req, res){
	if (!req.params.name) return res.status(404).send('not found');

	Promise.props({
		states: db.models.States.find({ name: {$regex: req.params.name, $options: 'i' }})
					.sort('name').populate('cities', 'name _id'),
		cities: db.models.Cities.find({ name: {$regex: req.params.name, $options: 'i' }})
					.sort('name').populate('state', 'name _id').populate('stations', 'name _id'),
		stations: db.models.Stations.find({ name: {$regex: req.params.name, $options: 'i' }})
					.sort('name').populate('city', 'name _id state')
	}).then(function(cities){
		return res.json(cities);
	});
}

router.get('/:name', find);

module.exports = router;