// export Route function
module.exports = {
    'subdomain': function (subdomain, fn) {

        //check fn handles three params..
        if (!fn || typeof fn !== "function" || fn.length < 3) {
            throw new Error("The second parameter must be a function that handles fn(req, res, next) params.");
        }

        return function (req, res, next) {
            req._subdomainLevel = req._subdomainLevel || 0;
            var match = true;

            var subdomain_expected = new RegExp(subdomain);
            var subdomain_actual = req.subdomains.reverse().join('.');
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
            var match = true;

            var domain_expected = new RegExp(domain);
            var domain_actual = req.get('host');
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

                    Application.Routes[subdomain][method](route.uri, function (req, res) {
                        var template = 'default';
                        if (typeof route.template != 'undefined')
                            template = route.template;

                        res.set({
                            'X-Powered-By': 'Sukina Framework'
                        });
                        //set Default Controller and action to Application.Controller.default.index
                        var controller = 'default';
                        var action = 'index';

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

                        try {
                            let Controller_Action = Application.module.ObjSelector(Application.Controller, controller)[action];
                            let Controller_before = async function (req, res) {
                                return [req, res];
                            };
                            let Controller_after = async function (req, res, result) {
                                return result;
                            };
                            if (typeof Application.module.ObjSelector(Application.Controller, controller)._before != "undefined") {
                                Controller_before = Application.Controller[controller]._before;
                            }
                            if (typeof Application.module.ObjSelector(Application.Controller, controller)._after != "undefined") {
                                Controller_after = Application.Controller[controller]._after;
                            }
                            let Template_Model = new Application.Model.Template();
                            var Template_Action = Template_Model[template];

                            let Template_Error = Template_Model.error;


                            //new block


                            let Route_promise = new Promise(function (resolve, reject) {
                                Controller_before(req, res).then(function (from_before) {
                                    Controller_Action(...from_before).then(function (from_Controller) {
                                        Controller_after(...from_before, from_Controller).then(function (from_after) {
                                            Template_Action(from_after).then(resolve).catch(function (SomeError) {
                                                //found error on template stage
                                                Template_Error(SomeError).then(resolve).catch(reject);
                                            });
                                        }).catch(function (SomeError) {
                                            //found error on controller._after stage
                                            Template_Error(SomeError).then(resolve).catch(reject);
                                        });

                                    }).catch(function (SomeError) {
                                        //found error on controller stage
                                        Template_Error(SomeError).then(resolve).catch(reject);
                                    });
                                }).catch(function (SomeError) {
                                    //found error on controller._before stage
                                    Template_Error(SomeError).then(resolve).catch(reject);
                                });

                            });

                            Route_promise.then(function (TemplatedContent) {
                                if (TemplatedContent) res.send(TemplatedContent);
                                Application.module.SrvLogger.access(req);
                            }).catch(function (error) {
                                Application.module.SrvLogger.error(req, error);
                                res.send(error.toString());
                            });

                        } catch (e) {
                            Application.module.SrvLogger.error(req, e);
                            res.send(e.toString());
                        }

                    }); //end HTTP.METHOD

                }); //end forEach;

                //      Application.HTTP.use(this.subdomain(subdomain, Application.Routes[subdomain])); //subdomain mode
                Application.HTTP.use(this.fulldomain(subdomain, Application.Routes[subdomain])); //full domain mode
            } //end subdomain
        }


    }
};