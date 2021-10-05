//basic Sukina Framework model
module.exports = class Model{
    constructor(db_config = 'default') {
        this._settings = {
            'db_config': db_config
        };
        this.DB = function() {
            return Application.DB[this._settings.db_config];
        };
    }
}