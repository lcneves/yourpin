(function() {
    var app = angular.module('bookModule', ['loginModule']);
    app.controller('MainController', ['$scope', 'loginStatus', function($scope, loginStatus) {
        
        // Listen to angular-login.js' $emit info on login
        $scope.receivedLogin = false;
        $scope.$on('received', function(event, data) {
            $scope.receivedLogin = true;
        });
        $scope.$on('user', function(event, data) {
            if (data) {
                $scope.isLogged = true;
                $scope.user = data;
                // Get user's personal book collection and trades
                $scope.listMyCollection();
                $scope.listMyTrades();
            } else {
                $scope.isLogged = false;
                $scope.user = '';
            }
        });
        
        // Begin YourBook controller logic
        
        var desiredBook;
        
        // Controls the navigation tabs behaviour
        $scope.tab = "allBooks";
        
        
        // Function to display all books in all users' collections
        $scope.allBooks = {};
        $scope.listAllBooks = function() {
            if ($scope.allBooks.status != "loading") {
                $scope.allBooks.status = "loading";
                jQuery.post("list-all-books", function(data) {
                    if (data.error) {
                        $scope.allBooks.status = "error";
                        $scope.allBooks.message = data.message;
                    } else {
                        $scope.allBooks.status = "success";
                        $scope.allBooks.books = data.data;
                    }
                    $scope.$apply();
                });
            }
        };
        
        // Function to display books in personal collection
        $scope.myCollection = {};
        $scope.listMyCollection = function() {
            if ($scope.myCollection.status != "loading") {
                $scope.myCollection.status = "loading";
                jQuery.post("list-personal-collection", function(data) {
                    if (data.error) {
                        $scope.myCollection.status = "error";
                        $scope.myCollection.message = data.message;
                    } else {
                        $scope.myCollection.status = "success";
                        $scope.myCollection.books = data.data;
                    }
                    $scope.$apply();
                });
            }
        };
        
        // Function to list all trades that user has proposed or received
        $scope.trades = {};
        $scope.listMyTrades = function() {
            if ($scope.trades.status != "loading") {
                $scope.trades.status = "loading";
                jQuery.post("list-trades", function(data) {
                    if (data.error) {
                        $scope.trades.status = "error";
                        $scope.trades.message = data.message;
                    } else {
                        $scope.trades.status = "success";
                        $scope.trades.results = data.data;
                    }
                    $scope.$apply();
                });
            }
        };
        
        $scope.query = {};
        // Function to query for books to add to collection
        $scope.searchBook = function(bookQuery) {
            if ($scope.query.status != "loading") {
                $scope.query.status = "loading";
                jQuery.post("search-book", bookQuery, function(data) {
                    if (data.error) {
                        $scope.query.status = "error";
                        $scope.query.message = data.message;
                    } else {
                        $scope.query.status = "success";
                        $scope.resultsArray = data.data;
                    }
                    $scope.$apply();
                });
            }
        };
        
        // Function to add a book to user's collection
        $scope.addBook = function(book) {
            $scope.query.status = "adding";
            jQuery.post("add-book", book, function(data) {
                if (data.error) {
                    $scope.query.status = "error";
                    $scope.query.message = data.message;
                    $scope.$apply();
                } else {
                    $scope.listMyCollection();
                }
            });
        };
        
        // Undoes the above
        $scope.removeBook = function(book) {
            jQuery.post("remove-book", book, function(data) {
                if (data.error) {
                    $scope.myCollection.status = "error";
                    $scope.myCollection.message = data.message;
                    $scope.$apply();
                } else {
                    $scope.listMyCollection();
                }
            });
        };
        
        $scope.tradeModal = {};
        // Open trade modal, so user can choose book to trade for the desired one
        $scope.openTradeModal = function(book) {
            desiredBook = book;
            $scope.tradeModal.status = "show";
            (function($) {
                $('#tradeModal').modal('show');
            }(jQuery));
        };
        
        // Closes trade modal and registers the trade in the database
        $scope.trade = function(myBook) {
            $scope.tradeModal.status = "loading";
            var sendJSON = JSON.stringify({
                myBook: myBook,
                desiredBook: desiredBook
            });
            (function($) {
                $.post("propose-trade", {data: sendJSON}, function(data) {
                    if (data.error) {
                        $scope.tradeModal.status = "error";
                    } else {
                        $scope.tradeModal.status = "success";
                    }
                    $scope.tradeModal.message = data.message;
                    $scope.listMyTrades();
                });
            }(jQuery));
        };
        
        // Function to delete a trade that the user has initiated
        $scope.removeTrade = function(trade) {
            jQuery.post("remove-trade", trade, function(data) {
                if (data.error) {
                    $scope.trades.status = "error";
                    $scope.trades.message = data.message;
                    $scope.$apply();
                } else {
                    $scope.listMyTrades();
                }
            });
        };
        
        // Function to refuse or accept a trade
        $scope.answerTrade = function(trade, answer) {
            jQuery.post("answer-trade", {
                trade: trade,
                answer: answer
            }, function(data) {
                if (data.error) {
                    $scope.trades.status = "error";
                    $scope.trades.message = data.message;
                    $scope.$apply();
                } else {
                    $scope.listMyTrades();
                }
            });
        };
        
        // Initialization
        $scope.listAllBooks();
    }]);
}());