// export Route function
module.exports = {
    'subdomain': function (subdomain, fn) {

        //check fn handles three params..
        if (!fn || typeof fn !== "function" || fn.length < 3) {
            throw new Error("The second parameter must be a function that handles fn(req, res, next) params.");
        }

        return function (req, res, next) {
            req._subdomainLevel = req._subdomainLevel || 0;
            let match = true;

            let subdomain_expected = new RegExp(subdomain);
            let subdomain_actual = req.subdomains.reverse().join('.');
            if (!subdomain_expected.exec(subdomain_actual)) {
                match = false;
            }

            if (match) {
                req._subdomainLevel++; //enables chaining
                return fn(req, res, next);
            }
            next();
        };

    },
    'fulldomain': function (domain, fn) {

        //check fn handles three params..
        if (!fn || typeof fn !== "function" || fn.length < 3) {
            throw new Error("The second parameter must be a function that handles fn(req, res, next) params.");
        }

        return function (req, res, next) {
            req._subdomainLevel = req._subdomainLevel || 0;
            let match = true;

            let domain_expected = new RegExp(domain);
            let domain_actual = req.get('host');
            if (!domain_expected.exec(domain_actual)) {
                match = false;
            }

            if (match) {
                req._subdomainLevel++; //enables chaining
                return fn(req, res, next);
            }
            next();
        };

    },

    'init': function () {

        Application.HTTP.use(function (req, res, next) {
            /* for subdomain version
            var domain = req.get('host');
            domain = domain.split('.');
            var subdomain = '';
            if (domain.length > 2) subdomain = domain[0];
            req.subdomain = subdomain;
            */

            /* for full domain version */
            req.subdomain = req.get('host');
            /* */
            next();
        });

        Application.Routes = {};


        for (subdomain in Application.routes) {
            Application.Routes[subdomain] = Application.lib.express.Router();

            if (Application.routes[subdomain].length > 0) {
                Application.routes[subdomain].forEach(route => {
                    var method = 'use';
                    if (typeof route.method != 'undefined')
                        method = route.method;

                    Application.Routes[subdomain][method](route.uri, async function (req, res) {

                        //begin
                        let SomeError = false;

                        //apply middlewares
                        if (typeof Application.Middleware != "undefined") {
                            for (let middleware_name in Application.Middleware) {
                                let OneMiddleware = Application.Middleware[middleware_name];
                                try {
                                    await OneMiddleware(req, res);
                                } catch (e) {
                                    SomeError = "Application.Middleware." + middleware_name + "() causes problem " + " [" + e + "]";
                                }
                            }
                        }
                        //apply main route code
                        let template = 'default';
                        if (typeof route.template != 'undefined')
                            template = route.template;

                        res.set({
                            'X-Powered-By': 'Sukina Framework'
                        });
                        //set Default Controller and action to Application.Controller.default.index
                        let controller = 'default';
                        let action = 'index';

                        if (typeof route.controller != 'undefined')
                            controller = route.controller;
                        if (typeof route.action != 'undefined')
                            action = route.action;

                        //replace default controller to parameter value from routing
                        if (typeof req.params.controller != 'undefined')
                            controller = req.params.controller;
                        //replace default action to parameter value from routing
                        if (typeof req.params.action != 'undefined')
                            action = req.params.action;

                        /*
                        Work procedure chain:
                        1) Controller._before
                        2) Controller.Action
                        3) Controller._afteк
                        */

                        /*
                        use Controller if it exists
                        */
                        let result = false;
                        if (typeof Application.System.ObjSelector(Application.Controller, controller) != "undefined") {
                            let _Controller = Application.System.ObjSelector(Application.Controller, controller);
                            _Controller = new _Controller(req, res, controller, action);
                            //1
                            try {
                                await _Controller._before();
                            } catch (e) {
                                //found error on controller._before stage
                                SomeError ="Application.Controller." + controller + "._before() causes problem " + " [" + e + "]";
                            }
                            //2
                            try {
                                await _Controller['action_' + action]();
                            } catch (e) {
                                //found error on controller.action stage
                                SomeError = "Application.Controller." + controller + "." + action + "() causes problem " + " [" + e + "]";
                            }
                            //4
                            try {
                                result = await _Controller._after();
                            } catch (e) {
                                //found error on controller._after stage
                                SomeError = "Application.Controller." + controller + "._after() causes problem " + " [" + e + "]";
                            }
                        }
                        
                        if (!SomeError) { //all ok
                            if (!res.headersSent) res.send(result);
                            Application.System.SrvLogger.access(req);
                        } else { //errors found
                            console.log(SomeError)
                            Application.System.SrvLogger.error(req, SomeError);
                            res.send(SomeError);
                        }

                    }); //end HTTP.METHOD

                }); //end forEach;

                //      Application.HTTP.use(this.subdomain(subdomain, Application.Routes[subdomain])); //subdomain mode
                Application.HTTP.use(this.fulldomain(subdomain, Application.Routes[subdomain])); //full domain mode
            } //end subdomain
        }


    }
};
