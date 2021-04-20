module.exports = class extends Application.Controller.Template {
     async action_index(){
        let content = new this.View("default.welcome");
        this.result.content = await content.value()
    }
}
