// export AppLoader
module.exports = class AppLoader {
    constructor() {
        let ClassLoadingOrderRebuild = Application.config.Server.ClassLoadingOrderRebuild ?? 'true';
        let CurrentDirectory = Application.config.Directories.App;
        let ClassLoadingOrder = [];
        Application._ClassLoadingOrder = ClassLoadingOrder;
        const ClassesWaitingRetry = {};
        let PopularizeCollections = async function (rootNode, Directory, doNext) {
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
                    const ext = item.split('.').reverse()[0].toLowerCase();
                    switch (ext) {
                        case "js": {
                            if (ClassLoadingOrderRebuild == 'false') break;
                            let ObjName = item.slice(0, -(ext.length+1)); //remove ".js" symbols from end
                            //add this js to namespace
                            let _init = function (firstTry = false) {
                                let filename = Application.lib.path.join(Directory, item);
                                let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -(ext.length+1)).split(Application.lib.path.sep).join('_');
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
                            let ObjName = item.slice(0, -(ext.length+1)); //remove ".json" symbols from end
                            //add this json object to namespace
                            rootNode[ObjName] = JSON.parse(Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8'))
                            //global classname
                            let filename = Application.lib.path.join(Directory, item)
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -(ext.length+1)).split(Application.lib.path.sep).join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break
                        }
                        case "ini": {
                            let ObjName = item.slice(0, -(ext.length+1)); //remove ".ini" symbols from end
                            //add this ini object to namespace
                            let iniParser = require(Application.lib.path.join(Application.config.Directories.System, 'IniParser.js'));
                            rootNode[ObjName] = new iniParser(Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8'))
                            //global classname
                            let filename = Application.lib.path.join(Directory, item)
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -(ext.length+1)).split(Application.lib.path.sep).join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break
                        }
                        case "yml": {
                            let ObjName = item.slice(0, -(ext.length+1)); //remove ".yml" symbols from end
                            //add this yml object to namespace
                            let YAML = Application.lib.yaml;
                            rootNode[ObjName] = YAML.parse(Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8'))
                            //global classname
                            let filename = Application.lib.path.join(Directory, item)
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -(ext.length+1)).split(Application.lib.path.sep).join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break
                        }
                        case "xml": {
                            let ObjName = item.slice(0, -(ext.length+1)); //remove ".xml" symbols from end
                            //add this xml object to namespace
                            const xmlParser = new Application.System.XmlParser();
                            const xml = Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8');
                            rootNode[ObjName] = await xmlParser.parse(xml);
                            //global classname
                            let filename = Application.lib.path.join(Directory, item)
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -(ext.length+1)).split(Application.lib.path.sep).join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break;
                        }
                        case "csv": {
                            let ObjName = item.slice(0, -(ext.length+1)); //remove ".csv" symbols from end
                            //read csv table as array of row objects and add to namespace
                            const csv = Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8');
                            let jsonObj = new Application.System.CsvParser(csv);

                            rootNode[ObjName] = jsonObj;
                            //global classname
                            let filename = Application.lib.path.join(Directory, item);
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -(ext.length+1)).split(Application.lib.path.sep).join('_');
                            if (2 > classname.split('_').length) classname = false;
                            if (classname) global[classname] = rootNode[ObjName]
                            break
                        }
                        case "html": {
                            let ObjName = item.slice(0, -(ext.length+1)); //remove ".html" symbols from end
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
                    await doNext(rootNode[item], Application.lib.path.join(Directory, item), doNext);
                }
            }
        };

        if (ClassLoadingOrderRebuild == 'false') Application._appReady = false;

        PopularizeCollections(Application, CurrentDirectory, PopularizeCollections);

        if (ClassLoadingOrderRebuild == 'false') {
            const classList = require(Application.lib.path.join(Application._dirname, 'classLoadingOrder.json'));
            for (const filename of classList) {
                let classpath = filename.slice(0, -('js'.length+1)).split(Application.lib.path.sep);
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
