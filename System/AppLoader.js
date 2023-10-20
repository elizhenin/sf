// export ClassLoader
module.exports = class AppLoader {
    constructor() {
        let ClassLoadingOrderRebuild = Application.config.Server.ClassLoadingOrderRebuild ?? 'true';
        let CurrentDirectory = Application.config.Directories.App;
        let ClassLoadingOrder = [];
        Application._ClassLoadingOrder = ClassLoadingOrder;
        const ClassesWaitingRetry = {};
        let PopularizeCollections = function (rootNode, Directory, doNext) {
            const SubcollectionList = [];
            //get items from this dir and do the work
            let dir_list = Application.lib.fs.readdirSync(Directory)
            for (let i in dir_list) {
                let item = dir_list[i];
                if (Application.lib.fs.lstatSync(Application.lib.path.join(Directory, item)).isDirectory()) {
                    //add dir for future work
                    SubcollectionList.push(item);
                    rootNode[item] = {}
                } else {
                    switch (item.split('.').reverse()[0].toLowerCase()) {
                        case "js": {
                            if (ClassLoadingOrderRebuild == 'false') break;
                            let ObjName = item.slice(0, -3); //remove ".js" symbols from end
                            //add this js to namespace
                            let _init = function (firstTry = false) {
                                let filename = Application.lib.path.join(Directory, item);
                                let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -3).split(Application.lib.path.sep).join('_');
                                if (2 > classname.split('_').length) classname = false;
                                try {
                                    rootNode[ObjName] = require(filename);
                                    if (classname) global[classname] = rootNode[ObjName];
                                    if (!firstTry) {
                                        delete ClassesWaitingRetry[filename];
                                        if (empty(Object.keys(ClassesWaitingRetry))) {
                                            Application._appReady = true;
                                        }
                                        console.log(filename + ' now ready')
                                    };
                                    ClassLoadingOrder.push(filename.slice(Application.config.Directories.App.length + 1));
                                } catch (e) {
                                    Application._appReady = false;
                                    ClassesWaitingRetry[filename] = true;
                                    if (
                                        "TypeError: Class extends value undefined is not a constructor or null" === e.toString()
                                    ) {
                                        console.log(`${filename} waiting retry [${e}]`)
                                    } else {
                                        console.log(e);
                                        console.log(`\n${filename} waiting retry`)
                                    }
                                    setTimeout(_init, 100)
                                }
                            }
                            _init(true);
                            break
                        }
                        case "json": {
                            let ObjName = item.slice(0, -5); //remove ".json" symbols from end
                            //add this json object to namespace
                            rootNode[ObjName] = JSON.parse(Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8'))
                            //global classname
                            let filename = Application.lib.path.join(Directory, item)
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -5).split(Application.lib.path.sep).join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break
                        }
                        case "ini": {
                            let ObjName = item.slice(0, -4); //remove ".ini" symbols from end
                            //add this ini object to namespace
                            let iniParser = require(Application.lib.path.join(Application.config.Directories.System, 'IniParser.js'));
                            rootNode[ObjName] = new iniParser(Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8'))
                            //global classname
                            let filename = Application.lib.path.join(Directory, item)
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -4).split(Application.lib.path.sep).join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break
                        }
                        case "yml": {
                            let ObjName = item.slice(0, -4); //remove ".yml" symbols from end
                            //add this yml object to namespace
                            let YAML = Application.lib.yaml;
                            rootNode[ObjName] = YAML.parse(Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8'))
                            //global classname
                            let filename = Application.lib.path.join(Directory, item)
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -4).split(Application.lib.path.sep).join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break
                        }
                        case "xml": {
                            let ObjName = item.slice(0, -4); //remove ".xml" symbols from end
                            //add this xml object to namespace
                            let xml2js = Application.lib.xml2js;
                            const xml = Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8');
                            xml2js.parseString(xml, {
                                mergeAttrs: true
                            }, (err, result) => {
                                function reduceArrays(root) {
                                    let keys = [];
                                    if (typeof root == 'string') { } else {
                                        if (root instanceof Array) {
                                            for (let i = 0; i <= root.length - 1; i++) { keys.push(i) };
                                        } else {
                                            keys = Object.keys(root);
                                        };
                                        keys.forEach(k => {
                                            if (root[k] instanceof Array) {
                                                switch (root[k].length) {
                                                    case 0: {
                                                        root[k] = null;
                                                        break;
                                                    }
                                                    case 1: {
                                                        root[k] = root[k][0];
                                                    }
                                                    default: {
                                                        reduceArrays(root[k])
                                                    }
                                                }
                                            } else {
                                                reduceArrays(root[k])
                                            }

                                        });
                                    };

                                };
                                reduceArrays(result);
                                rootNode[ObjName] = result;
                            })
                            //global classname
                            let filename = Application.lib.path.join(Directory, item)
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -4).split(Application.lib.path.sep).join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break;
                        }
                        case "csv": {
                            let ObjName = item.slice(0, -4); //remove ".csv" symbols from end
                            //read csv table as array of row objects and add to namespace
                            let csvtojson = Application.lib.csvtojson;
                            csvtojson().fromFile(Application.lib.path.join(Directory, item))
                                .then((jsonObj) => {
                                    //attempt to determine bools and numbers
                                    for (let row of jsonObj) {
                                        const keys = Object.keys(row);
                                        for (const k of keys) {
                                            if (row[k].toLowerCase() === 'true') row[k] = true;
                                            if (row[k].toLowerCase() === 'false') row[k] = false;
                                            if (row[k].toLowerCase() === 'null') row[k] = null;
                                            if (row[k].toLowerCase() === 'nan') row[k] = NaN;
                                            if (row[k].toLowerCase() === 'undefined') row[k] = undefined;
                                            if (row[k] == parseFloat(row[k])) row[k] = parseFloat(row[k]);
                                        }
                                    }
                                    rootNode[ObjName] = jsonObj;
                                    //global classname
                                    let filename = Application.lib.path.join(Directory, item);
                                    let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -4).split(Application.lib.path.sep).join('_');
                                    if (2 > classname.split('_').length) classname = false;
                                    if (classname) global[classname] = rootNode[ObjName]
                                })
                        }
                        case "html": {
                            let ObjName = item.slice(0, -5); //remove ".html" symbols from end
                            //add this html to namespace
                            rootNode[ObjName] = Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8');
                            break
                        }
                    }
                }
            }
            //recursive call PopularizeCollections() for each subdirs
            if (SubcollectionList.length > 0) {
                for (let i in SubcollectionList) {
                    let item = SubcollectionList[i]
                    // Collection[item] = 
                    doNext(rootNode[item], Application.lib.path.join(Directory, item), doNext);
                }
            }
        };

        if (ClassLoadingOrderRebuild == 'false') Application._appReady = false;

        PopularizeCollections(Application, CurrentDirectory, PopularizeCollections);

        if (ClassLoadingOrderRebuild == 'false') {
            const classList = require(Application.lib.path.join(Application._dirname, 'classLoadingOrder.json'));
            for (const filename of classList) {
                let classpath = filename.slice(0, -3).split(Application.lib.path.sep);
                const entityName = classpath.pop();
                const shortcut = [...classpath, entityName].join('_');
                classpath = classpath.join('.');
                let targetObject = empty(classpath) ? Application : ObjSelector(Application, classpath);
                targetObject[entityName] = require(Application.lib.path.join(Application.config.Directories.App, filename));
                if (2 > shortcut.split('_').length) { } else { global[shortcut] = targetObject[entityName]; }
            }
            Application._appReady = true;
        }

    }
}
