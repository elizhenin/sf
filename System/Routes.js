module.exports = class {
    constructor() {
        let MaxListeners = Application.config.Server.MaxListeners * 1;
        let ActiveListeners = 0;

        this.ListenPort = Application.config.Server.Port * 1;

        this.server = Application.lib.http.createServer(async function (req, res) {
            ActiveListeners++;
            Application.System.SrvLogger.access(req);
            if (ActiveListeners <= MaxListeners) {
                req.ip = req.headers['x-forwarded-for'] ||
                    req.socket.remoteAddress ||
                    null;
                let Handler = new RequestHandler(req, res);
                //parse body
                await Handler.body_parser();

                //apply middlewares
                await Handler.middlewares();

                //try to send static file
                if (await Handler.static()) {
                    //static found and sended
                } else {
                    //static not found
                    await Handler.router();

                    if (!Handler.Error) { //all ok
                        if (!res.headersSent) res.end(Handler.result);
                        Application.System.SrvLogger.access(req);
                    } else { //errors found
                        console.log(Handler.Error.toString())
                        Application.System.SrvLogger.error(req, Handler.Error);
                        res.end(Handler.Error);
                    }
                }
            } else {
                console.log(MaxListeners + ' exceeded');
                Application.System.SrvLogger.error(req, MaxListeners + ' exceeded');
                res.end('Error: MaxListeners exceeded, try later');
            }
            ActiveListeners--;
        });
        this.server.on('clientError', (err, socket) => {
            Application.System.SrvLogger.error({}, err);
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        this.server.listen(this.ListenPort);
        console.log("listen started on port " + this.ListenPort);
    }
}

let RequestHandler = class {
    constructor(req, res) {
        this.req = req;
        this.res = res;
        this.HOST = this.req.headers['host'].split(':')[0];
        this.req.path = this.req.url.split('?')[0];
        this.Error = false;
        this.result = false;
        //query string
        let query = {}
        let query_text = this.req.url.split('?')[1]
        if (query_text) {
            let pairs = query_text.split('&');
            pairs.forEach(function (pair) {
                let [key, value] = pair.split('=');
                key = decodeURIComponent(key);
                value = decodeURIComponent(value);
                query[key] = value;
            })
        }
        this.req.query = query;

        //cookies
        let cookies = {}
        let cookies_text = this.req.headers.cookie.trim();
        if (cookies_text) {
            let pairs = cookies_text.split(';');
            pairs.forEach(function (pair) {
                let [key, value] = pair.split('=');
                key = decodeURIComponent(key.trim());
                value = decodeURIComponent(value.trim());
                cookies[key] = value;
            })
        }
        this.req.cookies = cookies;
    }

    async middlewares() {
        Application.System.Session.middleware(this.req, this.res);
        if (typeof Application.Middleware != "undefined") {
            for (let middleware_name in Application.Middleware) {
                let OneMiddleware = Application.Middleware[middleware_name];
                try {
                    await OneMiddleware(this.req, this.res);
                } catch (e) {
                    this.Error = "Application.Middleware." + middleware_name + "() causes problem " + " [" + e + "]";
                }
            }
        }
    }

    async static() {
        let result = false;
        if (this.req.path.length > 1) {
            result = true;
            let filepath = Application.lib.path.join(Application.config.Directories.AppPublic, this.req.path);
            let stat;
            try {
                stat = await Application.lib.fs_promises.stat(filepath);
                if (stat.isDirectory()) result = false;
            } catch (e) {
                result = false;
            }
            if (result) {
                let res = this.res;
                async function worker() {
                    res.writeHead(200, {
                        'Content-Type': ext_to_mime(filepath.split('.').reverse()[0]),
                        'Content-Length': stat.size,
                        'Cache-Control': 'public, max-age=31536000'
                    });
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
        let domainsRoutes = false;
        let clientHost = this.HOST;
        for (let domains_index = 0; domains_index < domains.length; domains_index++) {
            let domain = domains[domains_index];
            if (clientHost.match(domain)) {
                domainsRoutes = Application.routes[domain];
                break
            }
        }
        if (domainsRoutes != "false") {
            let type_of_route = typeof domainsRoutes;
            let Controller = "Default";
            let action = "index"

            //inject InternalAPI routes. GET for script, POST for execution
            if (URL.match(/\/@sf-internal-api(.*)/)) {
                if (this.req.method.toLowerCase() == 'get') {
                    this.result = await Application.System.InternalAPI.injectRouteScriptGenerator(this.req, this.res) //handler
                }
                if (this.req.method.toLowerCase() == 'post') {
                    this.result = JSON.stringify(await Application.System.InternalAPI.ExecuteServerFunction(this.req, this.res)) //handler
                }
            } else {

                //detect route match
                switch (type_of_route) {
                    case "object": {
                        for (let routes_index = 0; routes_index < domainsRoutes.length; routes_index++) {
                            let route = domainsRoutes[routes_index];
                            let match = Application.lib['path-to-regexp'].match(route.uri, {
                                encode: encodeURI,
                                decode: decodeURIComponent
                            });
                            let matched = match(URL);
                            if (matched) {
                                //try to use Controller.action from route settings
                                if (typeof route.controller != "undefined") Controller = route.controller;
                                if (typeof route.action != "undefined") action = route.action;
                                //try to use Controller.action from url params
                                if (typeof matched.params.controller != "undefined") Controller = matched.params.controller;
                                if (typeof matched.params.action != "undefined") action = matched.params.action;
                                //add route params to req
                                let params = {}
                                Object.keys(matched.params).forEach(function (param) {
                                    params[param] = matched.params[param]
                                })
                                this.req.params = params;

                                if (typeof route.method != "undefined") {
                                    /* method is stricted - compare with request*/
                                    if (route.method.toLowerCase() == this.req.method.toLowerCase())
                                        await this.handler(Controller, action);
                                } /* method is not stricted */
                                else await this.handler(Controller, action);
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
                        if (typeof Application.System.ObjSelector(Application.Controller, Controller) == "object") {
                            Controller += "." + action;
                            action = "index";
                        }
                        await this.handler(Controller, action)
                        break;
                    }
                }
            }

        }
        return domainsRoutes;
    }

    async handler(Controller, action) {
        /*
           Work procedure chain:
           1) Controller._before
           2) Controller.Action
           3) Controller._after
        */


        let result = false;

        if (["undefined", "object"].indexOf(typeof Application.System.ObjSelector(Application.Controller, Controller)) == -1) {
            let _Controller = Application.System.ObjSelector(Application.Controller, Controller);
            _Controller = new _Controller(this.req, this.res, Controller, action);
            //1
            try {
                await _Controller._before();
            } catch (e) {
                //found error on controller._before stage
                this.Error = "Application.Controller." + Controller + "._before() causes problem " + " [" + e + "]";
            }

            //2
            try {
                await _Controller['action_' + _Controller._action]();
            } catch (e) {
                //found error on controller.action stage
                this.Error = "Application.Controller." + Controller + "." + _Controller._action + "() causes problem " + " [" + e + "]";
            }
            //3
            try {
                result = await _Controller._after();
            } catch (e) {
                //found error on controller._after stage
                this.Error = "Application.Controller." + Controller + "._after() causes problem " + " [" + e + "]";
            }

        } else {
            this.Error = "Application.Controller." + Controller + " is undefined";
        }

        if (typeof result == "object") result = JSON.stringify(result);
        this.result = result;
    }

    async body_parser() {
        let body = "";
        let parsers = {
            "application/json": async function (body) {
                let result = false;
                try {
                    result = JSON.parse(body.toString())
                } catch (e) {}
                return result
            },
            "text/plain": async function (body, ContentTypeParams) {
                let result = "";
                try {
                    result = body.toString()
                } catch (e) {}
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
                    })
                }
                return result
            },
            "multipart/form-data": async function (body, ContentTypeParams) {
                let multipart = new multipartFormParser();
                let boundary = multipart.getBoundary(ContentTypeParams);
                let parts = multipart.Parse(body, boundary);
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
}


let ext_to_mime = function (ext) {
    let result = "text/plain";
    ext = ext.toString().toLowerCase();
    let mime = {
        "123": "application/vnd.lotus-1-2-3",
        "1km": "application/vnd.1000minds.decision-model+xml",
        "3dml": "text/vnd.in3d.3dml",
        "3ds": "image/x-3ds",
        "3g2": "video/3gpp2",
        "3gp": "video/3gpp",
        "3gpp": "video/3gpp",
        "3mf": "model/3mf",
        "7z": "application/x-7z-compressed",
        "aab": "application/x-authorware-bin",
        "aac": "audio/x-aac",
        "aam": "application/x-authorware-map",
        "aas": "application/x-authorware-seg",
        "abw": "application/x-abiword",
        "ac": "application/vnd.nokia.n-gage.ac+xml",
        "acc": "application/vnd.americandynamics.acc",
        "ace": "application/x-ace-compressed",
        "acu": "application/vnd.acucobol",
        "acutc": "application/vnd.acucorp",
        "adp": "audio/adpcm",
        "aep": "application/vnd.audiograph",
        "afm": "application/x-font-type1",
        "afp": "application/vnd.ibm.modcap",
        "ahead": "application/vnd.ahead.space",
        "ai": "application/postscript",
        "aif": "audio/x-aiff",
        "aifc": "audio/x-aiff",
        "aiff": "audio/x-aiff",
        "air": "application/vnd.adobe.air-application-installer-package+zip",
        "ait": "application/vnd.dvb.ait",
        "ami": "application/vnd.amiga.ami",
        "amr": "audio/amr",
        "apk": "application/vnd.android.package-archive",
        "apng": "image/apng",
        "appcache": "text/cache-manifest",
        "application": "application/x-ms-application",
        "apr": "application/vnd.lotus-approach",
        "arc": "application/x-freearc",
        "arj": "application/x-arj",
        "asc": "application/pgp-signature",
        "asf": "video/x-ms-asf",
        "asm": "text/x-asm",
        "aso": "application/vnd.accpac.simply.aso",
        "asx": "video/x-ms-asf",
        "atc": "application/vnd.acucorp",
        "atom": "application/atom+xml",
        "atomcat": "application/atomcat+xml",
        "atomdeleted": "application/atomdeleted+xml",
        "atomsvc": "application/atomsvc+xml",
        "atx": "application/vnd.antix.game-component",
        "au": "audio/basic",
        "avi": "video/x-msvideo",
        "avif": "image/avif",
        "aw": "application/applixware",
        "azf": "application/vnd.airzip.filesecure.azf",
        "azs": "application/vnd.airzip.filesecure.azs",
        "azv": "image/vnd.airzip.accelerator.azv",
        "azw": "application/vnd.amazon.ebook",
        "b16": "image/vnd.pco.b16",
        "bat": "application/x-msdownload",
        "bcpio": "application/x-bcpio",
        "bdf": "application/x-font-bdf",
        "bdm": "application/vnd.syncml.dm+wbxml",
        "bdoc": "application/x-bdoc",
        "bed": "application/vnd.realvnc.bed",
        "bh2": "application/vnd.fujitsu.oasysprs",
        "bin": "application/octet-stream",
        "blb": "application/x-blorb",
        "blorb": "application/x-blorb",
        "bmi": "application/vnd.bmi",
        "bmml": "application/vnd.balsamiq.bmml+xml",
        "bmp": "image/x-ms-bmp",
        "book": "application/vnd.framemaker",
        "box": "application/vnd.previewsystems.box",
        "boz": "application/x-bzip2",
        "bpk": "application/octet-stream",
        "bsp": "model/vnd.valve.source.compiled-map",
        "btif": "image/prs.btif",
        "buffer": "application/octet-stream",
        "bz": "application/x-bzip",
        "bz2": "application/x-bzip2",
        "c": "text/x-c",
        "c11amc": "application/vnd.cluetrust.cartomobile-config",
        "c11amz": "application/vnd.cluetrust.cartomobile-config-pkg",
        "c4d": "application/vnd.clonk.c4group",
        "c4f": "application/vnd.clonk.c4group",
        "c4g": "application/vnd.clonk.c4group",
        "c4p": "application/vnd.clonk.c4group",
        "c4u": "application/vnd.clonk.c4group",
        "cab": "application/vnd.ms-cab-compressed",
        "caf": "audio/x-caf",
        "cap": "application/vnd.tcpdump.pcap",
        "car": "application/vnd.curl.car",
        "cat": "application/vnd.ms-pki.seccat",
        "cb7": "application/x-cbr",
        "cba": "application/x-cbr",
        "cbr": "application/x-cbr",
        "cbt": "application/x-cbr",
        "cbz": "application/x-cbr",
        "cc": "text/x-c",
        "cco": "application/x-cocoa",
        "cct": "application/x-director",
        "ccxml": "application/ccxml+xml",
        "cdbcmsg": "application/vnd.contact.cmsg",
        "cdf": "application/x-netcdf",
        "cdfx": "application/cdfx+xml",
        "cdkey": "application/vnd.mediastation.cdkey",
        "cdmia": "application/cdmi-capability",
        "cdmic": "application/cdmi-container",
        "cdmid": "application/cdmi-domain",
        "cdmio": "application/cdmi-object",
        "cdmiq": "application/cdmi-queue",
        "cdx": "chemical/x-cdx",
        "cdxml": "application/vnd.chemdraw+xml",
        "cdy": "application/vnd.cinderella",
        "cer": "application/pkix-cert",
        "cfs": "application/x-cfs-compressed",
        "cgm": "image/cgm",
        "chat": "application/x-chat",
        "chm": "application/vnd.ms-htmlhelp",
        "chrt": "application/vnd.kde.kchart",
        "cif": "chemical/x-cif",
        "cii": "application/vnd.anser-web-certificate-issue-initiation",
        "cil": "application/vnd.ms-artgalry",
        "cjs": "application/node",
        "cla": "application/vnd.claymore",
        "class": "application/java-vm",
        "clkk": "application/vnd.crick.clicker.keyboard",
        "clkp": "application/vnd.crick.clicker.palette",
        "clkt": "application/vnd.crick.clicker.template",
        "clkw": "application/vnd.crick.clicker.wordbank",
        "clkx": "application/vnd.crick.clicker",
        "clp": "application/x-msclip",
        "cmc": "application/vnd.cosmocaller",
        "cmdf": "chemical/x-cmdf",
        "cml": "chemical/x-cml",
        "cmp": "application/vnd.yellowriver-custom-menu",
        "cmx": "image/x-cmx",
        "cod": "application/vnd.rim.cod",
        "coffee": "text/coffeescript",
        "com": "application/x-msdownload",
        "conf": "text/plain",
        "cpio": "application/x-cpio",
        "cpp": "text/x-c",
        "cpt": "application/mac-compactpro",
        "crd": "application/x-mscardfile",
        "crl": "application/pkix-crl",
        "crt": "application/x-x509-ca-cert",
        "crx": "application/x-chrome-extension",
        "cryptonote": "application/vnd.rig.cryptonote",
        "csh": "application/x-csh",
        "csl": "application/vnd.citationstyles.style+xml",
        "csml": "chemical/x-csml",
        "csp": "application/vnd.commonspace",
        "css": "text/css",
        "cst": "application/x-director",
        "csv": "text/csv",
        "cu": "application/cu-seeme",
        "curl": "text/vnd.curl",
        "cww": "application/prs.cww",
        "cxt": "application/x-director",
        "cxx": "text/x-c",
        "dae": "model/vnd.collada+xml",
        "daf": "application/vnd.mobius.daf",
        "dart": "application/vnd.dart",
        "dataless": "application/vnd.fdsn.seed",
        "davmount": "application/davmount+xml",
        "dbf": "application/vnd.dbf",
        "dbk": "application/docbook+xml",
        "dcr": "application/x-director",
        "dcurl": "text/vnd.curl.dcurl",
        "dd2": "application/vnd.oma.dd2+xml",
        "ddd": "application/vnd.fujixerox.ddd",
        "ddf": "application/vnd.syncml.dmddf+xml",
        "dds": "image/vnd.ms-dds",
        "deb": "application/x-debian-package",
        "def": "text/plain",
        "deploy": "application/octet-stream",
        "der": "application/x-x509-ca-cert",
        "dfac": "application/vnd.dreamfactory",
        "dgc": "application/x-dgc-compressed",
        "dic": "text/x-c",
        "dir": "application/x-director",
        "dis": "application/vnd.mobius.dis",
        "disposition-notification": "message/disposition-notification",
        "dist": "application/octet-stream",
        "distz": "application/octet-stream",
        "djv": "image/vnd.djvu",
        "djvu": "image/vnd.djvu",
        "dll": "application/x-msdownload",
        "dmg": "application/x-apple-diskimage",
        "dmp": "application/vnd.tcpdump.pcap",
        "dms": "application/octet-stream",
        "dna": "application/vnd.dna",
        "doc": "application/msword",
        "docm": "application/vnd.ms-word.document.macroenabled.12",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "dot": "application/msword",
        "dotm": "application/vnd.ms-word.template.macroenabled.12",
        "dotx": "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
        "dp": "application/vnd.osgi.dp",
        "dpg": "application/vnd.dpgraph",
        "dra": "audio/vnd.dra",
        "drle": "image/dicom-rle",
        "dsc": "text/prs.lines.tag",
        "dssc": "application/dssc+der",
        "dtb": "application/x-dtbook+xml",
        "dtd": "application/xml-dtd",
        "dts": "audio/vnd.dts",
        "dtshd": "audio/vnd.dts.hd",
        "dump": "application/octet-stream",
        "dvb": "video/vnd.dvb.file",
        "dvi": "application/x-dvi",
        "dwd": "application/atsc-dwd+xml",
        "dwf": "model/vnd.dwf",
        "dwg": "image/vnd.dwg",
        "dxf": "image/vnd.dxf",
        "dxp": "application/vnd.spotfire.dxp",
        "dxr": "application/x-director",
        "ear": "application/java-archive",
        "ecelp4800": "audio/vnd.nuera.ecelp4800",
        "ecelp7470": "audio/vnd.nuera.ecelp7470",
        "ecelp9600": "audio/vnd.nuera.ecelp9600",
        "ecma": "application/ecmascript",
        "edm": "application/vnd.novadigm.edm",
        "edx": "application/vnd.novadigm.edx",
        "efif": "application/vnd.picsel",
        "ei6": "application/vnd.pg.osasli",
        "elc": "application/octet-stream",
        "emf": "image/emf",
        "eml": "message/rfc822",
        "emma": "application/emma+xml",
        "emotionml": "application/emotionml+xml",
        "emz": "application/x-msmetafile",
        "eol": "audio/vnd.digital-winds",
        "eot": "application/vnd.ms-fontobject",
        "eps": "application/postscript",
        "epub": "application/epub+zip",
        "es": "application/ecmascript",
        "es3": "application/vnd.eszigno3+xml",
        "esa": "application/vnd.osgi.subsystem",
        "esf": "application/vnd.epson.esf",
        "et3": "application/vnd.eszigno3+xml",
        "etx": "text/x-setext",
        "eva": "application/x-eva",
        "evy": "application/x-envoy",
        "exe": "application/x-msdownload",
        "exi": "application/exi",
        "exr": "image/aces",
        "ext": "application/vnd.novadigm.ext",
        "ez": "application/andrew-inset",
        "ez2": "application/vnd.ezpix-album",
        "ez3": "application/vnd.ezpix-package",
        "f": "text/x-fortran",
        "f4v": "video/x-f4v",
        "f77": "text/x-fortran",
        "f90": "text/x-fortran",
        "fbs": "image/vnd.fastbidsheet",
        "fcdt": "application/vnd.adobe.formscentral.fcdt",
        "fcs": "application/vnd.isac.fcs",
        "fdf": "application/vnd.fdf",
        "fdt": "application/fdt+xml",
        "fe_launch": "application/vnd.denovo.fcselayout-link",
        "fg5": "application/vnd.fujitsu.oasysgp",
        "fgd": "application/x-director",
        "fh": "image/x-freehand",
        "fh4": "image/x-freehand",
        "fh5": "image/x-freehand",
        "fh7": "image/x-freehand",
        "fhc": "image/x-freehand",
        "fig": "application/x-xfig",
        "fits": "image/fits",
        "flac": "audio/x-flac",
        "fli": "video/x-fli",
        "flo": "application/vnd.micrografx.flo",
        "flv": "video/x-flv",
        "flw": "application/vnd.kde.kivio",
        "flx": "text/vnd.fmi.flexstor",
        "fly": "text/vnd.fly",
        "fm": "application/vnd.framemaker",
        "fnc": "application/vnd.frogans.fnc",
        "fo": "application/vnd.software602.filler.form+xml",
        "for": "text/x-fortran",
        "fpx": "image/vnd.fpx",
        "frame": "application/vnd.framemaker",
        "fsc": "application/vnd.fsc.weblaunch",
        "fst": "image/vnd.fst",
        "ftc": "application/vnd.fluxtime.clip",
        "fti": "application/vnd.anser-web-funds-transfer-initiation",
        "fvt": "video/vnd.fvt",
        "fxp": "application/vnd.adobe.fxp",
        "fxpl": "application/vnd.adobe.fxp",
        "fzs": "application/vnd.fuzzysheet",
        "g2w": "application/vnd.geoplan",
        "g3": "image/g3fax",
        "g3w": "application/vnd.geospace",
        "gac": "application/vnd.groove-account",
        "gam": "application/x-tads",
        "gbr": "application/rpki-ghostbusters",
        "gca": "application/x-gca-compressed",
        "gdl": "model/vnd.gdl",
        "gdoc": "application/vnd.google-apps.document",
        "geo": "application/vnd.dynageo",
        "geojson": "application/geo+json",
        "gex": "application/vnd.geometry-explorer",
        "ggb": "application/vnd.geogebra.file",
        "ggt": "application/vnd.geogebra.tool",
        "ghf": "application/vnd.groove-help",
        "gif": "image/gif",
        "gim": "application/vnd.groove-identity-message",
        "glb": "model/gltf-binary",
        "gltf": "model/gltf+json",
        "gml": "application/gml+xml",
        "gmx": "application/vnd.gmx",
        "gnumeric": "application/x-gnumeric",
        "gph": "application/vnd.flographit",
        "gpx": "application/gpx+xml",
        "gqf": "application/vnd.grafeq",
        "gqs": "application/vnd.grafeq",
        "gram": "application/srgs",
        "gramps": "application/x-gramps-xml",
        "gre": "application/vnd.geometry-explorer",
        "grv": "application/vnd.groove-injector",
        "grxml": "application/srgs+xml",
        "gsf": "application/x-font-ghostscript",
        "gsheet": "application/vnd.google-apps.spreadsheet",
        "gslides": "application/vnd.google-apps.presentation",
        "gtar": "application/x-gtar",
        "gtm": "application/vnd.groove-tool-message",
        "gtw": "model/vnd.gtw",
        "gv": "text/vnd.graphviz",
        "gxf": "application/gxf",
        "gxt": "application/vnd.geonext",
        "gz": "application/gzip",
        "h": "text/x-c",
        "h261": "video/h261",
        "h263": "video/h263",
        "h264": "video/h264",
        "hal": "application/vnd.hal+xml",
        "hbci": "application/vnd.hbci",
        "hbs": "text/x-handlebars-template",
        "hdd": "application/x-virtualbox-hdd",
        "hdf": "application/x-hdf",
        "heic": "image/heic",
        "heics": "image/heic-sequence",
        "heif": "image/heif",
        "heifs": "image/heif-sequence",
        "hej2": "image/hej2k",
        "held": "application/atsc-held+xml",
        "hh": "text/x-c",
        "hjson": "application/hjson",
        "hlp": "application/winhlp",
        "hpgl": "application/vnd.hp-hpgl",
        "hpid": "application/vnd.hp-hpid",
        "hps": "application/vnd.hp-hps",
        "hqx": "application/mac-binhex40",
        "hsj2": "image/hsj2",
        "htc": "text/x-component",
        "htke": "application/vnd.kenameaapp",
        "htm": "text/html",
        "html": "text/html",
        "hvd": "application/vnd.yamaha.hv-dic",
        "hvp": "application/vnd.yamaha.hv-voice",
        "hvs": "application/vnd.yamaha.hv-script",
        "i2g": "application/vnd.intergeo",
        "icc": "application/vnd.iccprofile",
        "ice": "x-conference/x-cooltalk",
        "icm": "application/vnd.iccprofile",
        "ico": "image/x-icon",
        "ics": "text/calendar",
        "ief": "image/ief",
        "ifb": "text/calendar",
        "ifm": "application/vnd.shana.informed.formdata",
        "iges": "model/iges",
        "igl": "application/vnd.igloader",
        "igm": "application/vnd.insors.igm",
        "igs": "model/iges",
        "igx": "application/vnd.micrografx.igx",
        "iif": "application/vnd.shana.informed.interchange",
        "img": "application/octet-stream",
        "imp": "application/vnd.accpac.simply.imp",
        "ims": "application/vnd.ms-ims",
        "in": "text/plain",
        "ini": "text/plain",
        "ink": "application/inkml+xml",
        "inkml": "application/inkml+xml",
        "install": "application/x-install-instructions",
        "iota": "application/vnd.astraea-software.iota",
        "ipfix": "application/ipfix",
        "ipk": "application/vnd.shana.informed.package",
        "irm": "application/vnd.ibm.rights-management",
        "irp": "application/vnd.irepository.package+xml",
        "iso": "application/x-iso9660-image",
        "itp": "application/vnd.shana.informed.formtemplate",
        "its": "application/its+xml",
        "ivp": "application/vnd.immervision-ivp",
        "ivu": "application/vnd.immervision-ivu",
        "jad": "text/vnd.sun.j2me.app-descriptor",
        "jade": "text/jade",
        "jam": "application/vnd.jam",
        "jar": "application/java-archive",
        "jardiff": "application/x-java-archive-diff",
        "java": "text/x-java-source",
        "jhc": "image/jphc",
        "jisp": "application/vnd.jisp",
        "jls": "image/jls",
        "jlt": "application/vnd.hp-jlyt",
        "jng": "image/x-jng",
        "jnlp": "application/x-java-jnlp-file",
        "joda": "application/vnd.joost.joda-archive",
        "jp2": "image/jp2",
        "jpe": "image/jpeg",
        "jpeg": "image/jpeg",
        "jpf": "image/jpx",
        "jpg": "image/jpeg",
        "jpg2": "image/jp2",
        "jpgm": "video/jpm",
        "jpgv": "video/jpeg",
        "jph": "image/jph",
        "jpm": "video/jpm",
        "jpx": "image/jpx",
        "js": "application/javascript",
        "json": "application/json",
        "json5": "application/json5",
        "jsonld": "application/ld+json",
        "jsonml": "application/jsonml+json",
        "jsx": "text/jsx",
        "jxr": "image/jxr",
        "jxra": "image/jxra",
        "jxrs": "image/jxrs",
        "jxs": "image/jxs",
        "jxsc": "image/jxsc",
        "jxsi": "image/jxsi",
        "jxss": "image/jxss",
        "kar": "audio/midi",
        "karbon": "application/vnd.kde.karbon",
        "kdbx": "application/x-keepass2",
        "key": "application/vnd.apple.keynote",
        "kfo": "application/vnd.kde.kformula",
        "kia": "application/vnd.kidspiration",
        "kml": "application/vnd.google-earth.kml+xml",
        "kmz": "application/vnd.google-earth.kmz",
        "kne": "application/vnd.kinar",
        "knp": "application/vnd.kinar",
        "kon": "application/vnd.kde.kontour",
        "kpr": "application/vnd.kde.kpresenter",
        "kpt": "application/vnd.kde.kpresenter",
        "kpxx": "application/vnd.ds-keypoint",
        "ksp": "application/vnd.kde.kspread",
        "ktr": "application/vnd.kahootz",
        "ktx": "image/ktx",
        "ktx2": "image/ktx2",
        "ktz": "application/vnd.kahootz",
        "kwd": "application/vnd.kde.kword",
        "kwt": "application/vnd.kde.kword",
        "lasxml": "application/vnd.las.las+xml",
        "latex": "application/x-latex",
        "lbd": "application/vnd.llamagraphics.life-balance.desktop",
        "lbe": "application/vnd.llamagraphics.life-balance.exchange+xml",
        "les": "application/vnd.hhe.lesson-player",
        "less": "text/less",
        "lgr": "application/lgr+xml",
        "lha": "application/x-lzh-compressed",
        "link66": "application/vnd.route66.link66+xml",
        "list": "text/plain",
        "list3820": "application/vnd.ibm.modcap",
        "listafp": "application/vnd.ibm.modcap",
        "litcoffee": "text/coffeescript",
        "lnk": "application/x-ms-shortcut",
        "log": "text/plain",
        "lostxml": "application/lost+xml",
        "lrf": "application/octet-stream",
        "lrm": "application/vnd.ms-lrm",
        "ltf": "application/vnd.frogans.ltf",
        "lua": "text/x-lua",
        "luac": "application/x-lua-bytecode",
        "lvp": "audio/vnd.lucent.voice",
        "lwp": "application/vnd.lotus-wordpro",
        "lzh": "application/x-lzh-compressed",
        "m13": "application/x-msmediaview",
        "m14": "application/x-msmediaview",
        "m1v": "video/mpeg",
        "m21": "application/mp21",
        "m2a": "audio/mpeg",
        "m2v": "video/mpeg",
        "m3a": "audio/mpeg",
        "m3u": "audio/x-mpegurl",
        "m3u8": "application/vnd.apple.mpegurl",
        "m4a": "audio/x-m4a",
        "m4p": "application/mp4",
        "m4s": "video/iso.segment",
        "m4u": "video/vnd.mpegurl",
        "m4v": "video/x-m4v",
        "ma": "application/mathematica",
        "mads": "application/mads+xml",
        "maei": "application/mmt-aei+xml",
        "mag": "application/vnd.ecowin.chart",
        "maker": "application/vnd.framemaker",
        "man": "text/troff",
        "manifest": "text/cache-manifest",
        "map": "application/json",
        "mar": "application/octet-stream",
        "markdown": "text/markdown",
        "mathml": "application/mathml+xml",
        "mb": "application/mathematica",
        "mbk": "application/vnd.mobius.mbk",
        "mbox": "application/mbox",
        "mc1": "application/vnd.medcalcdata",
        "mcd": "application/vnd.mcd",
        "mcurl": "text/vnd.curl.mcurl",
        "md": "text/markdown",
        "mdb": "application/x-msaccess",
        "mdi": "image/vnd.ms-modi",
        "mdx": "text/mdx",
        "me": "text/troff",
        "mesh": "model/mesh",
        "meta4": "application/metalink4+xml",
        "metalink": "application/metalink+xml",
        "mets": "application/mets+xml",
        "mfm": "application/vnd.mfmp",
        "mft": "application/rpki-manifest",
        "mgp": "application/vnd.osgeo.mapguide.package",
        "mgz": "application/vnd.proteus.magazine",
        "mid": "audio/midi",
        "midi": "audio/midi",
        "mie": "application/x-mie",
        "mif": "application/vnd.mif",
        "mime": "message/rfc822",
        "mj2": "video/mj2",
        "mjp2": "video/mj2",
        "mjs": "application/javascript",
        "mk3d": "video/x-matroska",
        "mka": "audio/x-matroska",
        "mkd": "text/x-markdown",
        "mks": "video/x-matroska",
        "mkv": "video/x-matroska",
        "mlp": "application/vnd.dolby.mlp",
        "mmd": "application/vnd.chipnuts.karaoke-mmd",
        "mmf": "application/vnd.smaf",
        "mml": "text/mathml",
        "mmr": "image/vnd.fujixerox.edmics-mmr",
        "mng": "video/x-mng",
        "mny": "application/x-msmoney",
        "mobi": "application/x-mobipocket-ebook",
        "mods": "application/mods+xml",
        "mov": "video/quicktime",
        "movie": "video/x-sgi-movie",
        "mp2": "audio/mpeg",
        "mp21": "application/mp21",
        "mp2a": "audio/mpeg",
        "mp3": "audio/mpeg",
        "mp4": "video/mp4",
        "mp4a": "audio/mp4",
        "mp4s": "application/mp4",
        "mp4v": "video/mp4",
        "mpc": "application/vnd.mophun.certificate",
        "mpd": "application/dash+xml",
        "mpe": "video/mpeg",
        "mpeg": "video/mpeg",
        "mpg": "video/mpeg",
        "mpg4": "video/mp4",
        "mpga": "audio/mpeg",
        "mpkg": "application/vnd.apple.installer+xml",
        "mpm": "application/vnd.blueice.multipass",
        "mpn": "application/vnd.mophun.application",
        "mpp": "application/vnd.ms-project",
        "mpt": "application/vnd.ms-project",
        "mpy": "application/vnd.ibm.minipay",
        "mqy": "application/vnd.mobius.mqy",
        "mrc": "application/marc",
        "mrcx": "application/marcxml+xml",
        "ms": "text/troff",
        "mscml": "application/mediaservercontrol+xml",
        "mseed": "application/vnd.fdsn.mseed",
        "mseq": "application/vnd.mseq",
        "msf": "application/vnd.epson.msf",
        "msg": "application/vnd.ms-outlook",
        "msh": "model/mesh",
        "msi": "application/x-msdownload",
        "msl": "application/vnd.mobius.msl",
        "msm": "application/octet-stream",
        "msp": "application/octet-stream",
        "msty": "application/vnd.muvee.style",
        "mtl": "model/mtl",
        "mts": "model/vnd.mts",
        "mus": "application/vnd.musician",
        "musd": "application/mmt-usd+xml",
        "musicxml": "application/vnd.recordare.musicxml+xml",
        "mvb": "application/x-msmediaview",
        "mwf": "application/vnd.mfer",
        "mxf": "application/mxf",
        "mxl": "application/vnd.recordare.musicxml",
        "mxmf": "audio/mobile-xmf",
        "mxml": "application/xv+xml",
        "mxs": "application/vnd.triscape.mxs",
        "mxu": "video/vnd.mpegurl",
        "n-gage": "application/vnd.nokia.n-gage.symbian.install",
        "n3": "text/n3",
        "nb": "application/mathematica",
        "nbp": "application/vnd.wolfram.player",
        "nc": "application/x-netcdf",
        "ncx": "application/x-dtbncx+xml",
        "nfo": "text/x-nfo",
        "ngdat": "application/vnd.nokia.n-gage.data",
        "nitf": "application/vnd.nitf",
        "nlu": "application/vnd.neurolanguage.nlu",
        "nml": "application/vnd.enliven",
        "nnd": "application/vnd.noblenet-directory",
        "nns": "application/vnd.noblenet-sealer",
        "nnw": "application/vnd.noblenet-web",
        "npx": "image/vnd.net-fpx",
        "nq": "application/n-quads",
        "nsc": "application/x-conference",
        "nsf": "application/vnd.lotus-notes",
        "nt": "application/n-triples",
        "ntf": "application/vnd.nitf",
        "numbers": "application/vnd.apple.numbers",
        "nzb": "application/x-nzb",
        "oa2": "application/vnd.fujitsu.oasys2",
        "oa3": "application/vnd.fujitsu.oasys3",
        "oas": "application/vnd.fujitsu.oasys",
        "obd": "application/x-msbinder",
        "obgx": "application/vnd.openblox.game+xml",
        "obj": "model/obj",
        "oda": "application/oda",
        "odb": "application/vnd.oasis.opendocument.database",
        "odc": "application/vnd.oasis.opendocument.chart",
        "odf": "application/vnd.oasis.opendocument.formula",
        "odft": "application/vnd.oasis.opendocument.formula-template",
        "odg": "application/vnd.oasis.opendocument.graphics",
        "odi": "application/vnd.oasis.opendocument.image",
        "odm": "application/vnd.oasis.opendocument.text-master",
        "odp": "application/vnd.oasis.opendocument.presentation",
        "ods": "application/vnd.oasis.opendocument.spreadsheet",
        "odt": "application/vnd.oasis.opendocument.text",
        "oga": "audio/ogg",
        "ogex": "model/vnd.opengex",
        "ogg": "audio/ogg",
        "ogv": "video/ogg",
        "ogx": "application/ogg",
        "omdoc": "application/omdoc+xml",
        "onepkg": "application/onenote",
        "onetmp": "application/onenote",
        "onetoc": "application/onenote",
        "onetoc2": "application/onenote",
        "opf": "application/oebps-package+xml",
        "opml": "text/x-opml",
        "oprc": "application/vnd.palm",
        "opus": "audio/ogg",
        "org": "text/x-org",
        "osf": "application/vnd.yamaha.openscoreformat",
        "osfpvg": "application/vnd.yamaha.openscoreformat.osfpvg+xml",
        "osm": "application/vnd.openstreetmap.data+xml",
        "otc": "application/vnd.oasis.opendocument.chart-template",
        "otf": "font/otf",
        "otg": "application/vnd.oasis.opendocument.graphics-template",
        "oth": "application/vnd.oasis.opendocument.text-web",
        "oti": "application/vnd.oasis.opendocument.image-template",
        "otp": "application/vnd.oasis.opendocument.presentation-template",
        "ots": "application/vnd.oasis.opendocument.spreadsheet-template",
        "ott": "application/vnd.oasis.opendocument.text-template",
        "ova": "application/x-virtualbox-ova",
        "ovf": "application/x-virtualbox-ovf",
        "owl": "application/rdf+xml",
        "oxps": "application/oxps",
        "oxt": "application/vnd.openofficeorg.extension",
        "p": "text/x-pascal",
        "p10": "application/pkcs10",
        "p12": "application/x-pkcs12",
        "p7b": "application/x-pkcs7-certificates",
        "p7c": "application/pkcs7-mime",
        "p7m": "application/pkcs7-mime",
        "p7r": "application/x-pkcs7-certreqresp",
        "p7s": "application/pkcs7-signature",
        "p8": "application/pkcs8",
        "pac": "application/x-ns-proxy-autoconfig",
        "pages": "application/vnd.apple.pages",
        "pas": "text/x-pascal",
        "paw": "application/vnd.pawaafile",
        "pbd": "application/vnd.powerbuilder6",
        "pbm": "image/x-portable-bitmap",
        "pcap": "application/vnd.tcpdump.pcap",
        "pcf": "application/x-font-pcf",
        "pcl": "application/vnd.hp-pcl",
        "pclxl": "application/vnd.hp-pclxl",
        "pct": "image/x-pict",
        "pcurl": "application/vnd.curl.pcurl",
        "pcx": "image/x-pcx",
        "pdb": "application/x-pilot",
        "pde": "text/x-processing",
        "pdf": "application/pdf",
        "pem": "application/x-x509-ca-cert",
        "pfa": "application/x-font-type1",
        "pfb": "application/x-font-type1",
        "pfm": "application/x-font-type1",
        "pfr": "application/font-tdpfr",
        "pfx": "application/x-pkcs12",
        "pgm": "image/x-portable-graymap",
        "pgn": "application/x-chess-pgn",
        "pgp": "application/pgp-encrypted",
        "php": "application/x-httpd-php",
        "pic": "image/x-pict",
        "pkg": "application/octet-stream",
        "pki": "application/pkixcmp",
        "pkipath": "application/pkix-pkipath",
        "pkpass": "application/vnd.apple.pkpass",
        "pl": "application/x-perl",
        "plb": "application/vnd.3gpp.pic-bw-large",
        "plc": "application/vnd.mobius.plc",
        "plf": "application/vnd.pocketlearn",
        "pls": "application/pls+xml",
        "pm": "application/x-perl",
        "pml": "application/vnd.ctc-posml",
        "png": "image/png",
        "pnm": "image/x-portable-anymap",
        "portpkg": "application/vnd.macports.portpkg",
        "pot": "application/vnd.ms-powerpoint",
        "potm": "application/vnd.ms-powerpoint.template.macroenabled.12",
        "potx": "application/vnd.openxmlformats-officedocument.presentationml.template",
        "ppam": "application/vnd.ms-powerpoint.addin.macroenabled.12",
        "ppd": "application/vnd.cups-ppd",
        "ppm": "image/x-portable-pixmap",
        "pps": "application/vnd.ms-powerpoint",
        "ppsm": "application/vnd.ms-powerpoint.slideshow.macroenabled.12",
        "ppsx": "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
        "ppt": "application/vnd.ms-powerpoint",
        "pptm": "application/vnd.ms-powerpoint.presentation.macroenabled.12",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "pqa": "application/vnd.palm",
        "prc": "application/x-pilot",
        "pre": "application/vnd.lotus-freelance",
        "prf": "application/pics-rules",
        "provx": "application/provenance+xml",
        "ps": "application/postscript",
        "psb": "application/vnd.3gpp.pic-bw-small",
        "psd": "image/vnd.adobe.photoshop",
        "psf": "application/x-font-linux-psf",
        "pskcxml": "application/pskc+xml",
        "pti": "image/prs.pti",
        "ptid": "application/vnd.pvi.ptid1",
        "pub": "application/x-mspublisher",
        "pvb": "application/vnd.3gpp.pic-bw-var",
        "pwn": "application/vnd.3m.post-it-notes",
        "pya": "audio/vnd.ms-playready.media.pya",
        "pyv": "video/vnd.ms-playready.media.pyv",
        "qam": "application/vnd.epson.quickanime",
        "qbo": "application/vnd.intu.qbo",
        "qfx": "application/vnd.intu.qfx",
        "qps": "application/vnd.publishare-delta-tree",
        "qt": "video/quicktime",
        "qwd": "application/vnd.quark.quarkxpress",
        "qwt": "application/vnd.quark.quarkxpress",
        "qxb": "application/vnd.quark.quarkxpress",
        "qxd": "application/vnd.quark.quarkxpress",
        "qxl": "application/vnd.quark.quarkxpress",
        "qxt": "application/vnd.quark.quarkxpress",
        "ra": "audio/x-realaudio",
        "ram": "audio/x-pn-realaudio",
        "raml": "application/raml+yaml",
        "rapd": "application/route-apd+xml",
        "rar": "application/x-rar-compressed",
        "ras": "image/x-cmu-raster",
        "rcprofile": "application/vnd.ipunplugged.rcprofile",
        "rdf": "application/rdf+xml",
        "rdz": "application/vnd.data-vision.rdz",
        "relo": "application/p2p-overlay+xml",
        "rep": "application/vnd.businessobjects",
        "res": "application/x-dtbresource+xml",
        "rgb": "image/x-rgb",
        "rif": "application/reginfo+xml",
        "rip": "audio/vnd.rip",
        "ris": "application/x-research-info-systems",
        "rl": "application/resource-lists+xml",
        "rlc": "image/vnd.fujixerox.edmics-rlc",
        "rld": "application/resource-lists-diff+xml",
        "rm": "application/vnd.rn-realmedia",
        "rmi": "audio/midi",
        "rmp": "audio/x-pn-realaudio-plugin",
        "rms": "application/vnd.jcp.javame.midlet-rms",
        "rmvb": "application/vnd.rn-realmedia-vbr",
        "rnc": "application/relax-ng-compact-syntax",
        "rng": "application/xml",
        "roa": "application/rpki-roa",
        "roff": "text/troff",
        "rp9": "application/vnd.cloanto.rp9",
        "rpm": "application/x-redhat-package-manager",
        "rpss": "application/vnd.nokia.radio-presets",
        "rpst": "application/vnd.nokia.radio-preset",
        "rq": "application/sparql-query",
        "rs": "application/rls-services+xml",
        "rsat": "application/atsc-rsat+xml",
        "rsd": "application/rsd+xml",
        "rsheet": "application/urc-ressheet+xml",
        "rss": "application/rss+xml",
        "rtf": "text/rtf",
        "rtx": "text/richtext",
        "run": "application/x-makeself",
        "rusd": "application/route-usd+xml",
        "s": "text/x-asm",
        "s3m": "audio/s3m",
        "saf": "application/vnd.yamaha.smaf-audio",
        "sass": "text/x-sass",
        "sbml": "application/sbml+xml",
        "sc": "application/vnd.ibm.secure-container",
        "scd": "application/x-msschedule",
        "scm": "application/vnd.lotus-screencam",
        "scq": "application/scvp-cv-request",
        "scs": "application/scvp-cv-response",
        "scss": "text/x-scss",
        "scurl": "text/vnd.curl.scurl",
        "sda": "application/vnd.stardivision.draw",
        "sdc": "application/vnd.stardivision.calc",
        "sdd": "application/vnd.stardivision.impress",
        "sdkd": "application/vnd.solent.sdkm+xml",
        "sdkm": "application/vnd.solent.sdkm+xml",
        "sdp": "application/sdp",
        "sdw": "application/vnd.stardivision.writer",
        "sea": "application/x-sea",
        "see": "application/vnd.seemail",
        "seed": "application/vnd.fdsn.seed",
        "sema": "application/vnd.sema",
        "semd": "application/vnd.semd",
        "semf": "application/vnd.semf",
        "senmlx": "application/senml+xml",
        "sensmlx": "application/sensml+xml",
        "ser": "application/java-serialized-object",
        "setpay": "application/set-payment-initiation",
        "setreg": "application/set-registration-initiation",
        "sfd-hdstx": "application/vnd.hydrostatix.sof-data",
        "sfs": "application/vnd.spotfire.sfs",
        "sfv": "text/x-sfv",
        "sgi": "image/sgi",
        "sgl": "application/vnd.stardivision.writer-global",
        "sgm": "text/sgml",
        "sgml": "text/sgml",
        "sh": "application/x-sh",
        "shar": "application/x-shar",
        "shex": "text/shex",
        "shf": "application/shf+xml",
        "shtml": "text/html",
        "sid": "image/x-mrsid-image",
        "sieve": "application/sieve",
        "sig": "application/pgp-signature",
        "sil": "audio/silk",
        "silo": "model/mesh",
        "sis": "application/vnd.symbian.install",
        "sisx": "application/vnd.symbian.install",
        "sit": "application/x-stuffit",
        "sitx": "application/x-stuffitx",
        "siv": "application/sieve",
        "skd": "application/vnd.koan",
        "skm": "application/vnd.koan",
        "skp": "application/vnd.koan",
        "skt": "application/vnd.koan",
        "sldm": "application/vnd.ms-powerpoint.slide.macroenabled.12",
        "sldx": "application/vnd.openxmlformats-officedocument.presentationml.slide",
        "slim": "text/slim",
        "slm": "text/slim",
        "sls": "application/route-s-tsid+xml",
        "slt": "application/vnd.epson.salt",
        "sm": "application/vnd.stepmania.stepchart",
        "smf": "application/vnd.stardivision.math",
        "smi": "application/smil+xml",
        "smil": "application/smil+xml",
        "smv": "video/x-smv",
        "smzip": "application/vnd.stepmania.package",
        "snd": "audio/basic",
        "snf": "application/x-font-snf",
        "so": "application/octet-stream",
        "spc": "application/x-pkcs7-certificates",
        "spdx": "text/spdx",
        "spf": "application/vnd.yamaha.smaf-phrase",
        "spl": "application/x-futuresplash",
        "spot": "text/vnd.in3d.spot",
        "spp": "application/scvp-vp-response",
        "spq": "application/scvp-vp-request",
        "spx": "audio/ogg",
        "sql": "application/x-sql",
        "src": "application/x-wais-source",
        "srt": "application/x-subrip",
        "sru": "application/sru+xml",
        "srx": "application/sparql-results+xml",
        "ssdl": "application/ssdl+xml",
        "sse": "application/vnd.kodak-descriptor",
        "ssf": "application/vnd.epson.ssf",
        "ssml": "application/ssml+xml",
        "st": "application/vnd.sailingtracker.track",
        "stc": "application/vnd.sun.xml.calc.template",
        "std": "application/vnd.sun.xml.draw.template",
        "stf": "application/vnd.wt.stf",
        "sti": "application/vnd.sun.xml.impress.template",
        "stk": "application/hyperstudio",
        "stl": "model/stl",
        "str": "application/vnd.pg.format",
        "stw": "application/vnd.sun.xml.writer.template",
        "styl": "text/stylus",
        "stylus": "text/stylus",
        "sub": "text/vnd.dvb.subtitle",
        "sus": "application/vnd.sus-calendar",
        "susp": "application/vnd.sus-calendar",
        "sv4cpio": "application/x-sv4cpio",
        "sv4crc": "application/x-sv4crc",
        "svc": "application/vnd.dvb.service",
        "svd": "application/vnd.svd",
        "svg": "image/svg+xml",
        "svgz": "image/svg+xml",
        "swa": "application/x-director",
        "swf": "application/x-shockwave-flash",
        "swi": "application/vnd.aristanetworks.swi",
        "swidtag": "application/swid+xml",
        "sxc": "application/vnd.sun.xml.calc",
        "sxd": "application/vnd.sun.xml.draw",
        "sxg": "application/vnd.sun.xml.writer.global",
        "sxi": "application/vnd.sun.xml.impress",
        "sxm": "application/vnd.sun.xml.math",
        "sxw": "application/vnd.sun.xml.writer",
        "t": "text/troff",
        "t3": "application/x-t3vm-image",
        "t38": "image/t38",
        "taglet": "application/vnd.mynfc",
        "tao": "application/vnd.tao.intent-module-archive",
        "tap": "image/vnd.tencent.tap",
        "tar": "application/x-tar",
        "tcap": "application/vnd.3gpp2.tcap",
        "tcl": "application/x-tcl",
        "td": "application/urc-targetdesc+xml",
        "teacher": "application/vnd.smart.teacher",
        "tei": "application/tei+xml",
        "teicorpus": "application/tei+xml",
        "tex": "application/x-tex",
        "texi": "application/x-texinfo",
        "texinfo": "application/x-texinfo",
        "text": "text/plain",
        "tfi": "application/thraud+xml",
        "tfm": "application/x-tex-tfm",
        "tfx": "image/tiff-fx",
        "tga": "image/x-tga",
        "thmx": "application/vnd.ms-officetheme",
        "tif": "image/tiff",
        "tiff": "image/tiff",
        "tk": "application/x-tcl",
        "tmo": "application/vnd.tmobile-livetv",
        "toml": "application/toml",
        "torrent": "application/x-bittorrent",
        "tpl": "application/vnd.groove-tool-template",
        "tpt": "application/vnd.trid.tpt",
        "tr": "text/troff",
        "tra": "application/vnd.trueapp",
        "trm": "application/x-msterminal",
        "ts": "video/mp2t",
        "tsd": "application/timestamped-data",
        "tsv": "text/tab-separated-values",
        "ttc": "font/collection",
        "ttf": "font/ttf",
        "ttl": "text/turtle",
        "ttml": "application/ttml+xml",
        "twd": "application/vnd.simtech-mindmapper",
        "twds": "application/vnd.simtech-mindmapper",
        "txd": "application/vnd.genomatix.tuxedo",
        "txf": "application/vnd.mobius.txf",
        "txt": "text/plain",
        "u32": "application/x-authorware-bin",
        "u8dsn": "message/global-delivery-status",
        "u8hdr": "message/global-headers",
        "u8mdn": "message/global-disposition-notification",
        "u8msg": "message/global",
        "ubj": "application/ubjson",
        "udeb": "application/x-debian-package",
        "ufd": "application/vnd.ufdl",
        "ufdl": "application/vnd.ufdl",
        "ulx": "application/x-glulx",
        "umj": "application/vnd.umajin",
        "unityweb": "application/vnd.unity",
        "uoml": "application/vnd.uoml+xml",
        "uri": "text/uri-list",
        "uris": "text/uri-list",
        "urls": "text/uri-list",
        "usdz": "model/vnd.usdz+zip",
        "ustar": "application/x-ustar",
        "utz": "application/vnd.uiq.theme",
        "uu": "text/x-uuencode",
        "uva": "audio/vnd.dece.audio",
        "uvd": "application/vnd.dece.data",
        "uvf": "application/vnd.dece.data",
        "uvg": "image/vnd.dece.graphic",
        "uvh": "video/vnd.dece.hd",
        "uvi": "image/vnd.dece.graphic",
        "uvm": "video/vnd.dece.mobile",
        "uvp": "video/vnd.dece.pd",
        "uvs": "video/vnd.dece.sd",
        "uvt": "application/vnd.dece.ttml+xml",
        "uvu": "video/vnd.uvvu.mp4",
        "uvv": "video/vnd.dece.video",
        "uvva": "audio/vnd.dece.audio",
        "uvvd": "application/vnd.dece.data",
        "uvvf": "application/vnd.dece.data",
        "uvvg": "image/vnd.dece.graphic",
        "uvvh": "video/vnd.dece.hd",
        "uvvi": "image/vnd.dece.graphic",
        "uvvm": "video/vnd.dece.mobile",
        "uvvp": "video/vnd.dece.pd",
        "uvvs": "video/vnd.dece.sd",
        "uvvt": "application/vnd.dece.ttml+xml",
        "uvvu": "video/vnd.uvvu.mp4",
        "uvvv": "video/vnd.dece.video",
        "uvvx": "application/vnd.dece.unspecified",
        "uvvz": "application/vnd.dece.zip",
        "uvx": "application/vnd.dece.unspecified",
        "uvz": "application/vnd.dece.zip",
        "vbox": "application/x-virtualbox-vbox",
        "vbox-extpack": "application/x-virtualbox-vbox-extpack",
        "vcard": "text/vcard",
        "vcd": "application/x-cdlink",
        "vcf": "text/x-vcard",
        "vcg": "application/vnd.groove-vcard",
        "vcs": "text/x-vcalendar",
        "vcx": "application/vnd.vcx",
        "vdi": "application/x-virtualbox-vdi",
        "vhd": "application/x-virtualbox-vhd",
        "vis": "application/vnd.visionary",
        "viv": "video/vnd.vivo",
        "vmdk": "application/x-virtualbox-vmdk",
        "vob": "video/x-ms-vob",
        "vor": "application/vnd.stardivision.writer",
        "vox": "application/x-authorware-bin",
        "vrml": "model/vrml",
        "vsd": "application/vnd.visio",
        "vsf": "application/vnd.vsf",
        "vss": "application/vnd.visio",
        "vst": "application/vnd.visio",
        "vsw": "application/vnd.visio",
        "vtf": "image/vnd.valve.source.texture",
        "vtt": "text/vtt",
        "vtu": "model/vnd.vtu",
        "vxml": "application/voicexml+xml",
        "w3d": "application/x-director",
        "wad": "application/x-doom",
        "wadl": "application/vnd.sun.wadl+xml",
        "war": "application/java-archive",
        "wasm": "application/wasm",
        "wav": "audio/x-wav",
        "wax": "audio/x-ms-wax",
        "wbmp": "image/vnd.wap.wbmp",
        "wbs": "application/vnd.criticaltools.wbs+xml",
        "wbxml": "application/vnd.wap.wbxml",
        "wcm": "application/vnd.ms-works",
        "wdb": "application/vnd.ms-works",
        "wdp": "image/vnd.ms-photo",
        "weba": "audio/webm",
        "webapp": "application/x-web-app-manifest+json",
        "webm": "video/webm",
        "webmanifest": "application/manifest+json",
        "webp": "image/webp",
        "wg": "application/vnd.pmi.widget",
        "wgt": "application/widget",
        "wks": "application/vnd.ms-works",
        "wm": "video/x-ms-wm",
        "wma": "audio/x-ms-wma",
        "wmd": "application/x-ms-wmd",
        "wmf": "image/wmf",
        "wml": "text/vnd.wap.wml",
        "wmlc": "application/vnd.wap.wmlc",
        "wmls": "text/vnd.wap.wmlscript",
        "wmlsc": "application/vnd.wap.wmlscriptc",
        "wmv": "video/x-ms-wmv",
        "wmx": "video/x-ms-wmx",
        "wmz": "application/x-msmetafile",
        "woff": "font/woff",
        "woff2": "font/woff2",
        "wpd": "application/vnd.wordperfect",
        "wpl": "application/vnd.ms-wpl",
        "wps": "application/vnd.ms-works",
        "wqd": "application/vnd.wqd",
        "wri": "application/x-mswrite",
        "wrl": "model/vrml",
        "wsc": "message/vnd.wfa.wsc",
        "wsdl": "application/wsdl+xml",
        "wspolicy": "application/wspolicy+xml",
        "wtb": "application/vnd.webturbo",
        "wvx": "video/x-ms-wvx",
        "x32": "application/x-authorware-bin",
        "x3d": "model/x3d+xml",
        "x3db": "model/x3d+fastinfoset",
        "x3dbz": "model/x3d+binary",
        "x3dv": "model/x3d-vrml",
        "x3dvz": "model/x3d+vrml",
        "x3dz": "model/x3d+xml",
        "x_b": "model/vnd.parasolid.transmit.binary",
        "x_t": "model/vnd.parasolid.transmit.text",
        "xaml": "application/xaml+xml",
        "xap": "application/x-silverlight-app",
        "xar": "application/vnd.xara",
        "xav": "application/xcap-att+xml",
        "xbap": "application/x-ms-xbap",
        "xbd": "application/vnd.fujixerox.docuworks.binder",
        "xbm": "image/x-xbitmap",
        "xca": "application/xcap-caps+xml",
        "xcs": "application/calendar+xml",
        "xdf": "application/xcap-diff+xml",
        "xdm": "application/vnd.syncml.dm+xml",
        "xdp": "application/vnd.adobe.xdp+xml",
        "xdssc": "application/dssc+xml",
        "xdw": "application/vnd.fujixerox.docuworks",
        "xel": "application/xcap-el+xml",
        "xenc": "application/xenc+xml",
        "xer": "application/patch-ops-error+xml",
        "xfdf": "application/vnd.adobe.xfdf",
        "xfdl": "application/vnd.xfdl",
        "xht": "application/xhtml+xml",
        "xhtml": "application/xhtml+xml",
        "xhvml": "application/xv+xml",
        "xif": "image/vnd.xiff",
        "xla": "application/vnd.ms-excel",
        "xlam": "application/vnd.ms-excel.addin.macroenabled.12",
        "xlc": "application/vnd.ms-excel",
        "xlf": "application/xliff+xml",
        "xlm": "application/vnd.ms-excel",
        "xls": "application/vnd.ms-excel",
        "xlsb": "application/vnd.ms-excel.sheet.binary.macroenabled.12",
        "xlsm": "application/vnd.ms-excel.sheet.macroenabled.12",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xlt": "application/vnd.ms-excel",
        "xltm": "application/vnd.ms-excel.template.macroenabled.12",
        "xltx": "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
        "xlw": "application/vnd.ms-excel",
        "xm": "audio/xm",
        "xml": "text/xml",
        "xns": "application/xcap-ns+xml",
        "xo": "application/vnd.olpc-sugar",
        "xop": "application/xop+xml",
        "xpi": "application/x-xpinstall",
        "xpl": "application/xproc+xml",
        "xpm": "image/x-xpixmap",
        "xpr": "application/vnd.is-xpr",
        "xps": "application/vnd.ms-xpsdocument",
        "xpw": "application/vnd.intercon.formnet",
        "xpx": "application/vnd.intercon.formnet",
        "xsd": "application/xml",
        "xsl": "application/xslt+xml",
        "xslt": "application/xslt+xml",
        "xsm": "application/vnd.syncml+xml",
        "xspf": "application/xspf+xml",
        "xul": "application/vnd.mozilla.xul+xml",
        "xvm": "application/xv+xml",
        "xvml": "application/xv+xml",
        "xwd": "image/x-xwindowdump",
        "xyz": "chemical/x-xyz",
        "xz": "application/x-xz",
        "yaml": "text/yaml",
        "yang": "application/yang",
        "yin": "application/yin+xml",
        "yml": "text/yaml",
        "ymp": "text/x-suse-ymp",
        "z1": "application/x-zmachine",
        "z2": "application/x-zmachine",
        "z3": "application/x-zmachine",
        "z4": "application/x-zmachine",
        "z5": "application/x-zmachine",
        "z6": "application/x-zmachine",
        "z7": "application/x-zmachine",
        "z8": "application/x-zmachine",
        "zaz": "application/vnd.zzazz.deck+xml",
        "zip": "application/zip",
        "zir": "application/vnd.zul",
        "zirz": "application/vnd.zul",
        "zmm": "application/vnd.handheld-entertainment+xml"
    }
    if (typeof mime[ext] != "undefined") {
        result = mime[ext]
    }
    return result;
}

let multipartFormParser = class {
    /**
     	Multipart Parser (Finite State Machine)
    	usage:
    	var multipart = require('./multipart.js');
    	var body = multipart.DemoData(); 							   // raw body
    	var body = new Buffer(event['body-json'].toString(),'base64'); // AWS case
    	
    	var boundary = multipart.getBoundary(event.params.header['content-type']);
    	var parts = multipart.Parse(body,boundary);
    	
    	// each part is:
    	// { filename: 'A.txt', type: 'text/plain', data: <Buffer 41 41 41 41 42 42 42 42> }
    	author:  Cristian Salazar (christiansalazarh@gmail.com) www.chileshift.cl
    			 Twitter: @AmazonAwsChile
     */
    Parse(multipartBodyBuffer, boundary) {
        let process = function (part) {
            // will transform this object:
            // { header: 'Content-Disposition: form-data; name="uploads[]"; filename="A.txt"',
            //	 info: 'Content-Type: text/plain',
            //	 part: 'AAAABBBB' }
            // into this one:
            // { filename: 'A.txt', type: 'text/plain', data: <Buffer 41 41 41 41 42 42 42 42> }
            let obj = function (n = '') {
                let o, k, a, b;
                k = n.split('=');
                a = k[0].trim();
                b = JSON.parse(k[1].trim());
                o = {};
                o[a] = b;
                return o;
            }
            let header = part.header.split(';');
            let file = obj(header[2]);
            let contentType = part.info.split(':')[1].trim();
            file['type'] = contentType;
            file['data'] = Buffer.from(part.part);

            let fieldName = JSON.parse(header[1].split('=')[1].trim());
            return [fieldName, file];
        }

        let lastline = '';
        let header = '';
        let info = '';
        let state = 0;
        let buffer = [];
        let allParts = {};

        for (let i = 0; i < multipartBodyBuffer.length; i++) {
            let oneByte = multipartBodyBuffer[i];
            let prevByte = i > 0 ? multipartBodyBuffer[i - 1] : null;
            let newLineDetected = ((oneByte == 0x0a) && (prevByte == 0x0d)) ? true : false;
            let newLineChar = ((oneByte == 0x0a) || (oneByte == 0x0d)) ? true : false;

            if (!newLineChar)
                lastline += String.fromCharCode(oneByte);

            if ((0 == state) && newLineDetected) {
                if (("--" + boundary) == lastline) {
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
                if (lastline.length > (boundary.length + 4)) lastline = ''; // mem save
                if (((("--" + boundary) == lastline))) {
                    let j = buffer.length - lastline.length;
                    let part = buffer.slice(0, j - 1);
                    let p = {
                        header: header,
                        info: info,
                        part: part
                    };
                    let [fieldName, readyPart] = process(p);
                    allParts[fieldName] = readyPart;
                    // allParts.push(process(p));
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


    //  read the boundary from the content-type header sent by the http client
    //  this value may be similar to:
    //  'multipart/form-data; boundary=----WebKitFormBoundaryvm5A9tzU1ONaGP5B',
    getBoundary(header) {
        let items = header.split(';');
        if (items)
            for (let i = 0; i < items.length; i++) {
                let item = (new String(items[i])).trim();
                if (item.startsWith('boundary=')) {
                    let k = item.split('=');
                    return (new String(k[1])).trim();
                }
            }
        return "";
    }

}