(function() {
    var app = angular.module('loginModule', []);
    app.factory('loginStatus', function() {
        var service = {};
        service.getLogin = function() {
            return jQuery.post("session/check", function(data) {
                hasCheckedLogin = true;
                service.data = data;
                return service.data;
            });
        };
        return service;
    });

    app.controller('StatusController', ['$scope', 'loginStatus', function($scope, loginStatus) {
        // This controller uses $emit to send login info to the main app controller, that should be the parent scope.
        // It also uses $broadcast to send info to the children controllers, such as SettingsController.
        $scope.receivedLogin = false;
        $scope.getLogin = function() {
            loginStatus.getLogin().then(function() {
                $scope.$emit('received', true)
                $scope.receivedLogin = true;
                if (loginStatus.data) {
                    $scope.$emit('user', loginStatus.data);
                    $scope.$broadcast('user', loginStatus.data);
                    $scope.user = loginStatus.data;
                    $scope.isLogged = true;
                } else {
                    $scope.$emit('user', false);
                    $scope.user = loginStatus.data;
                    $scope.isLogged = false;
                }
                $scope.$apply();
            });
        };
        $scope.getLogin();

        // Check if we're inside an iframe, because we need to get out to login with Twitter
        // Source: http://stackoverflow.com/questions/326069/how-to-identify-if-a-webpage-is-being-loaded-inside-an-iframe-or-directly-into-t
        $scope.isIframe = function () {
          try {
              return window.self !== window.top;
          } catch (e) {
              return true;
          }
        };
    }]);

    app.controller('RegisterController', ['$scope', function($scope) {

        $scope.message = "";
        $scope.register = function() {
            if (!$scope.isLoading) {
                $scope.isLoading = true;
                var enteredUser = JSON.parse(JSON.stringify($scope.user));
                jQuery.post("session/register", enteredUser, function(data) {
                    $scope.isLoading = false;
                    if (data === true) {
                        jQuery.post("session/login", enteredUser, function(data) {
                            $scope.$parent.getLogin();
                        });
                    } else {
                        $scope.message = data;
                        $scope.user.password = '';
                        $scope.user.passwordRepeat = '';
                        $scope.$apply();
                    }
                });
            }
        };
    }]);

    app.controller('LoginController', ['$scope', function($scope) {
        $scope.user = {
            username: '',
            password: ''
        };
        $scope.message = "";
        $scope.login = function() {
            if (!$scope.isLoading) {
                $scope.isLoading = true;
                jQuery.post("session/login", $scope.user, function(data) {
                    $scope.isLoading = false;
                    $scope.user.password = '';
                    if (data.message) {
                        $scope.message = data.message;
                        $scope.$apply();
                    } else {
                        $scope.$parent.getLogin();
                    }
                });
            }
        };
    }]);

    app.controller('LogoutController', ['$scope', function($scope) {
        $scope.logout = function() {
            if (!$scope.isLoading) {
                $scope.isLoading = true;
                jQuery.post("session/logout", function(data) {
                    $scope.isLoading = false;
                    $scope.$parent.getLogin();
                });
            }
        };
    }]);

    app.controller('SettingsController', ['$scope', function($scope) {
        // Update form fields upon receiving login information
        $scope.$on('user', function(event, data){
            if (data) {
                $scope.new = {
                    newPassword: '',
                    passwordRepeat: '',
                    realname: data.realname,
                    country: data.country,
                    state: data.state,
                    city: data.city,
                    currentPassword: ''
                };
            }
        });
        $scope.update = function(newUserData) {
            if (!$scope.isLoading) {
                $scope.isLoading = true;
                jQuery.post("session/update", newUserData, function(data) {
                    $scope.isLoading = false;
                    if (data.error) {
                        $scope.errorStatus = "error";
                        $scope.errorMessage = data.message;
                        $scope.$apply();
                    } else {
                        $scope.errorStatus = "success";
                        $scope.$parent.getLogin();
                    }
                });
            }
        };
    }]);
})();
