//basic Sukina Framework model

const default_db_config = 'default';
module.exports = class Model extends BaseObject {
    #dbConfigName = '';
    #calledController = null;

    get _calledController() {
        return this.#calledController
    }
    set _calledController(controller) {
        if (controller instanceof Application.System.Controller) this.#calledController = controller
    }

    get _dbConfigName() {
        return this.#dbConfigName
    }

    constructor(_arg1 = null, _arg2 = null /*db config name | other model | called controller */) {
        super();

        this.#dbConfigName = default_db_config

        const args = [];
        if (_arg1 !== null) args.push(_arg1);
        if (_arg2 !== null) args.push(_arg2);

        for (const arg of args) {
            switch (true) {
                case (typeof arg === 'string'): {
                    this.#dbConfigName = arg;
                    break
                }
                case (arg instanceof Application.System.Model): {
                    this.#dbConfigName = arg._dbConfigName;
                    this.#calledController = arg._calledController;
                    break
                }
                case (arg instanceof Application.System.Controller): {
                    this.#calledController = arg
                    break
                }
            }
        }

        this.DB = function () {
            return Application.DB[this.#dbConfigName];
        }
    }
}
