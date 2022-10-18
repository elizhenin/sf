/*
Routes configuration.
type: Object
keys of Object is domain names in regex.
values of Object keys are:
if type of value is Object, then it's structure is
 {
     name: <string> human readable name of route
     method: optional <string> (get|post|put|etc..) type of http method. If set, strict request to this method only
     uri: required <string> uri part of request, in ExpressJS-like format
     controller: <string> the name of Controller. default is "Default". if variable ":controller" is set in uri, it overrides this setting
     action: <string> the name of action in controller. default is "index". If variable ":action" is set in uri, it overrides this setting
 }
 and it works as "set up route function with this parameters"

 if type of value is String, it works as "set up route with any method, using /\/(.*)/ as uri"
 Inside this route, the value is used as root path to controller (RootC),
 and uri treat /part/subpart1/subpart../subpartN as Application.Controller.{RootC}.part.subpart1.{...}.subpartN(), where subpartN of uri is action of controller;
 if value is empty, the Application.Controller is RootC.
 if only /part in uri, it resolves as name of controller with action "index"
 */
module.exports = {
    //for any site, manual setup
    '.*': [{
        name: 'Welcome',
        method: 'get',
        uri: '/',
        controller: 'Welcome'
    },
    {
        name: 'Welcome JS',
        method: 'get',
        uri: '/viewjs',
        controller: 'Welcome',
        action:'viewjs'
    },
    {
        name: 'Api requests',
        method: 'post',
        uri: '/api/:action?/:arg?',
        controller: 'Api',
        action: 'noaction'
    },
    {
        name:'Articles sample route',
        method:'get',
        uri:'/:controller/:action?', //as in Express.js
        action: 'index',//default action
    }
    ],
    'otherDomain.ru':"",
    //for localhost, auto routing
    'localhost':""
};
