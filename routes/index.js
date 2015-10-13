var Promise = require('bluebird');
var _ = require('lodash');

var db = require('../lib/db');

// router to create citie routes...
var router = require('express').Router();

var getAll = function getAll (req, res){
	db.models.Cities.aggregate({
		$group: {
			_id: '$state',
			statistics: { $push: '$statistics' },
			dates: { $last: '$dates' }
  		}
	}, function(err, stations) {
        if(err) return console.log(err);
        res.json(stations);
    });
}

router.get('/', getAll);

module.exports = router;