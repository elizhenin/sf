//publish assertions in global
const compareTwoArg = (arg1, arg2) => {
    let result = false;
    let _expected;
    if (typeof arg1 == 'object') {
        _expected = tree2list(arg1)
    } else {
        _expected = arg1
    }
    let _actual;
    if (typeof arg2 == 'object') {
        _actual = tree2list(arg2)
    } else {
        _actual = arg2
    }

    if ((typeof _expected === 'object') && (typeof _actual === 'object')) {
        result = true;
        const _expected_keys = Object.keys(_expected);
        const _actual_keys = Object.keys(_actual);
        if (_expected_keys.length === _actual_keys.length) {
            for (const key of _expected_keys) {
                if (_expected[key] != _actual[key]) { result = false; break; }
            }
        } else {
            result = false;
        }
    } else {
        if (_expected == _actual) {
            result = true;
        }
    }
    return result;
}
global.assertEquals = (expected, actual, message = '') => {
    let result = compareTwoArg(expected, actual);
    if (!result) {
        console.log();
        console.log('assertEquals fail.', message);
        console.log('Expected:', expected);
        console.log('Given:', actual);
    }
    return result;
}
global.assertNotEquals = (expected, actual, message = '') => {
    let result = !compareTwoArg(expected, actual);
    if (!result) {
        console.log();
        console.log('assertNotEquals fail.', message);
        console.log('Expected:', expected);
        console.log('Given:', actual);
    }
    return result;
}
global.assertEmpty = (dataHolder, message = '') => {
    let result = false;
    if (empty(dataHolder)) {
        result = true;
    }
    if (!result) {
        console.log();
        console.log('assertEmpty fail.', message);
        console.log('Given:', dataHolder);
    }
    return result;
}
global.assertNotEmpty = (dataHolder, message = '') => {
    let result = false;
    if (!empty(dataHolder)) {
        result = true;
    }
    if (!result) {
        console.log();
        console.log('assertNotEmpty fail.', message);
        console.log('Given:', dataHolder);
    }
    return result;
}
global.assertTrue = (actual, message = '') => {
    let result = compareTwoArg(true, !!actual);
    if (!result) {
        console.log();
        console.log('assertTrue fail.', message);
        console.log('Given:', actual);
    }
    return result;
}
global.assertFalse = (actual, message = '') => {
    let result = compareTwoArg(false, !!actual);
    if (!result) {
        console.log();
        console.log('assertFalse fail.', message);
        console.log('Given:', actual);
    }
    return result;
}
global.assertObjectHasKey = (key, obj, message = '') => {
    let result = false;
    if (Object.keys(obj).indexOf(key) > -1) {
        result = true
    }
    if (!result) {
        console.log();
        console.log('assertObjectHasKey fail.', message);
        console.log('Key:', key);
        console.log('Object:', obj);
    }
    return result;
}

// export ClassLoader
module.exports = class TestLoader {
    constructor() {
        console.log('');
        console.log('Running tests from ./Test/ :');
        const stat = {
            count: 0,
            success: 0,
            failed: 0
        }
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
                                for (const test of methodsArray) {
                                    if (test.startsWith('test_')) {
                                        stat.count = stat.count + 1;
                                        const result = await TestClass[test]();
                                        if (result === true) stat.success = stat.success + 1;
                                        if (result === false) stat.failed = stat.failed + 1;
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

        (async function () { await PopularizeCollections(Test, CurrentDirectory, PopularizeCollections); console.log('Tests runned:', stat); if (stat.success + stat.failed !== stat.count) { console.log('Warning: not all test return boolean result') } })()
    }
}
