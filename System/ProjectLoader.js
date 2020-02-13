// export ClassLoader function
module.exports = function () {
    var projectFiles = Application.config.Project;
    for (key in projectFiles) {

        let db = new Application.lib['sync-sqlite']({
            dbPath: Application.config.Project[key]
        });
        db.connect();
        //read routes-related info
        let routes_query = "SELECT " +
            "Domain.regexp AS domain," +
            "Domain_Route.name AS name," +
            "Domain_Route.method AS method," +
            "Domain_Route.uri AS uri," +
            "Domain_Route.controller AS controller," +
            "Domain_Route.action AS action," +
            "Domain_Route.template AS template " +
            "FROM Domain_Route JOIN Domain ON Domain.id = Domain_Route.parent_id";
        let routes = db.runSQL(routes_query).toJSON();
        if (typeof Application.routes == "undefined") Application.routes = {};
        for (let key in routes) {
            if (typeof Application.routes[routes[key].domain] == "undefined") {
                Application.routes[routes[key].domain] = [];
            }

            Application.routes[routes[key].domain].push(routes[key]);
        }

        //read databases

        let database_query = "SELECT * " +
            "FROM database";
        let database = db.runSQL(database_query).toJSON();
        if (typeof Application.database == "undefined") Application.database = {};
        for (let key in database) {
            Application.database[database[key].name] = {};
            Application.database[database[key].name].client = database[key].client;
            Application.database[database[key].name].connection = {};
            Application.database[database[key].name].connection.host = database[key].host;
            Application.database[database[key].name].connection.user = database[key].user;
            Application.database[database[key].name].connection.password = database[key].password;
            Application.database[database[key].name].connection.database = database[key].database;
            Application.database[database[key].name].connection.filename = database[key].filename;
        }

        //read Routines
        if (typeof Application.Library == "undefined") Application.Library = {};
        let routines_query = "SELECT " +
            "Library.name AS Library," +
            "Library_Routine.name AS Routine," +
            "Library_Routine.body AS body " +
            "FROM Library_Routine JOIN Library ON Library.id = Library_Routine.parent_id";
        let Routines = db.runSQL(routines_query).toJSON();

        var Library_strings = {};
        for (let key in Routines) {
            if (typeof Library_strings[Routines[key].Library] == "undefined") {
                Library_strings[Routines[key].Library] = "Application.Library." +
                    Routines[key].Library +
                    " = function() {\n" +
                    "this._init_settings = [];\n" +
                    "for(let key in arguments){this._init_settings.push(arguments[key]);}\n";

            }
            Library_strings[Routines[key].Library] += "\n" +
                "this." + Routines[key].Routine + " = " +
                Application.lib.StrUnEscape(Routines[key].body) +
                "\n";
        }
        for (let key in Library_strings) {
            Library_strings[key] += "\n};";
            console.log(Library_strings[key]);
            eval(Library_strings[key]);
        }
        //make Library Routines shortcuts
        for (let Name in Application.Library) {
            global['Library_' + Name] = Application.Library[Name];
        }

        //read Middlewares
        if (typeof Application.Middleware == "undefined") Application.Middleware = {};
        let middlewares_query = "SELECT * " +
            "FROM Middleware";
        let middlewares = db.runSQL(middlewares_query).toJSON();
        for (let key in middlewares) {
            let eval_string = "Application.Middleware." +
                middlewares[key].name +
                " =async function (req, res, next) {\n" +
                " try{\n" +
                Application.lib.StrUnEscape(middlewares[key].body) +
                "\n}\n" +
                "catch(e)\n" +
                "{ErrorCatcher(e)}\n" +
                "next();\n" +
                "}";
            console.log(eval_string);
            eval(eval_string);
        }

        //read Controllers
        if (typeof Application.Controller == "undefined") Application.Controller = {};
        let actions_query = "SELECT " +
            "Controller.name AS Controller," +
            "Controller_Action.name AS Action," +
            "Controller_Action.body AS body " +
            "FROM Controller_Action JOIN Controller ON Controller.id = Controller_Action.parent_id";
        let actions = db.runSQL(actions_query).toJSON();
        for (let key in actions) {
            if (typeof Application.Controller[actions[key].Controller] == "undefined") {
                Application.Controller[actions[key].Controller] = {};
            }
            let eval_string = "Application.Controller." +
                actions[key].Controller + "." + actions[key].Action;
            if (actions[key].Action == '_after') {
                eval_string += " = async function (req, res, result) { try{";
            } else {
                eval_string += " = async function (req, res) { try{";
            };
            eval_string += Application.lib.StrUnEscape(actions[key].body) +
                "\n}catch(e){ErrorCatcher(e);}\n";
            if (actions[key].Action == '_before') {
                eval_string += "return [req,res];\n";
            };
            if (actions[key].Action == '_after') {
                eval_string += "return result;\n";
            };
            eval_string += "}";
            console.log(eval_string);
            eval(eval_string);
        }
        //make Controller shortcuts
        for (let Name in Application.Controller) {
            global['Controller_' + Name] = Application.Controller[Name];
        }

        //read Models
        if (typeof Application.Model == "undefined") Application.Model = {};
        let modelMethods_query = "SELECT " +
            "Model.name AS Model," +
            "Model_method.name AS method," +
            "Model_method.arguments AS arguments," +
            "Model_method.body AS body " +
            "FROM Model_method JOIN Model ON Model.id = Model_method.parent_id";
        let modelMethods = db.runSQL(modelMethods_query).toJSON();

        var Model_strings = {};
        for (let key in modelMethods) {
            if (typeof Model_strings[modelMethods[key].Model] == "undefined") {
                Model_strings[modelMethods[key].Model] = "Application.Model." +
                    modelMethods[key].Model +
                    " = function(db_config = 'default') {" +
                    "this._settings = {" +
                    "    'db_config': db_config" +
                    "};" +
                    "this.DB = function() {" +
                    "    return Application.DB[this._settings.db_config];" +
                    "};";
            }
            Model_strings[modelMethods[key].Model] += "\n" +
                "this." + modelMethods[key].method + " = async function(" +
                modelMethods[key].arguments + "){\n" +
                Application.lib.StrUnEscape(modelMethods[key].body) +
                "\n};";
        }
        for (let key in Model_strings) {
            Model_strings[key] += "\n};";
            console.log(Model_strings[key]);
            eval(Model_strings[key]);
        }
        //make Model shortcuts
        for (let Name in Application.Model) {
            global['Model_' + Name] = Application.Model[Name];
        };
        //read Views
        if (typeof Application.View == "undefined") Application.View = {};
        let viewForms_query = "SELECT " +
            "View.name AS View," +
            "View_form.name AS form," +
            "View_form.body AS body " +
            "FROM View_form JOIN View ON View.id = View_form.parent_id";
        let viewForms = db.runSQL(viewForms_query).toJSON();

        for (let key in viewForms) {
            if (typeof Application.View[viewForms[key].View] == "undefined") {
                Application.View[viewForms[key].View] = {};
            }
            Application.View[viewForms[key].View][viewForms[key].form] = Application.lib.StrUnEscape(viewForms[key].body);
        }

        //read Sсheduler
        if (typeof Application.Scheduler == "undefined") Application.Scheduler = {
            init: function () {
                //startup tasks
                for (let key in Application.Scheduler.StartUp) {
                    let task = Application.Scheduler.StartUp[key];
                    let eval_string = "setTimeout(async function(){" +
                        " try{\n" +
                        Application.lib.StrUnEscape(task.body) +
                        "\n}\n" +
                        "catch(e)\n" +
                        "{ErrorCatcher(e)}\n" +
                        "},0);";
                    console.log(eval_string);
                    eval(eval_string);
                }
                //periodic tasks
                for (let key in Application.Scheduler.Periodic) {
                    let task = Application.Scheduler.Periodic[key];
                    let eval_string = "setTimeout(async function " + task.name + "(){\n" +
                        " try{\n" +
                        Application.lib.StrUnEscape(task.body) +
                        "\n}catch(e)\n" +
                        "{ErrorCatcher(e)}\n" +
                        " setTimeout(" + task.name + "," + task.interval + ");\n" +
                        "}," + task.interval + ");";
                    console.log(eval_string);
                    eval(eval_string);
                }

            }
        };
        if (typeof Application.Scheduler.StartUp == "undefined") Application.Scheduler.StartUp = {};
        if (typeof Application.Scheduler.Periodic == "undefined") Application.Scheduler.Periodic = {};
        let sheduler_query = "SELECT * " +
            "FROM Scheduler";
        let tasks = db.runSQL(sheduler_query).toJSON();
        for (let key in tasks) {
            if (tasks[key].time > 0) {
                Application.Scheduler.Periodic[tasks[key].name] = {
                    body: tasks[key].body,
                    interval: tasks[key].time
                };
            } else {
                Application.Scheduler.StartUp[tasks[key].name] = {
                    body: tasks[key].body
                };
            }
        }
    }

};