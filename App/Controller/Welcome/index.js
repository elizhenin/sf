module.exports = async function (req, res, result) {
    let $View = new View("default.welcome");
    result.content = await $View.value()
    return result
}
