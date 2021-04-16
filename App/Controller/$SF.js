module.exports = class {
    constructor(req, res, result,current_controller,current_action,View_contexted){
        this.req = req;
        this.res = res;
        this.result = result
        this._controller = current_controller;
        this._action = current_action;
        this.View = View_contexted;
    }
    async _before()
    {
        return this.result;
    }
    async _after()
    {
        return this.result;
    }
}