// export ClassLoader function
module.exports = function () {
    var CurrentDirectory = Application.config.Directories.App;

    var PopularizeCollections = function (Directory, doNext) {
        var Collection = {};
        //  Object.assign({}, obj);
        var SubcollectionList = [];
        //get items from this dir and do the work
        Application.lib.fs.readdirSync(Directory).forEach(item => {
            if (Application.lib.fs.lstatSync(Application.lib.path.join(Directory, item)).isDirectory()) {
                //add dir for future work
                SubcollectionList.push(item);
            } else {

                if (item.substr(item.length - 3) == '.js') {
                    var ObjName = item.slice(0, -3); //remove ".js" symbols from end
                    //add this js to namespace
                    Collection[ObjName] = require(Application.lib.path.join(Directory, item));
                } else if (item.substr(item.length - 5) == '.html') {
                    var ObjName = item.slice(0, -5); //remove ".html" symbols from end
                    //add this html to namespace
                    Collection[ObjName] = Application.lib.fs.readFileSync(Application.lib.path.join(Directory, item)).toString('utf8');
                }

            }
            //recursive call PopularizeCollections() for each subdirs
            if (SubcollectionList.length > 0) {
                SubcollectionList.forEach(item => {
                    Collection[item] = doNext(Application.lib.path.join(Directory, item), doNext);
                });
            }
        });
        return Collection;

    };

    Application = Object.assign(Application, PopularizeCollections(CurrentDirectory, PopularizeCollections));
}