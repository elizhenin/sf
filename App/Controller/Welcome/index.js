module.exports = async function (req, res, result) {
    let $View = new View("default.index");
    result.content = await $View.value()
    return result
}
