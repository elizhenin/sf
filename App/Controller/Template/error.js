module.exports = async function (req, res, result) {
    // Used when Router catches reject

    var View_Template = new View('error.template');
    console.log(result);
    View_Template.apply('content', result);
    return View_Template.render();
}