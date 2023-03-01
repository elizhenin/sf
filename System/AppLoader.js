// export ClassLoader
module.exports = class AppLoader {
    constructor(root) {
        let CurrentDirectory = Application.config.Directories.App;
        let PopularizeCollections = function (rootNode, Directory, doNext) {
            let SubcollectionList = [];
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
                            let ObjName = item.slice(0, -3); //remove ".js" symbols from end
                            //add this js to namespace
                            let _init = function (firstTry = false) {
                                let filename = Application.lib.path.join(Directory, item);
                                let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -3).split('/').join('_');
                                if (2 > classname.split('_').length) classname = false;
                                try {
                                    rootNode[ObjName] = require(filename);
                                    if (classname) global[classname] = rootNode[ObjName];
                                    if (!firstTry) {
                                        Application._appReady = true;
                                        console.log(filename + ' now ready')
                                    }
                                } catch (e) {
                                    Application._appReady = false;
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
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -5).split('/').join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break
                        }
                        case "ini":{
                            let ObjName = item.slice(0, -4); //remove ".ini" symbols from end
                            //add this ini object to namespace
                            let iniParser = require(Application.lib.path.join(Application.config.Directories.System, 'IniParser.js'));
                            rootNode[ObjName] = new iniParser(Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8'))
                            //global classname
                            let filename = Application.lib.path.join(Directory, item)
                            let classname = filename.slice(CurrentDirectory.length + 1).slice(0, -4).split('/').join('_')
                            if (2 > classname.split('_').length) classname = false
                            if (classname) global[classname] = rootNode[ObjName]
                            break
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

        PopularizeCollections(root, CurrentDirectory, PopularizeCollections)
    }
}