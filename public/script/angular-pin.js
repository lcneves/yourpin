(function() {
    var app = angular.module('pinModule', ['loginModule']);
    

    
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
        
        var addObject = {};
        $scope.submitPicture = function(title, picture) {
            (function($) {
                $.post("add-picture", function(data) {
                    if (data.error) {
                        $scope.addObject.status = "error";
                        $scope.addObject.message = data.message;
                    } else {
                        $scope.addObject.status = "success";
                        $scope.addObject.books = data.data;
                    }
                    $scope.$apply();
                });
            }(jQuery));
        };
        
        // Initialization
        
    }]);
}());