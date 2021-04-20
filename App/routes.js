/*
Routes configuration.
in regex
 */
module.exports = {
    //for head site
    '.*': [{
        name: 'Welcome',
        method: 'get',
        uri: '/',
        controller: 'Welcome'
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
    ]
};
