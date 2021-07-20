/*
Routes configuration.
type: Object
keys of Object is domain names in regex.
values of Object keys are:
if type of value is Object, then it's structure is
 {
     name: <string> human readable name of route
     method: required <string> (get|post|put) type of http method, supported by Express.js default is 'use'
     uri: required <string> uri part of request, in Express.js format
     controller: <string> the name of Controller. default is "Default". if variable ":controller" is set in uri, it overrides this setting
     action: <string> the name of action in controller. default is "index". If variable ":action" is set in uri, it overrides this setting
 }
 and it works as "set up route function for Express.js with this parameters"

 if type of value is String, it works as "set up routes for Express.js with both GET & POST methods, using /\/(.*)/ as uri"
 Inside this route, the value is used as root path to controller (RootC),
 and uri treat /part/subpart1/subpart../subpartN as Application.Controller.{RootC}.part.subpart1.{...}.subpartN(), where subpartN of uri is action of controller;
 if value is empty, the Application.Controller is RootC.
 if only /part in uri, it resolves as name of controller with action "index"
 */
module.exports = {
    //for any site, manual setup
    // '.*': [{
    //     name: 'Welcome',
    //     method: 'get',
    //     uri: '/',
    //     controller: 'Welcome'
    // },
    // {
    //     name: 'Api requests',
    //     method: 'post',
    //     uri: '/api/:action?/:arg?',
    //     controller: 'Api',
    //     action: 'noaction'
    // },
    // {
    //     name:'Articles sample route',
    //     method:'get',
    //     uri:'/:controller/:action?', //as in Express.js
    //     action: 'index',//default action
    // }
    // ],
    'otherDomain.ru':"",
    //for localhost, auto routing
    'localhost':""
};
