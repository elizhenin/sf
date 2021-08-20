module.exports = class extends Application.System.Controller {
    async _before(){
        this.result = "" //we dont use any html templates here, so it must be empty string
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
       await client_sampleBarFunction();
       //longpooling sample
       let request_handler = async function(response){
           console.log(response)
       }
       await client_Longpool(request_handler);

    }

    async server_Longpool(){
        let result;
        let result_ready = false;
        let request_time = + Date.now();// behind the proxies with default 30s request timeout, periodically answer after 25s
        while (+Date.now()-request_time < 25000 && !result_ready){//cycling data check
            //looking for something ready to answer, delay in 5s in this example
            if(+Date.now()-request_time > 5000){
                result = "We ready to send some data";
                result_ready = true;
            }
            //sleeping 100ms and retry looking for data
            await asyncSleep(100);
        }
        return result;
    }

    async client_Longpool(callback){
        //function that will await response 
        let call = async function(){
            //call server
            let response = await server_Longpool();
            //call callback with result
            await callback(response);
            //call self
            await client_Longpool(callback)
        }
        //call our caller in backgroud to avoid recursion stack overflow
       return setTimeout(call, 100);
    }
}
