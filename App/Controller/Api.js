module.exports = class extends Application.System.Controller {
    async _before() {
        //CORS access from any:
        this.res.header('Access-Control-Allow-Origin', '*');
        this.res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        this.result = {
            status: 'success'
        }
        if (typeof this.req.headers.authorization != "undefined") {

            let $token = this.req.headers.authorization.split(' ');
            if ($token[0] == 'Bearer') {
                //compare $token[1] with something known
            } else {
                this.result.status = 'error';
                this.result.message = 'Auth wrong type';
            }
        } else {
            this.result.status = 'error',
                this.result.message = 'Unautorized access denied'
        }
        return this.result;
    }

    async action_noaction() {
        return this.result;
    }
    async action_LCRUD() {
        if (this.result.status == 'error') {

        } else {

            /*
    Request structure
    req.headers.collection = db table name
    req.headers.operation = operation name
    req.body = json object with record, each field as db column name
    req.body.id = required field with item id
    */
            if (typeof this.req.headers.collection == "undefined") {
                this.result.status = "error";
                this.result.message = "Коллекция данных не указана"
            }
            if (typeof this.req.headers.operation == "undefined") {
                this.result.status = "error";
                this.result.message = "Операция не указана"
            }

            if (this.result.status == "success") {
                let Model_LCRUD = new Application.Model.LCRUD();
                await Model_LCRUD.With(this.req.headers.collection);
                switch (this.req.headers.operation) {
                    case "List": {
                        this.result.records = await Model_LCRUD.List(this.req.body);
                        break
                    }
                    case "Read": {
                        this.result.record = await Model_LCRUD.Read(this.req.body.id);
                        break
                    }
                    case "Create": {
                        await Model_LCRUD.Create(this.req.body);
                        this.result.records = await Model_LCRUD.List();
                        break
                    }
                    case "Update": {
                        if (typeof this.req.body.id == "undefined") {
                            this.result.status = "error";
                            this.result.message = "Для данной операции обязательно поле id"
                        } else {
                            await Model_LCRUD.Update(this.req.body)
                            this.result.records = await Model_LCRUD.List();
                        }

                        break
                    }
                    case "Delete": {
                        if (typeof this.req.body.id == "undefined") {
                            this.result.status = "error";
                            this.result.message = "Для данной операции обязательно поле id"
                        } else {
                            await Model_LCRUD.Delete(this.req.body.id)
                            this.result.records = await Model_LCRUD.List();
                        }
                        break
                    }
                    default: {
                        this.result.status = "error";
                        this.result.message = "Операция " + this.req.headers.operation + " не поддерживается";
                    }
                }
            }

        }
        return this.result
    }

}