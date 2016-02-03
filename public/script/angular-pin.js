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
        
        $scope.submitPicture = function(title, picture) {
            $scope.addObject.status = "loading";
            (function($) {
                $.post("add-picture", {title: title, picture: picture}, function(data) {
                    $scope.addObject.title = "";
                    $scope.addObject.link = "";
                    if (data.error) {
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
        
        // Function to get all pins
        var listAllPictures = function($) {
            $scope.listAll.status = "loading";
            $.post("list-all-pictures", function(data) {
                if (data.error) {
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
        
        // Initialization
        var reset = function() {
            $scope.listAll = {};
            listAllPictures(jQuery);
        };
        reset();
    }]);
}());
