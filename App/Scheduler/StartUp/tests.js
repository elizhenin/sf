module.exports = async function () {
    console.log('startup tests from Application.Scheduler.StartUp.tests.js')

    let v = new Application.System.ViewJS('viewjs_test');
    v.news = [{
        id:323423,
        name: 'New1'
    }, {
        id:222,
        name: 'New2'
    }];
    v.title = "Sample page";
    let d = await v.render();
    console.log(d)
}
