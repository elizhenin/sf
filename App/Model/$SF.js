//basic Sukina Framework model
module.exports = class {
    constructor(db_config = 'default', mailer_config = 'default') {
        this._settings = {
            'db_config': db_config,
            'mailer_config': mailer_config
        };
        this.DB = function() {
            return Application.DB[this._settings.db_config];
        }
    }
}