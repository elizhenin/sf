module.exports = function (list) {
    var map = {},
        node, roots = [],
        i;
    for (i = 0; i < list.length; i++) {
        map[list[i].id] = i; // initialize the map
        list[i].children = []; // initialize the children
    }
    for (i = 0; i < list.length; i++) {
        node = list[i];
        if (node.parent_id != 0) {
            // if you have dangling branches check that map[node.parentId] exists
            if (list[map[node.parent_id]]) {
                list[map[node.parent_id]].children.push(node);
            }
        } else {
            roots.push(node);
        }
    }
    return roots;
};