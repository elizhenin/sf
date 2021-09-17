let InternalAPI = {
    injectClientApiScript(controller) {
        controller.result = controller.result.split('<head>').join(`<head>\n<script type="application/javascript" src="/@sf-internal-api/${controller._controller}"></script>`);
    },

    async generateClientApiScript(controller) {
        let minify = Application.lib.terser.minify;

        let clientMethods = [];
        let serverMethods = [];
        let tmp = controller;

        let collectMethods = function (obj) {
            let result = []
            while (-1 === result.indexOf("__proto__")) {
                obj = obj.__proto__;
                result = result.concat(Object.getOwnPropertyNames(obj));
            }
            let _filter = {};
            result.forEach(item => {
                if (item.startsWith('client_') || item.startsWith('server_'))
                    _filter[item] = ""
            });
            result = Object.keys(_filter);

            return result;
        }
        let methods = collectMethods(tmp);
        methods.forEach(function (method) {
            if (method.startsWith('client_')) {
                let methodF = 'async function client_' + eval(tmp[method]).toString().slice(('async client_').length);
                clientMethods.push(methodF);
            }
            if (method.startsWith('server_')) {
                let methodF = `window.${method} = async function(){return await SF_servercall("${method.slice(('server_').length)}",arguments)}`;
                serverMethods.push(methodF);
            }
        })
        controller.result = "";
        if (serverMethods.length + clientMethods.length > 0) {
            let serverCode = serverMethods.join(';\n');

            let onloadCode = `document.addEventListener("DOMContentLoaded", async function(event) {try{await client_onload();}catch(e){}});`;

            let clientCode = `${clientMethods.join(';\n')}\n${onloadCode}\n`;

            let apiToken = controller.Session.get('sf-internal-api-token', GUID());
            controller.Session.set('sf-internal-api-token', apiToken);


            let apiCallCode = 'window.SF_servercall = ' + this.SF_servercall.split('{{apiToken}}').join(apiToken).split('{{Controller}}').join(controller._controller);
            controller.result = apiCallCode + '\n' + serverCode + '\n' + clientCode + '\n';

            controller.result = (await minify(controller.result)).code;
            controller.result = this.sysTools + '\n' + controller.result;
            controller.res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            controller.res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
    },

    async injectRouteScriptGenerator(req, res) {
        let path = req.path.split('@sf-internal-api')[1].split('/').join('.').substr(1);
        let _Controller = Application.System.ObjSelector(Application.Controller, path);
        _Controller = new _Controller(req, res, path, 'index');
        await this.generateClientApiScript(_Controller);
        return _Controller.result;
    },
    async ExecuteServerFunction(req, res) {
        let InternalAPIrequest = false;
        let apiToken = false;
        if ("true" === req.headers['sf-internal-api-request']) {
            let Session = new Application.System.Session.instance(req.cookies[Application.System.Session._cookieName]);
            apiToken = Session.get('sf-internal-api-token',false);
            if (!empty(apiToken)) {
                InternalAPIrequest = true;
            }
        }
        let result = {
            status: "error"
        };
        let SomeError = "";
        if (InternalAPIrequest) {
            //apply middlewares
            Application.System.Session.middleware(req, res);

            if (!empty(Application.Middleware)) {
                for (let middleware_name in Application.Middleware) {
                    let OneMiddleware = Application.Middleware[middleware_name];
                    try {
                        await OneMiddleware(req, res);
                    } catch (e) {
                        SomeError = "Application.Middleware." + middleware_name + "() causes problem " + " [" + e + "]";
                    }
                }
            }

            let call = req.body;
            call = CryptoJS.AES.decrypt(call, apiToken);
            call = call.toString(CryptoJS.enc.Utf8);
            call = call.split("|").reverse();
            let action = call.pop();
            let arg = JSON.parse(call.reverse().join('|'));

            let controller = req.path.split('@sf-internal-api')[1].substr(1);
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
                result = {
                    status: "success",
                    result: await _Controller['server_' + action](...arg)
                };
                result.result = CryptoJS.AES.encrypt(JSON.stringify(result.result), apiToken).toString();
            } catch (e) {
                //found error on controller.action stage
                SomeError = "Application.Controller." + controller + "." + _Controller._action + "() causes problem " + " [" + e + "]";
                console.log(e)
                result = {
                    status: "error",
                    message: SomeError
                };
            }
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return result;
    }
}

let SF_servercall = async function (method, arg) {
    let _arg = [];
    for (let i = 0; i < arg.length; i++)
        _arg.push(arg[i]);
    _arg = JSON.stringify(_arg);
    _arg = method + "|" + _arg;
    _arg = CryptoJS.AES.encrypt(_arg, '{{apiToken}}').toString();
    let P = new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open('post', "/@sf-internal-api/{{Controller}}");
        xhr.setRequestHeader('content-type', 'text/plain');
        xhr.setRequestHeader('sf-internal-api-request', 'true');
        xhr.onload = function () {
            let response = JSON.parse(this.responseText);
            if ("error" === response.status) {
                reject(response.message)
            }
            if ("success" === response.status) {
                let result = response.result;
                result = CryptoJS.AES.decrypt(result, '{{apiToken}}');
                result = result.toString(CryptoJS.enc.Utf8);
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    console.log(e)
                }
                resolve(result);
            }
        };
        xhr.onerror = function (e) {
            console.log(e)
        };
        try {
            xhr.send(_arg);
        } catch (e) {
            console.log(e)
        }
    })
    return P;
}

InternalAPI.SF_servercall = eval(SF_servercall).toString();

if (!empty(Application.sysTools)) {
    InternalAPI.sysTools = eval(Application.sysTools).toString() + '\nsysTools()\n';
    let minify = Application.lib.terser.minify;
    minify(InternalAPI.sysTools).then(function (result) {
        InternalAPI.sysTools = result.code;
    })
}

module.exports = InternalAPI;
