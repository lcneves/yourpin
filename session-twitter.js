'use strict';

var SESSION_KEY,
    TWITTER_CONSUMER_KEY,
    TWITTER_CONSUMER_SECRET,
    CALLBACK_URL,
    
    passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    session = require('express-session'),
    express = require('express'),
    router = express.Router();
    
    // Testing requirements
var util = require('util');

// Router config: get session key and Twitter API parameters from main app

module.exports.init = function(sessionKey, twitterConsumerKey, twitterConsumerSecret, isProduction) {
    SESSION_KEY = sessionKey;
    TWITTER_CONSUMER_KEY = twitterConsumerKey;
    TWITTER_CONSUMER_SECRET = twitterConsumerSecret;
    CALLBACK_URL = isProduction ? "https://yourbar.herokuapp.com/session/twitter/callback" : "http://localhost:8080/session/twitter/callback";
    module.exports.router = router;
    
    router.use(session({
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
        },
        secret: SESSION_KEY
    }));
    router.use(passport.initialize());
    router.use(passport.session());

    // Passport config

    passport.use(new TwitterStrategy({
        consumerKey: TWITTER_CONSUMER_KEY,
        consumerSecret: TWITTER_CONSUMER_SECRET,
        callbackURL: CALLBACK_URL
    }, function(token, tokenSecret, profile, done) {
        console.log(util.inspect(profile));
        return done(null, profile);
    }));

    passport.serializeUser(function(user, done) {
        done(null, user);
    });

    passport.deserializeUser(function(obj, done) {
        done(null, obj);
    });

    // Routing begins here
    
    router.get('/twitter', passport.authenticate('twitter'));

    router.get('/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/' }), function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
    });
    
    router.post('/login', function (req, res) {
        passport.authenticate('local', function (err, user, info) {
            if (err) {
                res.status(500).send(err);
                console.log(err);
                return err;
            }
            if (user) {
                req.logIn(user, function() {
                    res.status(200).send(user);
                });
            }
            else if (info) {
                res.send(info);
            }
        })(req, res);
    });

    router.post('/check', function (req, res) {
        if (req.user) {
            res.send(req.user);
        } else {
            res.send(false);
        }
    });

    router.post('/logout', function (req, res) {
        req.logout();
        res.send('Logout');
    });

};