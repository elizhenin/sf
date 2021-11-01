module.exports = class extends Controller_Template {
     async action_index(){
        let content = new this.View("default.welcome");
        content.data({
            foo:"my test string",
            bar:"other test string",
            yes:'yes))',
            no:"no(((("
        })
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
       await client_sampleBarFunction();
       await server_noop();
    }
}
