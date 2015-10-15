/*
 * File that contains the endpoint to get metadata of database
 */
var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');
var ObjectId = db.ObjectId;

// router to create citie routes...
var router = require('express').Router();

/*
 * Get an object with the dates when the anp research occured
 */
var getDate = function getDate(req, res){
	db.models.States.find({})
		.sort('name')
		.limit(1)
		.then(function(states){
			res.json(states[0].dates);
		});
}

router.get('/dates', getDate);

module.exports = router;