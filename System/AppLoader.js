// export ClassLoader function
module.exports = function (root) {
    let CurrentDirectory = Application.config.Directories.App;
    let PopularizeCollections = function (rootNode, Directory, doNext) {
        // let Collection = {};
        //  Object.assign({}, obj);
        let SubcollectionList = [];
        //get items from this dir and do the work
        let dir_list = Application.lib.fs.readdirSync(Directory)
        for(let i in dir_list){
            let item = dir_list[i];
            if (Application.lib.fs.lstatSync(Application.lib.path.join(Directory, item)).isDirectory()) {
                //add dir for future work
                SubcollectionList.push(item);
                rootNode[item] = {}
            } else {
                if (item.substr(item.length - 3) == '.js') {
                    let ObjName = item.slice(0, -3); //remove ".js" symbols from end
                    //add this js to namespace
                    rootNode[ObjName] = require(Application.lib.path.join(Directory, item));
                } else if (item.substr(item.length - 5) == '.html') {
                    let ObjName = item.slice(0, -5); //remove ".html" symbols from end
                    //add this html to namespace
                    rootNode[ObjName] = Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8');
                }
            }
            //recursive call PopularizeCollections() for each subdirs
            if (SubcollectionList.length > 0) {
                for(let i in SubcollectionList){
                    let item = SubcollectionList[i]
                    // Collection[item] = 
                    doNext(rootNode[item],Application.lib.path.join(Directory, item), doNext);
                }
            }
        }

        return;

    };

    PopularizeCollections(root, CurrentDirectory, PopularizeCollections)
}
