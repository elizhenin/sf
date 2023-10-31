//Async mode on
(async function () {
    //set up Application object in global context
    global.Application = {};
    //set up global error catcher
    global.ErrorCatcher = function (e) {
        console.log(e);
    };
    //popularize with node_modules in lib branch
    Application.lib = {};
    require('./npmlibs.js');
    //load sysTools
    Application.sysTools = require('./sysTools.js');
    Application.sysTools();
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

    //Set up directories
    Application.config.Directories = {};
    Application.config.Directories.Root = "";
    Application.config.Directories.System = "System";
    Application.config.Directories.App = "Application";
    Application.config.Directories.Test = "Test";
    Application.config.Directories.AppPublic = "Public";
    for (key in Application.config.Directories) {
        Application.config.Directories[key] = Application.lib.path.join(Application._dirname, Application.config.Directories[key]);
    }

    //load config from ini
    Application._ConfigLoader = function (branch, filename) {
        let iniParser = require(Application.lib.path.join(Application.config.Directories.System, 'IniParser.js'));
        let config_text = Application.lib.fs.readFileSync(Application.lib.path.join(Application._dirname, filename)).toString();
        branch = Object.assign(branch, new iniParser(config_text));
        config_text = undefined;
    }
    Application._ConfigLoader(Application.config, 'config.ini');
    //overlay config from commangline
    for (const arg of process.argv) {
        // syntax of cmd params:  --sf:<section>.<option>=<Value> 
        if (arg.length > 5) {
            if (arg.startsWith('--sf:')) {
                let overlay = arg.slice(5);
                overlay = overlay.split('=');
                let path = overlay[0].split('.');
                let key = path.pop();
                path = path.join('.');
                let value = overlay[1];
                let section = ObjSelector(Application.config, path);
                section[key] = value;
            }
        }
    };
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

        //popularize with system modules in System branch
        Application.System = {}; {
            let dir_list = Application.lib.fs.readdirSync(Application.config.Directories.System)
            for (let i in dir_list) {
                let item = dir_list[i];
                if ("js" === item.split('.').reverse()[0].toLowerCase()) {
                    let ObjName = item.slice(0, -3); //remove ".js" symbols from end
                    //add this js to namespace
                    Application.System[ObjName] = require(Application.lib.path.join(Application.config.Directories.System, item));
                }

            }
        }

        //call AppLoader to load other MVC code
        Application._appReady = true;
        new Application.System.AppLoader();

        let _continueInit = function () {
            if (Application._appReady) {
                //save class init order
                let ClassLoadingOrderRebuild = Application.config.Server.ClassLoadingOrderRebuild ?? 'true';
                if (ClassLoadingOrderRebuild == 'true') {
                    const filename = 'classLoadingOrder.json';
                    Application.lib.fs.writeFileSync(Application.lib.path.join(Application._dirname, filename), JSON.stringify(Application._ClassLoadingOrder, ' ', 2));
                }
                //set up databases
                Application.DB = {};
                for (let key in Application.database) {
                    Application.DB[key] = require('knex')(Application.database[key]);
                }

                //start listening
                Application.HTTP = new Application.System.Routes();
                Application.Scheduler = new Application.System.Scheduler();

                if (Application.config.Server.RunTests == 'true') {
                    global.Test = {};
                    new Application.System.TestLoader();
                };

            } else setTimeout(_continueInit, 100);
        }
        _continueInit();
    }

    //finish main code, do the work
})()
