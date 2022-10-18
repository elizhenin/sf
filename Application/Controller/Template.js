module.exports = class extends Application.System.Controller {
   
    async _before(){
        this.template = 'default.template';
        this.result.title = "Sukina Framework"
    }
    async _after () {
    let View_Template = new this.ViewJS(this.template);
    //and then put other data
    Object.assign(View_Template,this.result);
    this.result = await View_Template.render();
    return await super._after();
    }

    async server_sendHelloMail(myMailAddress){
        let Mailer = new Application.System.Mail();
        return await Mailer.send(myMailAddress/*address where to send*/, "Hello from fresh install"/*mail subject*/, "This html part may be prepared via View()"/*html body of mail*/,false/* no attachments*/)
     }

     async server_noop(){
         
     }

}
