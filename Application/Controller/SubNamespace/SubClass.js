module.exports = class extends Controller_Template {
     async action_index(){
        let content = new this.View("default.welcome");
        this.result.content = await content.value()
    }


    async server_sampleFooSubFunction(name){
        return "Hello from namespace, "+name;
    }

    async client_sampleBarSubFunction(){
        let myName = "Some User";
        myName = await server_sampleFooSubFunction(myName);
        alert(myName);
    }
}
