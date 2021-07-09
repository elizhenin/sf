// export Route class 
module.exports = class {
    constructor() {

        let Routes = {};

        for (let subdomain in Application.routes) {
            Routes[subdomain] = Application.lib.express.Router();
            let handler = this.handler;

            let type_of_route = typeof Application.routes[subdomain];

            //inject InternalAPI routes. GET for script, POST for execution
            Routes[subdomain]['get'](/\/@sf-internal-api(.*)/,  async function (req, res) {
                await Application.System.InternalAPI.injectRouteScriptGenerator(req, res) //handler
            });
           
            Routes[subdomain]['post'](/\/@sf-internal-api(.*)/, async function (req, res) {
                await Application.System.InternalAPI.ExecuteServerFunction(req, res) //handler
            });

            switch (type_of_route) {
                case "object": {
                    if (Application.routes[subdomain].length > 0) {
                        Application.routes[subdomain].forEach(route => {
                            //set Default Controller and action to Application.Controller.Default.index
                            let controller = 'Default';
                            let action = 'index';

                            //set Method
                            let method = 'get';
                            if (typeof route.method != 'undefined')
                                method = route.method;

                            if (typeof route.controller != 'undefined')
                                controller = route.controller;
                            if (typeof route.action != 'undefined')
                                action = route.action;

                            Routes[subdomain][method](route.uri, async function (req, res) {
                                await handler(req, res, controller, action) //main handler
                            }); //end HTTP.METHOD

                        }); //end forEach;


                    } //end subdomain

                    break;
                }

                case "string": {
                    if (Application.routes[subdomain].length > 0) {
                        Application.routes[subdomain] += ".";
                    }
                    ['get', 'post'].forEach(function (method) {
                        Routes[subdomain][method](/\/(.*)/, async function (req, res) {
                            //set Default Controller and action to Application.Controller.default.index
                            let controller = 'Default';
                            let action = 'index';
                            //resolve controller.action
                            let objPath = req.path.substr(1).split('/');
                            if (objPath.length > 1) {
                                action = objPath.pop();
                                controller = objPath.pop();
                            } else {
                                if (objPath[0].length > 0) {
                                    action = objPath.pop();
                                }
                            }

                            controller = Application.routes[subdomain] + controller;
                            await handler(req, res, controller, action) // return {result,error}
                        }); //end HTTP.METHOD
                    })

                    break;
                }
                default: {}
            }

            Application.HTTP.use(this.apply(subdomain, Routes[subdomain]));
        }


    }


    apply(domain, fn) {

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

    }


    async handler(req, res, controller, action) {
        //begin

        res.set({
            'X-Powered-By': 'Sukina Framework'
        });

        let SomeError = false;

        //apply middlewares
        Application.System.Session.middleware(req, res);

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
        3) Controller._after
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
                SomeError = "Application.Controller." + controller + "._before() causes problem " + " [" + e + "]";
            }

            //2
            try {
                await _Controller['action_' + _Controller._action]();
            } catch (e) {
                //found error on controller.action stage
                SomeError = "Application.Controller." + controller + "." + _Controller._action + "() causes problem " + " [" + e + "]";
            }
            //3
            try {
                result = await _Controller._after();
            } catch (e) {
                //found error on controller._after stage
                SomeError = "Application.Controller." + controller + "._after() causes problem " + " [" + e + "]";
            }

        } else {
            SomeError = "Application.Controller." + controller + " is undefined";
        }

        if (!SomeError) { //all ok
            if (!res.headersSent) res.send(result);
            Application.System.SrvLogger.access(req);
        } else { //errors found
            console.log(SomeError)
            Application.System.SrvLogger.error(req, SomeError);
            res.send(SomeError);
        }
        return;
    }

}