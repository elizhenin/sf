module.exports = class {
    constructor(req, res, current_controller, current_action) {
        this.req = req;
        this.res = res;
        this.result = {}
        this._controller = current_controller;
        this._action = current_action;

        //define context-specific View() function
        this.View = function (view_path) {
            return new Application.System.MarkerScript(view_path, req, res);
        }

        //define session instance
        try {
            this.Session = new Application.System.Session.instance(this.req.cookies[Application.System.Session._cookieName]);
        } catch (e) {}

    }
    async _before() {
        return this.result;
    }

    async _after() {
        let {
            JSDOM
        } = Application.lib.jsdom;
        try {
            let document = new JSDOM(this.result);
            this.result = document.serialize();
            this.injectClientApiScript();
        } catch (e) {
            this.result = e.toString();
        }
        return this.result;
    }

    injectClientApiScript(){
        let clientMethods = [];
        let serverMethods = [];
        let tmp = this;
        let methods = Object.getOwnPropertyNames(tmp.__proto__);
        methods.forEach(function (method) {
            if (method.startsWith('client_')) {
                let methodF = eval(tmp[method]).toString().split('async client_').join('async function client_');
                clientMethods.push(methodF);
            }
            if (method.startsWith('server_')) {
                let methodF = `window.${method} = async function(){return await SF_servercall("${method.split('server_')[1]}",arguments)}`;
                serverMethods.push(methodF);
            }
        })
        // console.log(clientMethods)
        // console.log(serverMethods)
        let serverCode = `<script type="application/javascript">\n${serverMethods.join(';\n')}\n</script>`;

        let onloadCode = `document.addEventListener("DOMContentLoaded", async function(event) {try{await client_onload();}catch(e){}});`;
        let clientCode = `<script type="application/javascript">\n${clientMethods.join(';\n')}\n${onloadCode}\n</script>`;
        // console.log(serverCode)
        // console.log(clientCode)
        
        let apiToken = md5(+Date.now());

        this.Session.set('sf-internal-api-token',apiToken);

            let SF_servercall = async function(method,arg){
                let  data = [];
                for (let i = 0; i < arg.length; i++)
                    data.push(arg[i]);
                data = JSON.stringify(data)
                let P = new Promise(function (resolve, reject) {
                    let xhr = new XMLHttpRequest();
                    xhr.open('get', window.location.href.split('?')[0]+'?arg='+encodeURI(data));
                    xhr.setRequestHeader('content-type', 'application/json');
                    xhr.setRequestHeader('sf-internal-api-request','true');
                    xhr.setRequestHeader('sf-internal-api-token','{{apiToken}}');
                    xhr.setRequestHeader('sf-internal-api-action',method);
                    xhr.onload = function () {
                        let response = JSON.parse(this.responseText);
                        if (response.status == 'error') {
                            reject(response.message)
                        }
                        if (response.status == 'success') {
                            resolve(response.result);
                        }
                    };
                    xhr.onerror = function (e) {
                        console.log(e)
                    };
                    try{
                    xhr.send();
                    }catch(e){
                        console.log(e)
                    }
                })
                return P;
            }

            let apiCallCode = 'window.SF_servercall = '+eval(SF_servercall).toString().split('{{apiToken}}').join(apiToken);
            apiCallCode = `<script type="application/javascript">\n${apiCallCode}\n</script>`;

            this.result = this.result.split('<head>').join('<head>\n' + apiCallCode + '\n' + serverCode + '\n ' + clientCode + '\n ');
    }


}