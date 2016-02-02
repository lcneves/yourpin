'use strict';

var PRODUCTION = process.env.PORT ? true : false,
    PORT = process.env.PORT || 8080,
    SESSION_KEY = process.env.SESSION_KEY,
    DB_URL = process.env.DB_URL,
    TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY,
    TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET,
    mongoHelper = require('./mongo-helper.js'),
    collection,
    objectID = require('mongodb').ObjectID,
    sessionTwitter = require('./session-twitter.js'),
    bodyparser = require('body-parser'),
    session = require('express-session'),
    express = require('express'),
    app = express();
    
    // Testing requirements
var util = require('util');

app.use(bodyparser.urlencoded({extended: false}));

app.use(session({
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
    },
    secret: SESSION_KEY
}));
    
// Route login calls to /session to my session.js.
sessionTwitter.init(SESSION_KEY, TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, PRODUCTION);
app.use('/session', sessionTwitter.router);

// Serve static HTML and JS files from the "public" dir.
app.use(express.static('public'));

// Start Your Pin logic

// Function to add new pictures to user's collection
app.post('/add-picture', function (req, res) {
    var userID = req.session.passport ? objectID(req.session.passport.user) : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Not logged in"
        });
    }
    // var userRealName = TODO: add user's realname.
    var addObject = JSON.parse(JSON.stringify(req.body));
    delete addObject['$$hashKey'];
    addObject.owner = {
        id: userID,
        realName: userRealName
    };
    addObject.time = Date.now();
    collection.insert(addObject, function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        res.send({
            error: false,
            message: "Picture added to collection"
        });
    });
});

// Function to undo the above
app.post('/remove-picture', function (req, res) {
    var userID = req.session.passport ? objectID(req.session.passport.user) : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Not logged in"
        });
    }
    var removeObject = JSON.parse(JSON.stringify(req.body));
    if (userID != removeObject.owner.id) {
        return res.send({
            error: true,
            message: "User does not own the book"
        });
    }
    var removeID = objectID(removeObject.owner.id);
    librariesCollection.remove({ _id: removeID }, { justOne: true }, function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        res.send({
            error: false,
            message: "Picture removed from collection"
        });
    });
});

// Retrieves newest pictures by all users
var MAX_RESULTS = 30;
app.post('/list-all-pictures', function (req, res) {
    collection.find({}).sort({time: -1}).limit(MAX_RESULTS).toArray(function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        res.send({
            error: false,
            data: data
        });
    });
});

// Retrieves all pictures owned by a user
app.post('/list-user-pictures', function (req, res) {
    var userID = req.body.userID ? objectID(req.body.userID) : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Invalid query"
        });
    }
    collection.find({owner[id]: userID}).sort({time: -1}).limit(MAX_RESULTS).toArray(function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        res.send({
            error: false,
            data: data
        });
    });
});

// Connect to DB and, if successful, start listening to connections
mongoHelper.init(DB_URL, function (error) {
    collection = mongoHelper.db.collection('pins');
    if (error) { throw error; }
    console.log('Start listening on port ' + PORT);
    app.listen(PORT);
});
