'use strict';

var mongo = require('mongodb').MongoClient;

module.exports.init = function (url, callback) {
    mongo.connect(url, function (err, db) {
        module.exports.db = db;
        callback(err);
    });
};