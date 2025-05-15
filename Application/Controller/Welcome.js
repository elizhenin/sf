module.exports = class extends Controller_Template {
    async action_index() {
        let content = this.ViewJS("default.welcome");
        content.foo = "my test string"
        content.bar = "other test string",
            content.yes = 'yes))',
            content.no = "no(((("
        content.date = +Date.now();
        Object.assign(content, {
            firstLevel: [
                {
                    name: 'firslLevel1',
                    secondLevel: [
                        {
                            name: 'secondLevel1'
                        },
                        {
                            name: 'secondLevel2'
                        }
                    ]
                },
                {
                    name: 'firslLevel2',
                    secondLevel: [
                        {
                            name: 'secondLevel1'
                        },
                        {
                            name: 'secondLevel2'
                        }
                    ]
                }
            ]
        })
        this.result.content = await content.render()
    }

    async action_viewjs() {
        let v = new Application.System.ViewJS('viewjs_test');
        v.news = [{
            id: 323423,
            name: 'New1'
        }, {
            id: 222,
            name: 'New2'
        }];
        v.title = "Sample page";
        this.result.content = await v.render();

    }

    async server_sampleFooFunction(name) {
        return "Hello, " + name;
    }

    async client_sampleBarFunction() {
        let myName = "Some User";
        myName = await server_sampleFooFunction(myName);
        alert(myName);
    }

    async client_onload() {
        await client_sampleBarFunction();
        await server_noop();
    }
}
