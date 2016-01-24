'use strict';

var SESSION_KEY,
    BCRIPT_COST = 8,
    dbConfig = require('./mongo-helper.js'),
    objectID=require('mongodb').ObjectID,
    bcrypt = require('bcrypt'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    bodyparser = require('body-parser'),
    session = require('express-session'),
    express = require('express'),
    router = express.Router();
    
    // Testing requirements
var util = require('util');

// Router config: get session key from main app

module.exports.init = function(key) {
    SESSION_KEY = key;
    module.exports.router = router;
    
    router.use(bodyparser.urlencoded({extended: false}));
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

    passport.use(new LocalStrategy(
        function(username, password, done) {
            var collection = dbConfig.db.collection('users');
            collection.findOne({ username: username }, function(err, user) {
                if (err) { return done(err); }
                if (!user) {
                    return done(null, false, { message: 'Incorrect username.' });
                } else {
                    bcrypt.compare(password, user.password, function(err, res) {
                        if (err) { throw err; }
                        if (res) {
                            return done(null, user);
                        } else {
                            return done(null, false, { message: 'Incorrect password.' });
                        }
                    });
                }
            });
        }
    ));

    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        var collection = dbConfig.db.collection('users');
        collection.findOne({_id: objectID(id)}, function(err, user) {
            if (err) { throw err; }
            if (user) {
                // This is the info that will be available to the client. Use wisely!
                var userInfo = {
                    _id: user._id,
                    username: user.username,
                    realname: user.realname,
                    country: user.country,
                    state: user.state,
                    city: user.city
                }
                done(err, userInfo);
            }
        });
    });

    // Routing begins here
    router.post('/register', function (req, res) {
        var user = req.body.username,
            pass = req.body.password,
            passRepeat = req.body.passwordRepeat;
            
        // Edit the following vars to match your HTML form values
        var name = req.body.realname,
            country = req.body.country,
            state = req.body.state,
            city = req.body.city;

        // Some server-side error checking
        if (!user || user == "") {
            res.send("Username cannot be empty");
            return;
        }
        if (!pass || pass == "") {
            res.send("Password cannot be empty");
            return;
        }
        if (!passRepeat || passRepeat == "") {
            res.send("Please repeat the password");
            return;
        }
        if (!name || name == "") {
            res.send("Please enter your name");
            return;
        }
        if (pass != passRepeat) {
            res.send("Passwords do not match");
            return;
        }
        
        // Errors checked, let's begin the database work by checking if user exists
        var collection = dbConfig.db.collection('users');
        collection.findOne(
            {username: user},
            function(err, document) {
                if (err) { throw err; }
                if (document) {
                    res.send("User " + user + " already exists");
                } else {
                    // User does not exist. Let's create a hash for the provided password!
                    bcrypt.hash(pass, BCRIPT_COST, function(err, hash) {
                        if (err) {
                            throw err;
                        }
                        // Edit userObject to reflect the fields in the HTML form
                        var userObject = {username: user, password: hash, realname: name, country: country, state: state, city: city};
                        // Finally, let's insert the userObject in the 'users' collection of the application database
                        collection.insert(userObject, function(err, data){
                            if (err) {
                                res.send("Server error!");
                                throw err;
                            }
                            res.send(true);
                        });
                    });
                }
            }
        );
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
    
    router.post('/update', function (req, res) {
        var userID = req.user ? req.user._id : false,
            pass = req.body.newPassword ? req.body.newPassword : false,
            passRepeat = req.body.passwordRepeat ? req.body.passwordRepeat : false,
            currentPass = req.body.currentPassword ? req.body.currentPassword : false;
            
        // Edit the following vars to match your HTML form values
        var name = req.body.realname ? req.body.realname : false,
            country = req.body.country ? req.body.country : false,
            state = req.body.state ? req.body.state : false,
            city = req.body.city ? req.body.city : false;

        // Some server-side error checking
        if (!userID) {
            res.send({
                error: true,
                message: "Not logged in"
            });
            return;
        }
        if (!currentPass || currentPass == "") {
            res.send({
                error: true,
                message: "Current password cannot be empty"
            });
            return;
        }
        if (pass != passRepeat) {
            res.send({
                error: true,
                message: "New passwords do not match"
            });
            return;
        }
        
        // Errors checked, let's begin the database work by checking if user exists
        var collection = dbConfig.db.collection('users');
        collection.findOne(
            {_id: objectID(userID)},
            function(err, user) {
                if (err) { throw err; }
                if (user) {
                    // User found, let's check if the current password matches the provided one
                    bcrypt.compare(currentPass, user.password, function(err, bcryptRes) {
                        if (err) { throw err; }
                        if (bcryptRes) {
                            // The user has provided the correct password. Let's update their profile!
                            // Let's deep-copy the old user object retrieved from the DB and update only the fields that have been changed.
                            var newUserObject = JSON.parse(JSON.stringify(user));
                            delete newUserObject._id; // We shouldn't touch the _id in the database
                            if (pass && pass != '') {
                                var salt = bcrypt.genSaltSync(BCRIPT_COST);
                                var hash = bcrypt.hashSync(pass, salt); // Note: using the sync version, because blocking is desirable here
                                newUserObject.password = hash;
                            }
                            if (name && name != '') { newUserObject.realname = name; }
                            if (country && country != '') { newUserObject.country = country; }
                            if (state && state != '') { newUserObject.state = state; }
                            if (city && city != '') { newUserObject.city = city; }
                            collection.update({_id: objectID(userID)}, newUserObject, function(err, data) {
                                if (err) { throw err;}
                                res.send({error: false});
                            });
                        } else {
                            return res.send({
                                error: true,
                                message: 'Incorrect password.'
                            });
                        }
                    });
                } else {
                    // User does not exist. Weird!
                    res.send({
                        error: true,
                        message: "User not found"
                    });
                }
            }
        );
    });

};