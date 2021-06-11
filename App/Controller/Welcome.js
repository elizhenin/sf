module.exports = class extends Application.Controller.Template {
     async action_index(){
        let content = new this.View("default.welcome");
        this.result.content = await content.value()
    }

    async server_sampleFooFunction(name){
        return "Hello, "+name;
    }

    async client_sampleBarFunction(){
        let myName = "Some User";
        myName = await server_sampleFooFunction(myName);
        alert(myName);
    }

    async client_onload(){
       await this.client_sampleBarFunction();
    }
}
