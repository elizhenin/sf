module.exports = function (tree) {
    var list = {};
    for (tablekey in tree) {
        for (fieldkey in tree[tablekey]) {
            list[tablekey + '.' + fieldkey] = tree[tablekey][fieldkey];
        }
    }
    return list;
};