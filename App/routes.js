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
        controller: 'Welcome',
        template: 'default'
    },
    {
        name: 'Api requests',
        method: 'post',
        uri: '/api/:action?/:arg?',
        controller: 'Api',
        action: 'noaction',
        template: 'notemplate'
    },
    {
        name:'Articles sample route',
        method:'get',
        uri:'/:controller/:action?', //as in Express.js
        action: 'index',//default action
        template: 'default' //template is the action() in Template controller
    }
    ]
};
