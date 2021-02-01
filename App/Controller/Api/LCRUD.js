module.exports = async function (req, res, result) { //action
    if (result.status == 'error') {

    } else {

        /*
    Request structure
    req.headers.collection = db table name
    req.headers.operation = operation name
    req.body = json object with record, each field as db column name
    req.body.id = required field with item id
    */
        console.log(req.headers);
        console.log(req.body);
        if (typeof req.headers.collection == "undefined") {
            result.status = "error";
            result.message = "Коллекция данных не указана"
        }
        if (typeof req.headers.operation == "undefined") {
            result.status = "error";
            result.message = "Операция не указана"
        }

        if (result.status == "success") {
            let Model_LCRUD = new Application.Model.LCRUD();
            await Model_LCRUD.With(req.headers.collection);
            switch (req.headers.operation) {
                case "List": {
                    result.records = await Model_LCRUD.List(req.body);
                    break
                }
                case "Read": {
                    result.record = await Model_LCRUD.Read(req.body.id);
                    break
                }
                case "Create": {
                    await Model_LCRUD.Create(req.body);
                    result.records = await Model_LCRUD.List();
                    break
                }
                case "Update": {
                    if (typeof req.body.id == "undefined") {
                        result.status = "error";
                        result.message = "Для данной операции обязательно поле id"
                    } else {
                        await Model_LCRUD.Update(req.body)
                        result.records = await Model_LCRUD.List();
                    }

                    break
                }
                case "Delete": {
                    if (typeof req.body.id == "undefined") {
                        result.status = "error";
                        result.message = "Для данной операции обязательно поле id"
                    } else {
                        await Model_LCRUD.Delete(req.body.id)
                        result.records = await Model_LCRUD.List();
                    }
                    break
                }
                default: {
                    result.status = "error";
                    result.message = "Операция " + req.headers.operation + " не поддерживается";
                }
            }
        }

    }


    return result
}