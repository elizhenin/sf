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
    require('./npmlibs.js')
    
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
    Application.config.Directories.App = "App";
    Application.config.Directories.AppPublic = "Public";
    Application.config.Directories.AppPublicSrc = "FrontSrc";
    for (key in Application.config.Directories) {
        Application.config.Directories[key] = Application.lib.path.join(Application._dirname, Application.config.Directories[key]);
    }

    //load config from ini
    Application._ConfigLoader = function (branch, filename) {
        let iniParser = require(Application.lib.path.join(Application.config.Directories.System, 'IniParser.js'));
        var config_text = Application.lib.fs.readFileSync(Application.lib.path.join(Application._dirname, filename)).toString();
        branch = Object.assign(branch, iniParser(config_text));
        config_text = undefined;
        if (typeof branch['#INCLUDE'] != 'undefined') {
            for (key in branch['#INCLUDE']) {
                branch[key] = {};
                Application._ConfigLoader(branch[key], branch['#INCLUDE'][key]);
            }
        };
    }
    Application._ConfigLoader(Application.config, 'config.ini');
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
                let ObjName = item.slice(0, -3); //remove ".js" symbols from end
                //add this js to namespace
                Application.System[ObjName] = require(Application.lib.path.join(Application.config.Directories.System, item));
            }
        }

        // System.View shortcut
        if (typeof Application.System.MarkerScript != 'undefined') {
            global['View'] = Application.System.MarkerScript;
        }

        //some useful functions
        Application.System.sysTools();

        //call AppLoader to load other MVC code
        Application._appReady = true;
        Application.System.AppLoader(Application);
        //call ProjectLoader to load project from container file
        // Application.System.ProjectLoader();
        //call PublicBuilder to build and minify css,js static files from FrontSrc to Public dir
        if (typeof Application.config.PublicBuilder != "undefined" && Application.config.PublicBuilder.Enable == 'true') {
            await Application.System.PublicBuilder();
        }
        let _continueInit = function () {
            if (Application._appReady) {
                //set up databases
                Application.DB = {};
                for (let key in Application.database) {
                    Application.DB[key] = require('knex')(Application.database[key]);
                }

                //set up server express
                Application.HTTP = new Application.lib.express();
                Application.HTTP.setMaxListeners(Application.config.Server.MaxListeners * 1);

                //cookie parser
                Application.HTTP.use(Application.lib['cookie-parser']());

                //static files
                Application.HTTP.use(Application.lib.express.static(Application.config.Directories.AppPublic));

                //body parser 
                Application.HTTP.use(Application.lib['body-parser'].json({
                    limit: '100mb'
                }));
                // to support JSON-encoded bodies
                Application.HTTP.use(Application.lib['body-parser'].urlencoded({
                    extended: false
                }));

                //routes
                Application.Routes = Application.System.Routes;
                Application.Routes.init();
                //start listening
                Application.HTTP.listen(Application.config.Server.Port, function () {
                    console.log("listen started on port " + Application.config.Server.Port);
                    Application.Scheduler.init();
                });
            } else setTimeout(_continueInit, 100);
        }
        _continueInit();
    }

    //finish main code, do the work
})()
