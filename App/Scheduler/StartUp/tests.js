module.exports = async function () {
    console.log('startup tests from Application.Scheduler.StartUp.tests.js')
    let testobject = {}
    testobject.field1 = "some value 1";
    testobject.field2 = "some value 2";
    testobject.array1 = [2, 3, "gdsgf", [6, 5, 4], {
        a: "fgd",
        b: {
            c: [234, 235, 12]
        }
    }];
    testobject.fieldset = {
        field1: 342,
        field2: [34234],
        field3: {
            field2: 3123,
            null: null
        }
    }
    testobject.bool = true;


    let listed = struct2flat(testobject);
    console.log('Sample structure:', JSON.stringify(testobject, ' ', 2))
    console.log('Converted sample:', JSON.stringify(listed, ' ', 2));
}