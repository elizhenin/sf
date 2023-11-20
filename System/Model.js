//basic Sukina Framework model
module.exports = class Model extends BaseObject {
    constructor(db_config = 'default') {
        super();

        this._settings = {
            'db_config': db_config
        };
        this.DB = function () {
            return Application.DB[this._settings.db_config];
        };
    }

}
