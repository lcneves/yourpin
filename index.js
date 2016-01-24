'use strict';

var PORT = process.env.PORT || 8080,
    SESSION_KEY = process.env.SESSION_KEY,
    DB_URL = process.env.DB_URL,
    mongoHelper = require('./mongo-helper.js'),
    librariesCollection,
    tradesCollection,
    objectID=require('mongodb').ObjectID,
    mySession = require('./session.js'),
    bodyparser = require('body-parser'),
    https = require('https'),
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
mySession.init(SESSION_KEY);
app.use('/session', mySession.router);

// Serve static HTML and JS files from the "public" dir.
app.use(express.static('public'));

// List all books in all users' collections
app.post('/list-all-books', function (req, res) {
    librariesCollection.find({}).toArray(function(err, data) {
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

// List books of user's personal collection
app.post('/list-personal-collection', function (req, res) {
    var userID = req.session.passport ? objectID(req.session.passport.user) : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Not logged in"
        });
    }
    librariesCollection.find({ owner: userID }).toArray(function(err, data) {
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

// Listen to book query and get JSON at Open Library
app.post('/search-book', function (req, res) {
    var title = typeof(req.body.title) == "string" ? req.body.title.toLowerCase().trim().split(' ').join('+') : false,
        author = typeof(req.body.author) == "string" ? req.body.author.toLowerCase().trim().split(' ').join('+') : false;
    // Check if at least one field has been informed
    if (!title && !author) {
        return res.send({
            error: true,
            message: "Please fill in at least one field"
        });
    }
    // Make https query string to the Open Library search API
    var queryString = 'https://openlibrary.org/search.json?';
    if (title) {
        queryString += 'title=' + title;
        if (author) { queryString += '&' }
    }
    if (author) {
        queryString += 'author=' + author;
    }
    // Call Open Library search API and get the results as JSON
    var request = https.get(queryString, function(httpResponse) {
        var body = '';
        httpResponse.on('data', function(chunk) {
            body += chunk;
        }).on('end', function() {
            var data;
            try {
                data = JSON.parse(body);
            }
            catch(e) {
                return res.send({
                    error: true,
                    message: "Invalid results. Sorry!"
                });
            }
            var resultsArray = [];
            if (data.docs && data.docs.length > 0) {
                // Let's limit results to 12.
                var limit = data.docs.length < 12 ? data.docs.length : 12;
                var placeholderCover = (req.secure ? 'https://' : 'http://') + req.headers.host + '/img/cover-placeholder.png';
                for (var i = 0; i < limit; i++) {
                    resultsArray.push({
                        title: data.docs[i].title ? data.docs[i].title : "N/A",
                        authors: data.docs[i].author_name ? data.docs[i].author_name.join(', ') : "N/A",
                        cover: data.docs[i].cover_edition_key ? 'http://covers.openlibrary.org/b/olid/' + data.docs[i].cover_edition_key + '-M.jpg' : placeholderCover
                    });
                }
                res.send({
                    error: false,
                    data: resultsArray
                });
            } else {
                return res.send({
                    error: true,
                    message: "No results found"
                });
            }
        });
    });
    request.on('error', function(err) {
        return res.send({
            error: true,
            message: err
        });
    });
});

// Function to add a book to user's collection
app.post('/add-book', function (req, res) {
    var userID = req.session.passport ? objectID(req.session.passport.user) : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Not logged in"
        });
    }
    var bookObject = JSON.parse(JSON.stringify(req.body));
    delete bookObject['$$hashKey'];
    bookObject.owner = userID;
    librariesCollection.insert(bookObject, function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        res.send({
            error: false,
            message: "Book added to collection"
        });
    });
});

// Function to undo the above
app.post('/remove-book', function (req, res) {
    var userID = req.session.passport ? objectID(req.session.passport.user) : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Not logged in"
        });
    }
    var bookObject = JSON.parse(JSON.stringify(req.body));
    if (userID != bookObject.owner) {
        return res.send({
            error: true,
            message: "User does not own the book"
        });
    }
    var bookID = objectID(bookObject._id);
    librariesCollection.remove({ _id: bookID }, { justOne: true }, function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        res.send({
            error: false,
            message: "Book removed from collection"
        });
    });
});

app.post('/list-trades', function(req, res) {
    var userID = req.session.passport ? req.session.passport.user : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Not logged in"
        });
    }
    // Parallel DB find functions to return two arrays: the proposals made by the user and the ones received by them
    var results = {
        sentProposals: false,
        receivedProposals: false
    };
    var sendResults = function() {
        res.send({
            error: false,
            data: results
        });
    };
    tradesCollection.find({
        "myBook.owner": userID
    }).toArray(function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        results.sentProposals = data;
        if (results.receivedProposals) { sendResults(); }
    });
    tradesCollection.find({
        "desiredBook.owner": userID
    }).toArray(function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        results.receivedProposals = data;
        if (results.sentProposals) { sendResults(); }
    });
});

app.post('/propose-trade', function (req, res) {
    var userID = req.session.passport ? objectID(req.session.passport.user) : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Not logged in"
        });
    }
    var data = JSON.parse(req.body.data);
    var myBookObject = data.myBook;
    if (userID != myBookObject.owner) {
        return res.send({
            error: true,
            message: "User does not own the book"
        });
    }
    var desiredBookObject = data.desiredBook;
    if (myBookObject && desiredBookObject) {
        delete myBookObject['$$hashKey'];
        delete desiredBookObject['$$hashKey'];
        var insertObject = {
            myBook: myBookObject,
            desiredBook: desiredBookObject,
            status: "proposed"
        };
        tradesCollection.insert(insertObject, function(err, data) {
            if (err) {
                res.send({
                    error: true,
                    message: "Database error, sorry!"
                });
                return console.log(err);
            }
            res.send({
                error: false,
                message: "Trade successfully registered!"
            });
        });
    } else {
        return res.send({
            error: true,
            message: "Books have not been specified." // Have you tampered with the script?
        });
    }
});

// Function to undo the above
app.post('/remove-trade', function (req, res) {
    var userID = req.session.passport ? objectID(req.session.passport.user) : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Not logged in"
        });
    }
    var tradeObject = JSON.parse(JSON.stringify(req.body));
    if (userID != tradeObject["myBook[owner]"]) {
        return res.send({
            error: true,
            message: "User does not own the book"
        });
    }
    var tradeID = objectID(tradeObject._id);
    tradesCollection.remove({ _id: tradeID }, { justOne: true }, function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        res.send({
            error: false,
            message: "Trade removed from collection"
        });
    });
});

// Function to handle answers to trade proposals
app.post('/answer-trade', function (req, res) {
    var userID = req.session.passport ? req.session.passport.user : false;
    if (!userID) {
        return res.send({
            error: true,
            message: "Not logged in"
        });
    }
    if (userID != req.body["trade[desiredBook][owner]"]) {
        return res.send({
            error: true,
            message: "User does not own the book"
        });
    }
    var tradeID = objectID(req.body["trade[_id]"]);
    var tradeStatus = req.body.answer == 'accept' ? "accepted" : "refused";
    tradesCollection.update({ _id: tradeID }, { $set: {
        status: tradeStatus
    }}, function(err, data) {
        if (err) {
            res.send({
                error: true,
                message: "Database error, sorry!"
            });
            return console.log(err);
        }
        res.send({
            error: false,
            message: "Trade status updated to " + tradeStatus
        });
    });
});

// Connect to DB and, if successful, start listening to connections
mongoHelper.init(DB_URL, function (error) {
    librariesCollection = mongoHelper.db.collection('libraries');
    tradesCollection = mongoHelper.db.collection('trades');
    if (error) { throw error; }
    console.log('Start listening on port ' + PORT);
    app.listen(PORT);
});
