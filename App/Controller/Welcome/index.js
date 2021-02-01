module.exports = async function (req, res, result) {
    let $View = new View("default.index");
    result.content = $View.value()
    return result
}