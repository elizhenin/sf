//basic Sukina Framework controller
module.exports = class Controller {
    constructor(req, res, current_controller, current_action, current_route) {
        this.req = req;
        this.res = res;
        this.result = {}
        this._controller = current_controller;
        this._action = current_action;
        this._route = current_route;
        let i18n = {}
        i18n.lang = Object.keys(ObjSelector(Application, 'i18n', true))[0];
        if (empty(i18n.lang)) i18n.lang = null;
        this.i18n = i18n;
        //define context-specific View() function
        this.View = function (view_path) {
            return new Application.System.View(view_path, req, res, i18n.lang);
        }
        this.ViewJS = function (view_path) {
            return new Application.System.ViewJS(view_path, req, res, i18n.lang);
        }
        //define session instance
        try {
            this.Session = new Application.System.Session.instance(this.req[Application.System.Session._cookieName]);
        } catch (e) {}
    }
    async _before() {
        return this.result;
    }

    async _after() {
        let {
            JSDOM
        } = Application.lib.jsdom;

        let content_type = Application.System.MimeTypes['json'];
        if ("string" === typeof this.result) {
            content_type = Application.System.MimeTypes['html'];
            try {
                let document = new JSDOM(this.result);
                this.result = document.serialize();
                Application.System.InternalAPI.injectClientApiScript(this);
            } catch (e) {
                this.result = e.toString();
            }
        }

        this.res.setHeader('Content-Type', content_type);
        return this.result;
    }


}
