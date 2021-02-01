module.exports = function (db_config = 'default') {
    let NewOBJ = {};
    NewOBJ._settings = {
        'db_config': db_config
    };
    NewOBJ.DB = function () {
        return Application.DB[NewOBJ._settings.db_config];
    };
    NewOBJ.InternalDB = function () {
        return require('knex')({
            client: 'sqlite3',
            connection: {
                filename: Application.config.Project[key]
            },
            useNullAsDefault: true
        });
    };
    NewOBJ.default = async function (content) {
        let View_Template = new View('default.template');
        View_Template.data(content);

        return View_Template.render();
    };
 
    NewOBJ.notemplate = async function (content) {
        return content
    };
    NewOBJ.error = async function (content) {
        // Used when Router catches reject

        var View_Template = new View('error.template');
        console.log(content);
        View_Template.apply('content', content);
        return View_Template.render();
    };
    return NewOBJ;
}