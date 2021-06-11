module.exports = class extends Application.System.Controller {
   
    async _before(){
        this.template = 'default.template';
    }
    async _after () {
    let View_Template = new View(this.template);
    //small hack. do this to insure order of execution - some tags must be placed to body before they can be replaced with data
    View_Template.apply('page', this.result.page).value();
    //and then put other data
    View_Template.data(this.result);
    this.result = await View_Template.render();
    return await super._after();
    }

}
