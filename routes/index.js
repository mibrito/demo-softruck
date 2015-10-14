var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');
var Cities = db.models.Cities;
var States = db.models.States;

// router to create citie routes...
var router = require('express').Router();

var getAll = function getAll (req, res){
	Cities.find({ }) //
		.sort('state')
		.populate('state', 'name dates')
		.populate('stations')
		.then(function(cities){
			res.render('index', {
				cities: cities
			});
		});	
}

router.get('', getAll);

module.exports = router;