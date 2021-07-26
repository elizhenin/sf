//basic Sukina Framework controller
module.exports = class {
    constructor(req, res, current_controller, current_action) {
        this.req = req;
        this.res = res;
        this.result = {}
        this._controller = current_controller;
        this._action = current_action;

        //define context-specific View() function
        this.View = function (view_path) {
            return new Application.System.MarkerScript(view_path, req, res);
        }

        //define session instance
        try {
            this.Session = new Application.System.Session.instance(this.req.cookies[Application.System.Session._cookieName]);
        } catch (e) {}

    }
    async _before() {
        return this.result;
    }

    async _after() {
        let {
            JSDOM
        } = Application.lib.jsdom;

        if(typeof this.result == "string") {
            try {
                let document = new JSDOM(this.result);
                this.result = document.serialize();
                Application.System.InternalAPI.injectClientApiScript(this);
            } catch (e) {
                this.result = e.toString();
            }
        }

        return this.result;
    }


}
