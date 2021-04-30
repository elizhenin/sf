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
        Application.System.Session.middleware(req, res);
        this.Session = new Application.System.Session.instance(this.req.cookies.Session);

    }
    async _before() {
        return this.result;
    }

    async _after() {
        return this.result;
    }
}