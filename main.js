//set up Application object in global context
global.Application = {};

//set up global error catcher
global.ErrorCatcher = function (e) {
    console.log(e);
};

//popularize with node_modules in lib branch
Application.lib = {};
Application.lib.path = require('path');
Application.lib.fs = require('fs');
Application.lib.fs_promises = require('fs').promises;
Application.lib['ini-parser'] = require('ini-parser');
Application.lib.express = require('express');
Application.lib['body-parser'] = require('body-parser');
Application.lib.nodemailer = require('nodemailer');
Application.lib.cluster = require('cluster');
Application.lib.request = require('request');
Application.lib['sync-sqlite'] = require('sync-sqlite');
Application.lib.StrUnEscape = require('backslash');
//set up config parameters
Application.config = {};

/*
//for use in prepacked executable mode

global.dirname = function (dir) {
    return dir.substring(0, dir.lastIndexOf(Application.lib.path.sep) + 1);
};
Application._dirname = dirname(global.process.execPath);
*/

Application._dirname = __dirname; //for use in unpacked mode

Application._ConfigLoader = function (branch, filename) {
    var config_text = Application.lib.fs.readFileSync(Application.lib.path.join(Application._dirname, filename)).toString();
    branch = Object.assign(branch, Application.lib['ini-parser'].parse(config_text));
    config_text = undefined;
    if (typeof branch['#INCLUDE'] != 'undefined') {
        for (key in branch['#INCLUDE']) {
            branch[key] = {};
            Application._ConfigLoader(branch[key], branch['#INCLUDE'][key]);
        }
    };
}

Application._ConfigLoader(Application.config, 'config.ini');
//Set up directories
Application.config.Directories = {};
Application.config.Directories.Root = "";
Application.config.Directories.System = "System";
Application.config.Directories.App = "App";
Application.config.Directories.AppPublic = "Public";
for (key in Application.config.Directories) {
    Application.config.Directories[key] = Application.lib.path.join(Application._dirname, Application.config.Directories[key]);
}

//set up clustering
if (Application.lib.cluster.isMaster) { // master process

    // Create a workers group
    for (var i = 0; i < Application.config.CPU.Workers; i += 1) {
        Application.lib.cluster.fork();
    }
    // Listen for dying workers
    Application.lib.cluster.on('exit', function (worker) {

        // Replace the dead worker
        console.log('Worker ' + worker.id + ' died and replaced');
        Application.lib.cluster.fork();

    });
} else { // worker process

    //popularize with system modules in module branch
    Application.module = {};

    for (key in Application.config.Modules) {
        Application.module[key] = require(Application.lib.path.join(Application.config.Directories.System, Application.config.Modules[key] + '.js'));
    }

    // Module View shortcut
    if (typeof Application.module.View != 'undefined') {
        global['View'] = Application.module.View;
    }

    //some useful functions
    Application.module.sysTools();

    //call AppLoader to load other MVC code
    Application.module.AppLoader();
    //call ProjectLoader to load project from container file
    Application.module.ProjectLoader();

    //set up databases
    Application.DB = {};
    for (var key in Application.database) {
        Application.DB[key] = require('knex')(Application.database[key]);
    }

    //set up server express
    Application.HTTP = new Application.lib.express();
    Application.HTTP.setMaxListeners(Application.config.Server.MaxListeners * 1);

    //static files
    Application.HTTP.use(Application.lib.express.static(Application.config.Directories.AppPublic));

    //body parser 
    Application.HTTP.use(Application.lib['body-parser'].json({
        limit: '100mb'
    })); // to support JSON-encoded bodies
    Application.HTTP.use(Application.lib['body-parser'].urlencoded({
        extended: false
    }));

    //middlewares
    for (let Name in Application.Middleware) {
        Application.HTTP.use(Application.Middleware[Name]);
    };
    //routes
    Application.Routes = require(Application.lib.path.join(Application.config.Directories.System, 'Routes.js'));
    Application.Routes.init();
    //start listening
    Application.HTTP.listen(Application.config.Server.Port, function () {
        console.log("listen started on port " + Application.config.Server.Port);
        Application.Scheduler.init();
    });
}