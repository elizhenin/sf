module.exports = function (SourceObj, ClassPath) {
    //recusive get object by class
    let ClassPathArray = ClassPath.split('.');
    let ObjSelected = SourceObj;
    for (i = 0; i < ClassPathArray.length; i++) {
        ObjSelected = ObjSelected[ClassPathArray[i]];
    }
    return ObjSelected;
}
