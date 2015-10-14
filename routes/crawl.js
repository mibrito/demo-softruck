var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');
var ObjectId = db.ObjectId;

// router to create citie routes...
var router = require('express').Router();

var getDate = function getDate(req, res){
	console.log('cralw')
	db.models.States.find({})
		.sort('name')
		.limit(1)
		.then(function(states){
			console.log(states[0].dates)
			res.json(states[0].dates);
		});
}

router.get('/dates', getDate);

module.exports = router;