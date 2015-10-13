var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');

// router to create citie routes...
var router = require('express').Router();

/**
 * [getAll get all cities]
 * @param  {[Object]} req [request]
 * @param  {[Object]} res [response]
 * @return {[Response<json>]}     [json with all data]
 */
var getAll = function getAll(req, res){
	db.models.Cities.find({})
		.then(function(cities){
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
var getByName = function getByName (req, res){
	if(!req.params.name) return res.status(404).send('not found')
	db.models.Cities.aggregate([
		{ $match: { name: req.params.name } },
		{ $group: { _id: '$name', statistics: { $push: '$statistics' } , dates: { $last: '$dates' } } },
	], function(err, cities){
		if(err) return console.log(err);
		return res.json(cities);
	})
};

router.get( '/:name', getByName);

module.exports = router;