module.exports = class extends Application.System.Controller {
    async notemplate() {
        return this.result;
    }
    async default () {
        let View_Template = new this.View('default.template');
        //small hack. do this to insure order of execution - some tags must be placed to body before they can be replaced with data
        View_Template.apply('content', this.result.content).value();
        //and then put other data
        View_Template.data(this.result);
        return await View_Template.render();
    }
    async error(result) {
        // Used when Router catches reject
        var View_Template = new this.View('error.template');
        console.log(result);
        View_Template.apply('content', result);
        return await View_Template.render();
    }

}