/*
Quick start:

1) define Models in form:
// Application.Model.Pages file:
module.exports = {
    id:'guid', // the UIQ PK column in DB
    table:'pages', // the table name
    fields:[ //list of object fields. maybe same as column names or your own
        'id',
        'parent',
        'name',
        'alias',
        'content'
    ],
    mapping:{ //if field names is different than column names, set the mapping in form fieldName:columnName
        'id':'guid',
        'parent':'parent_id',
        'user':'user_id'
    },
    relay:{ //if some of columns contain id for row in other table, set the relayed models here. ORM give you (potentially) unlimited tree of objects
        'parent':{
            model: 'Pages'
        },
        'user':{
            model: 'Users'
        }
    }
}

// Application.Model.Users file:
module.exports = {
    id:'guid', // the UIQ PK column in DB
    table:'users', // the table name
    fields:[ //list of object fields. maybe same as column names or your own
        'id',
        'name'
    ],
    mapping:{ //if field names is different than column names, set the mapping in form fieldName:columnName
        'id':'guid'
    },
    relay:{ //if some of columns contain id for row in other table, set the relayed models here. ORM give you (potentially) unlimited tree of objects
     }
}

2) place following code in task in Application.Scheduler.StartUp:
Application.orm_driver = new Application.System.ORM([<db_name>]);
await Application.orm_driver.factory();

3) if you're not alone in RDBMS and records may be changed by foreign - set the refreshing task in Application.Scheduler.Periodic:
await Application.orm_driver.refresh();

4) Look at Application.ORM.<db_name> object three. If all correct - you'll see models and items inside them.
Items are enumerated by
for(let id in Application.ORM.<db_name>.<modelName>) 
  {
    let item = Application.ORM.<db_name>.<modelName>[id];
     //take value of field:
    let pageName = await item.name;
     //also in subitem, as configurated in "relay" section of model:
    let userName = await item.user.name;
     //and you can take the record as simple key:value object
    let data = await item.asObject();
     //or only some fields
    let smallData = await item.asObject({'name','alias'});
  }
*/

let InstanceOf = function (db, model, id, Models) {
    let instance = {}
    Object.defineProperty(instance, '@id', {
        enumerable: false,
        value: id
    });
    let pairs = {};
    for (let i in model['@struct'].fields) {
        let f = model['@struct'].fields[i];
        pairs[f] = [f, f]
    };
    let mapping = ObjSelector(model['@struct'], 'mapping', true);
    for (let key in mapping) {
        pairs[key] = [key, mapping[key]];
    }
    for (let i in model['@struct'].fields) {
        let field = model['@struct'].fields[i];
        let fieldname = pairs[field][0];
        let columnname = pairs[field][1];
        let config = {
            enumerable: true
        }
        if (!empty(
                model['@struct'].relay[fieldname]
            )) {
            //read content and retrieve instance of relayed object
            config.get = async function () {
                let row = await db.select(columnname).from(model['@struct'].table).where(model['@struct'].id, '=', id).limit(1);
                return Models[model['@struct'].relay[fieldname].model][row[0][columnname]]
            }
        } else {
            //just read content
            config.get = async function () {
                let row = await db.select(columnname).from(model['@struct'].table).where(model['@struct'].id, '=', id).limit(1);
                return row[0][columnname]
            }

            config.set = async function (value) {
                let row = {}
                row[columnname] = value
                await db.update(row).where(model['@struct'].id, '=', model['@id']).into(model['@struct'].table);
            }
        }


        Object.defineProperty(instance, fieldname, config)
    }
    instance.asObject = async function (fieldset = []) {
        let o = {}
        if (empty(fieldset)) {
            fieldset = []
            for (let i in pairs) fieldset.push(pairs[i][0]);
        }
        for (let i in pairs) {
            let field = pairs[i][0];
            if (fieldset.indexOf(field) > -1) {
                o[field] = await this[pairs[i][0]];
                if (!empty(
                        model['@struct'].relay[field]
                    )) {
                    if (!empty(o[field])) o[field] = o[field]['@id'];
                    else o[field] = null;
                }
            }
        }
        return o;
    }
    Object.defineProperty(instance, 'asObject', {
        enumerable: false,
    });

    return instance
}

let Model_Indexes = async function (db, struct, models) {
    /*
    struct{
           *id (string) name of id field
           *fields(array of string)  names of object fields.
            mapping(object key-value) field->column mapping. key is object field, value is table column. If pair not set, use column name as object field
          }
    */

    let model = {}
    //add meta-info about model
    model['@struct'] = struct;
    model['@id'] = struct.id;

    //define method for reading indexes and set instance objects for table rows
    model.readIndexes = async function () {
        let indexes = await db.select(model['@id']).from(model['@struct']['table']);
        indexes.forEach(function (id) {
            model[id[model['@id']]] = InstanceOf(db, model, id[model['@id']], models)
        })
    }

    //define method for checking existense of  record in DB (). if record no more available, delete it's index from model
    model.refresh = async function () {
        for (id in this) {
            let check = await this[id].asObject(model['@id']);
            if (empty(check)) delete this[id];
        }
        await this.readIndexes();
    }

    //do not show methods in "for ... in ..." structures
    for(let method in model){
        Object.defineProperty(model, method, {
            enumerable: false
        });
    }

    //first-time populate index.
    await model.readIndexes();
    //finish
    return model;
}
module.exports = class ORM {
    constructor(db = "default") {
        this._db = db;

        this.DB = function () {
            return Application.DB[this._db];
        };

    }

    async factory() {
        let DB = this.DB();
        let model = ObjSelector(Application, 'ORM.' + this._db, true);
        let Object_keys_global = Object.keys(global)
        let models = [];
        Object_keys_global.forEach(key => {
            if (key.startsWith('Model_')) models.push(key)
        })
        Object_keys_global = undefined;
        for (let i in models) {
            let m = models[i];
            if ("object" === typeof global[m]) {
                model[m.slice('Model_'.length)] = await Model_Indexes(DB, global[m], model)
            }
        }
    }
}