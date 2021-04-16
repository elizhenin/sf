module.exports = class {
    constructor(req, res, result){
        this.req = req;
        this.res = res;
        this.result = result
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