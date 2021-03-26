module.exports = async function (req, res, result) {
    let View_Template = new View('default.template');
    //small hack. do this to insure order of execution - some tags must be placed to body before they can be replaced with data
    View_Template.apply('content',result.content).value();
    //and then put other data
    View_Template.data(result);

    return await View_Template.render();
}
