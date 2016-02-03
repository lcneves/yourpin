(function() {
    var app = angular.module('pinModule', ['loginModule', 'masonry']);
    

    
    // Function to replace broken links with a placeholder, including in the preview.
    // Got it from here: http://stackoverflow.com/questions/16310298/if-a-ngsrc-path-resolves-to-a-404-is-there-a-way-to-fallback-to-a-default\
    app.directive('errSrc', function() {
        return {
            link: function(scope, element, attrs) {
                element.bind('error', function() {
                    if (attrs.src != attrs.errSrc) {
                        attrs.$set('src', attrs.errSrc);
                    }
                });
                attrs.$observe('ngSrc', function(value) {
                    if (!value && attrs.errSrc) {
                        attrs.$set('src', attrs.errSrc);
                    }
                });
            }
        }
    });
    
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
                // TODO: Get user's images
            } else {
                $scope.isLogged = false;
                $scope.user = '';
            }
        });
        
        // Begin Your Pin controller logic
        
        // Function that allows an authenticated user to add a picture
        $scope.submitPicture = function(title, picture) {
            $scope.addObject.status = "loading";
            (function($) {
                $.post("add-picture", {title: title, picture: picture}, function(data) {
                    $scope.addObject.title = "";
                    $scope.addObject.link = "";
                    if (data.error) {
                        console.log("Error: " + data.message);
                        $scope.addObject.status = "error";
                        $scope.addObject.message = data.message;
                    } else {
                        $scope.addObject.status = "success";
                        $('#add-modal').modal('hide');
                        reset();
                    }
                    $scope.$apply();
                });
            }(jQuery));
        };
        
        // Function that allows an authenticated user to remove a picture they own
        $scope.removePicture = function(pin) {
            if ($scope.removeObject.status != "loading") {
                $scope.removeObject.status = "loading";
                (function($) {
                    $.post("remove-picture", pin, function(data) {
                        if (data.error) {
                            console.log("Error: " + data.message);
                            $scope.removeObject.status = "error";
                            $scope.removeObject.message = data.message;
                        } else {
                            $scope.removeObject.status = "success";
                            $('#user-pictures-modal').modal('hide');
                            reset();
                        }
                        $scope.$apply();
                    });
                }(jQuery));
            }
        };
        
        // Function to get all pins
        var listAllPictures = function() {
            $scope.listAll.status = "loading";
            jQuery.post("list-all-pictures", function(data) {
                if (data.error) {
                    console.log("Error: " + data.message);
                    $scope.listAll.status = "error";
                    $scope.listAll.message = data.message;
                } else {
                    $scope.listAll.status = "success";
                    if (Array.isArray(data.data)) {
                        var dataArray = [];
                        data.data.forEach(function(element, index, array) {
                            element.date = new Date(element.time).toDateString();
                            dataArray.push(element);
                        });
                        $scope.listAll.pins = dataArray;
                    }
                }
                $scope.$apply();
            });
        };
        
        // Function to get a user's pins
        $scope.listUserPictures = function(user) {
            if ($scope.listUser.status != "loading") {
                $scope.listUser.status = "loading";
                $scope.listUser.realName = user.realName ? user.realName : user.displayName;
                jQuery.post("list-user-pictures", {id: user.id}, function(data) {
                    if (data.error) {
                        console.log("Error: " + data.message);
                        $scope.listUser.status = "error";
                        $scope.listUser.message = data.message;
                    } else {
                        $scope.listUser.status = "success";
                        if (Array.isArray(data.data)) {
                            var dataArray = [];
                            data.data.forEach(function(element, index, array) {
                                element.date = new Date(element.time).toDateString();
                                dataArray.push(element);
                            });
                            $scope.listUser.pins = dataArray;
                        }
                        (function($) { $('#user-pictures-modal').modal('show'); }(jQuery));
                    }
                    $scope.$apply();
                });
            }
        };
        
        // Initialization
        var reset = function() {
            $scope.listAll = {};
            $scope.listUser = {};
            $scope.removeObject = {};
            listAllPictures();
        };
        reset();
    }]);
}());
