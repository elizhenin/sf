module.exports = async function testViewInclude() {
    const T = new Application.System.ViewJS('default.libraryTest');
    const r = await T.render();
    return r
}