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

// Connect to DB and, if successful, start listening to connections
mongoHelper.init(DB_URL, function (error) {
    collection = mongoHelper.db.collection('pins');
    if (error) { throw error; }
    console.log('Start listening on port ' + PORT);
    app.listen(PORT);
});
