// export ClassLoader
module.exports = class TestLoader {
    constructor() {
        console.log('');
        console.log('Running tests from ./Test/ :');
        let CurrentDirectory = Application.config.Directories.Test;
        let PopularizeCollections = async function (rootNode, Directory, doNext) {
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
                            let filename = Application.lib.path.join(Directory, item);
                            try {
                               rootNode[ObjName] = require(filename);
                               const TestClass = new rootNode[ObjName]();
                               const methodsArray = Object.getOwnPropertyNames(rootNode[ObjName].prototype);
                               for(const test of methodsArray){
                                if(test.startsWith('test_')){
                                    await TestClass[test]();
                                }
                               }
                           } catch (e) {
                               console.log(`${filename} loading error [${e}]`);
                               process.exit();
                           }
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

       (async function(){await PopularizeCollections(Test, CurrentDirectory, PopularizeCollections);})() 
    }
}