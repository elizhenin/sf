module.exports = class Routes extends BaseObject {
    constructor() {
        super();
        let MaxListeners = Application.config.Server.MaxListeners * 1;
        this.ListenPort = Application.config.Server.Port * 1;

        this.server = Application.lib.http.createServer(async function (req, res) {
            let ActiveListeners = await getActiveListeners();

            // Application.System.SrvLogger.access(req,res);
            if (ActiveListeners < MaxListeners) {
                req.ip = req.headers['x-forwarded-for'] ||
                    req.socket.remoteAddress ||
                    null;
                res.redirect = function (url) {
                    this.statusCode = 302;
                    this.setHeader(
                        'Location', url
                    )
                }
                let Handler = new RequestHandler(req, res);
                //parse body
                await Handler.body_parser();
                //apply middlewares
                if (!res.writeableEnded) await Handler.middlewares();
                //try to send static file
                if (!res.writeableEnded)
                    if (await Handler.static()) {
                        //static found and sended
                    } else {
                        //static not found
                        await Handler.router();
                        if (!Handler.Error) { //all ok
                            await Handler.send();
                            Application.System.SrvLogger.access(req, res);
                        } else { //errors found
                            console.log(Handler.Error.toString());
                            Application.System.SrvLogger.error(req, Handler.Error);
                            if (!res.writeableEnded) res.end(Handler.Error);
                        }
                    }
            } else {
                console.log(MaxListeners + ' exceeded');
                Application.System.SrvLogger.error(req, MaxListeners + ' exceeded');
                res.end('Error: MaxListeners exceeded, try later');
            }
        });

        this.server.on('clientError', (err, socket) => {
            Application.System.SrvLogger.error({}, err);
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        this.server.listen(this.ListenPort);
        console.log("listen started on port " + this.ListenPort);
    }
};

const getActiveListeners = function () {
    return new Promise(function (resolve, reject) {
        Application.HTTP.server.getConnections(
            function (error, count) {
                resolve(count)
            });
    })
}

const RequestHandler = class {
    constructor(req, res) {
        this.req = req;
        this.res = res;
        this.HOST = this.req.headers['host'].split(':')[0];
        this.req.path = this.req.url.split('?')[0];
        this.Error = false;
        this.result = false;
        //query string
        let query = {};
        let query_text = this.req.url.split('?')[1];
        if (query_text) {
            let pairs = query_text.split('&');
            pairs.forEach(function (pair) {
                let [key, value] = pair.split('=');
                key = decodeURIComponent(key);
                value = decodeURIComponent(value);
                query[key] = value;
            });
        }
        this.req.query = query;

        //cookies
        let cookies = {};
        let cookies_text;
        if (this.req.headers.cookie) cookies_text = this.req.headers.cookie.trim();
        if (cookies_text) {
            let pairs = cookies_text.split(';');
            pairs.forEach(function (pair) {
                let dirty = pair.split('=').reverse();
                let key = dirty.pop();
                let value = dirty.reverse().join('=');
                key = decodeURIComponent(key.trim());
                value = decodeURIComponent(value.trim());
                cookies[key] = value;
            });
        }
        this.req.cookies = cookies;
    }

    async middlewares() {
        Application.System.Session.middleware(this.req, this.res);
        if (!empty(Application.Middleware)) {
            for (let middleware_name in Application.Middleware) {
                let OneMiddleware = Application.Middleware[middleware_name];
                try {
                    await OneMiddleware(this.req, this.res);
                } catch (e) {
                    this.Error = "Application.Middleware." + middleware_name + "() causes problem " + " [" + e + "]";
                    console.log(e)
                }
            }
        }
    }

    async static() {
        //working
        let result = false;
        if (this.req.path.length > 1) {
            result = true;
            let filepath = Application.lib.path.join(Application.config.Directories.AppPublic, decodeURI(this.req.path));
            let stat;
            try {
                stat = await Application.lib.fs_promises.stat(filepath);
                if (stat.isDirectory()) result = false;
            } catch (e) {
                result = false;
            }
            if (result) {
                let res = this.res;
                let fileExt = filepath
                    .split('.')
                    .reverse()[0]
                    .toString()
                    .toLowerCase();
                async function worker() {
                    let ext_to_mime = function (ext) {
                        let result = "text/plain; charset=utf-8";
                        let mime = Application.System.MimeTypes;
                        if (!empty(mime[ext])) {
                            result = mime[ext];
                        }
                        return result;
                    };
                    let headers = {
                        'Content-Type': ext_to_mime(fileExt),
                        'Content-Length': stat.size
                    };

                    let StaticFilesCache = true;
                    if (
                        !empty(Application.config.HTTP) &&
                        !empty(Application.config.HTTP.StaticFilesCache)
                    )
                        StaticFilesCache =
                            StaticFilesCache &&
                            'true' === Application.config.HTTP.StaticFilesCache;
                    if (StaticFilesCache) {
                        let StaticFilesCacheMaxAge = 31536000;
                        if (
                            !empty(Application.config.HTTP) &&
                            !empty(
                                Application.config.HTTP.StaticFilesCacheMaxAge
                            )
                        )
                            StaticFilesCacheMaxAge =
                                Application.config.HTTP.StaticFilesCacheMaxAge;
                        headers['Cache-Control'] =
                            'public, max-age=' + StaticFilesCacheMaxAge;
                    }
                    res.writeHead(200, headers);

                    let readStream = Application.lib.fs.createReadStream(filepath);
                    readStream.pipe(res);
                    readStream.on('end', function () {
                        res.end();
                    });
                }
                await worker();
            }
        }
        return result;
    }

    async router() {
        let URL = this.req.path;
        //detect domain name match
        let domains = Object.keys(Application.routes);
        let domainsRoutes = null;
        let clientHost = this.HOST;
        for (let domain of domains) {
            if (!empty(clientHost.match(domain))) {
                domainsRoutes = Application.routes[domain];
                break;
            }
        }

        if (domainsRoutes != null) {
            let type_of_route = typeof domainsRoutes;
            let Controller = "Default";
            let action = "index"

            //inject InternalAPI routes. GET for script, POST for execution
            if (URL.match(/\/@sf-internal-api(.*)/)) {
                if ("get" === this.req.method.toLowerCase()) {
                    this.result = await Application.System.InternalAPI.injectRouteScriptGenerator(this.req, this.res) //handler
                }
                if ("post" === this.req.method.toLowerCase()) {
                    this.result = JSON.stringify(await Application.System.InternalAPI.ExecuteServerFunction(this.req, this.res)) //handler
                }
            } else {
                //detect route match
                switch (type_of_route) {
                    case "object": {
                        for (let route of domainsRoutes) {
                            let match = Application.lib['path-to-regexp'].match(route.uri, {
                                encode: encodeURI,
                                decode: decodeURIComponent
                            });
                            let matched = match(URL);
                            if (matched) {
                                //try to use Controller.action from route settings
                                if (!empty(route.controller)) Controller = route.controller;
                                if (!empty(route.action)) action = route.action;
                                //try to use Controller.action from url params
                                if (!empty(matched.params.controller)) Controller = matched.params.controller;
                                if (!empty(matched.params.action)) action = matched.params.action;
                                //add route params to req
                                let params = {}
                                Object.keys(matched.params).forEach(function (param) {
                                    params[param] = matched.params[param]
                                })
                                this.req.params = params;

                                if (!empty(route.method)) {
                                    /* method is stricted - compare with request*/
                                    if (route.method.toLowerCase() === this.req.method.toLowerCase())
                                        await this.handler(Controller, action, route);
                                } /* method is not stricted */
                                else await this.handler(Controller, action, route);
                                break;
                            }
                        }
                        break;
                    }
                    case "string": {
                        //resolve controller.action
                        let _domainsRoutes = domainsRoutes;
                        if (_domainsRoutes.length > 0) {
                            _domainsRoutes += ".";
                        }
                        let objPath = this.req.path.substr(1).split('/');
                        if (objPath.length > 1) {
                            action = objPath.pop();
                            Controller = objPath.join(".");
                        } else {
                            if (objPath[0].length > 0) {
                                action = objPath.pop();
                            }
                        }
                        Controller = _domainsRoutes + Controller;
                        if ("object" === typeof ObjSelector(Application.Controller, Controller)) {
                            Controller += "." + action;
                            action = "index";
                        }
                        await this.handler(Controller, action);
                        break;
                    }
                }
            }
        }
        return domainsRoutes;
    }

    async handler(Controller, action, route = null) {
        /*
           Work procedure chain:
           1) Controller._before
           2) Controller.Action
           3) Controller._after
        */

        let result = false;

        if (-1 === ["undefined", "object"].indexOf(typeof ObjSelector(Application.Controller, Controller))) {
            let _Controller = ObjSelector(Application.Controller, Controller);
            _Controller = new _Controller(this.req, this.res, Controller, action, route);
            //1
            try {
                await _Controller._before();
            } catch (e) {
                //found error on controller._before stage
                this.Error = "Application.Controller." + Controller + "._before() causes problem " + " [" + e + "]";
                console.log(e)
            }

            //2
            try {
                if (!this.Error) await _Controller['action_' + _Controller._action](...Object.values(this.req.params));
            } catch (e) {
                //found error on controller.action stage
                this.Error = "Application.Controller." + Controller + "." + _Controller._action + "() causes problem " + " [" + e + "]";
                console.log(e)
            }
            //3
            try {
                if (!this.Error) result = await _Controller._after();
            } catch (e) {
                //found error on controller._after stage
                this.Error = "Application.Controller." + Controller + "._after() causes problem " + " [" + e + "]";
                console.log(e)
            }
        } else {
            this.Error = "Application.Controller." + Controller + " is undefined";
        }

        if ("object" === typeof result) result = JSON.stringify(result);
        this.result = result;
    }

    async body_parser() {
        let body = "";
        let parsers = {
            "application/json": async function (body) {
                let result = false;
                try {
                    result = JSON.parse(body.toString())
                } catch (e) { }
                return result
            },
            "text/plain": async function (body, ContentTypeParams) {
                let result = "";
                try {
                    result = body.toString()
                } catch (e) { }
                return result
            },
            "application/x-www-form-urlencoded": async function (body) {
                let result = {}
                body = body.toString();
                if (body.length) {
                    let pairs = body.split('&');
                    pairs.forEach(function (pair) {
                        let [key, value] = pair.split('=');
                        key = decodeURIComponent(key);
                        value = decodeURIComponent(value);
                        result[key] = value;
                    });
                }
                return result;
            },
            "multipart/form-data": async function (body, ContentTypeParams) {
                let multipart = new multipartFormParser(ContentTypeParams);
                let parts = multipart.Parse(body);
                return parts;
            }
        }
        let ContentTypeParams = "";
        let ContentType = this.req.headers['content-type'];
        if (ContentType) {
            ContentType = ContentType.split(';');
            ContentTypeParams = ContentType[1];
            ContentType = ContentType[0];
        }

        if (ContentType && Object.keys(parsers).indexOf(ContentType) > -1) {
            let req = this.req;
            let P = new Promise(function (resolve, reject) {
                let body = Buffer.alloc(0);
                req.on('data', chunk => {
                    body = Buffer.concat([body, chunk]);
                });
                req.on('end', () => {
                    resolve(body);
                });
            });
            body = await P;
            body = await parsers[ContentType](body, ContentTypeParams);
        }
        this.req.body = body;
    }

    encoding = {
        check(acceptEncoding) {
            if (!acceptEncoding) {
                acceptEncoding = [];
            } else {
                acceptEncoding = acceptEncoding.split(',');
                for (let i = 0; i < acceptEncoding.length; i++) {
                    // according to notation
                    // Accept-Encoding: deflate, gzip;q=1.0, *;q=0.5
                    // weights are ignored, only deflate supported
                    acceptEncoding[i] = acceptEncoding[i].trim().toLowerCase().split(';')[0];
                }
            }
            return (acceptEncoding.indexOf('deflate') ? true : false)
        },
        deflate(payload) {
            return new Promise(function (resolve, reject) {
                const deflate = Application.lib.zlib.deflate;
                deflate(payload, function (err, result) {
                    if (err) {
                        reject(err);
                    } else resolve(result);
                });
            });
        }
    };

    async send(result = undefined) {
        if (empty(result)) result = this.result;
        let res = this.res;
        if (typeof result != 'string') {
            if (Buffer.isBuffer(result)) {
                result = result.toString();
            } else result = JSON.stringify(result);
        }
        if (!res.writeableEnded) {
            if (empty(result)) {
                res.end();
            } else {
                res.end(result);
            }
        }
    }
};

const multipartFormParser = class {
    /**
          Multipart Parser (Finite State Machine)
        Author:  Cristian Salazar (christiansalazarh@gmail.com) www.chileshift.cl
        Modified to class-style by Evgeny Lizhenin (elizhenin@gmail.com)
    
     */
    constructor(header) {
        let items = header.split(';');
        if (items)
            for (let _item of items) {
                let item = _item.trim();
                if (item.startsWith('boundary=')) {
                    let k = item.split('=');
                    this.boundary = (new String(k[1])).trim();
                }
            }
    }
    Parse(multipartBodyBuffer) {
        let lastline = '';
        let header = '';
        let info = '';
        let state = 0;
        let buffer = [];
        let allParts = {};
        if (this.boundary)
            for (let i = 0; i < multipartBodyBuffer.length; i++) {
                let oneByte = multipartBodyBuffer[i];
                let prevByte = i > 0 ? multipartBodyBuffer[i - 1] : null;
                let newLineDetected = ((oneByte == 0x0a) && (prevByte == 0x0d)) ? true : false;
                let newLineChar = ((oneByte == 0x0a) || (oneByte == 0x0d)) ? true : false;

                if (!newLineChar)
                    lastline += String.fromCharCode(oneByte);

                if ((0 == state) && newLineDetected) {
                    if (("--" + this.boundary) == lastline) {
                        state = 1;
                    }
                    lastline = '';
                } else
                    if ((1 == state) && newLineDetected) {
                        header = lastline;
                        state = 2;
                        lastline = '';
                    } else
                        if ((2 == state) && newLineDetected) {
                            info = lastline;
                            state = 3;
                            lastline = '';
                        } else
                            if ((3 == state) && newLineDetected) {
                                state = 4;
                                buffer = [];
                                lastline = '';
                            } else
                                if (4 == state) {
                                    if (lastline.length > (this.boundary.length + 4)) lastline = ''; // mem save
                                    if (((("--" + this.boundary) == lastline))) {
                                        let j = buffer.length - lastline.length;
                                        let part = buffer.slice(0, j - 1);
                                        let p = {
                                            header: header,
                                            info: info,
                                            part: part
                                        };
                                        let [fieldName, readyPart] = this._processPart(p);
                                        allParts[fieldName] = readyPart;
                                        buffer = [];
                                        lastline = '';
                                        state = 5;
                                        header = '';
                                        info = '';
                                    } else {
                                        buffer.push(oneByte);
                                    }
                                    if (newLineDetected) lastline = '';
                                } else
                                    if (5 == state) {
                                        if (newLineDetected)
                                            state = 1;
                                    }
            }

        return allParts;
    };

    _processPart(part) {
        let header = part.header.split(';');
        let file = this._createObject(header[2]);
        let contentType = part.info.split(':')[1].trim();
        file['type'] = contentType;
        file['data'] = Buffer.from(part.part);
        let fieldName = JSON.parse(header[1].split('=')[1].trim());
        return [fieldName, file];
    }

    _createObject(pair = '') {
        let newObj = {},
            pairAsArray, key, value;
        pairAsArray = pair.split('=');
        key = pairAsArray[0].trim();
        value = JSON.parse(pairAsArray[1].trim());
        newObj[key] = value;
        return newObj;
    }
};
