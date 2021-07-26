module.exports = class extends Application.System.Controller {
    async _before(){
        this.result = ""
    }
     async action_index(){
         //similar to Welcome, but no template class or View using here. Only InternalAPI methods
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
