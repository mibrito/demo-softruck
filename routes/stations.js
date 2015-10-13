var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');

// router to create citie routes...
var router = require('express').Router();

/**
 * [getByName get cities by name]
 * @param  {[Object]} req [request]
 * @param  {[Object]} res [response]
 * @return {[Response<json>]}     [json with all data]
 */
var getByName = function getByName(req, res) {
	// db.models.Stations.find({city: req.params.name})
	// 	.then(function(stations){
	// 		res.json(stations);
	// 	});
	db.models.Stations.aggregate([{
		$match: {
			city: req.params.name
		}
	}, {
		$group: {
			_id: '$city',
			prices: {
				$push: '$prices'
			}
		}
	}], function(_err, stations){
		console.log(stations);
		if (_err) return console.log(_err);
		// city.stations = stations;
		return res.json(stations);
	});
};

router.get('/:name', getByName);
module.exports = router;