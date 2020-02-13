module.exports = function (SourceObj, ClassPath) {
    //recusive get object by class
    var ClassPathArray = ClassPath.split('.');
    var ObjSelected = SourceObj;
    for (i = 0; i < ClassPathArray.length; i++) {
        ObjSelected = ObjSelected[ClassPathArray[i]];
    }
    return ObjSelected;
}