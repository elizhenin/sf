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
        'parent':'Pages',
        'user':'Users'
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
Application.ORM.<db_name>.forEach(
    async function(model){
         await model.refresh()
        } )

4) Look at Application.ORM.<db_name> object three. If all correct - you'll see models and items inside them.
Items are enumerated by for(<id> in <model>){} construction:
for(let id in Application.ORM.<db_name>.<modelName>) 
  {
    let item = Application.ORM.<db_name>.<modelName>[id];
     //take value of field:
    let pageName = await item.name;
     //also in subitem, as configurated in "relay" section of model:
    let userName = await (await item.user).name;
     //and you can take the record as simple key:value object
    let data = await item.asObject();// asObject([array of fieldName] , fullTree = false)
     //or only some fields
    let smallData = await item.asObject(['name','alias']);
     //full recursive tree
     let allData = await item.asObject([],true);
  }

*TO add new row to table, use
  newObj = await Application.ORM.<db_name>.<modelName>.new({
     fieldName1:<value>,
     fieldName2:<value>,
     ...
 });
 the newObj will be an Instance of new record, and Model also will be populated with new <id>

 *TO delete a record, use one of the folowing:
 - await Application.ORM.<db_name>.<modelName>.delete(<id>)
 or
 - await Application.ORM.<db_name>.<modelName>[<id>].delete()
 where <id> is record id (table PK)
*/


module.exports = class ORM {
    constructor(db = "default") {
        this._db = db;

        this.DB = function () {
            return Application.DB[this._db];
        };

    }

    async factory(modelName = undefined) {
        let model;
        if (this._db === "default") model = ObjSelector(Application, 'ORM', true);
        else  model = ObjSelector(Application, 'ORM.' + this._db, true)

        let models = [];
        if(empty(modelName)){
            let Object_keys_global = Object.keys(global)
            Object_keys_global.forEach(key => {
                if (key.startsWith('Model_')) models.push(key)
            })
            Object_keys_global = undefined;
        }else{
            models.push(modelName)
        }

        for (let i in models) {
            let m = models[i];
            if ("object" === typeof global[m]) {
                model[m.slice('Model_'.length)] = new this.Model(this.DB(), model, global[m]);
                //first-time populate index.
                await model[m.slice('Model_'.length)].read();
            }
        }
    }

    //all the rest
    Model = class {
        constructor(db, models, struct) {
            //add meta information
            this['@id'] = struct.id;
            this['@struct'] = struct;
            //add external objects
            this.db = db;
            this.models = models

            // do not show methods in "for ... in ..." structures
            for (let method in this) {
                Object.defineProperty(this, method, {
                    enumerable: false
                });
            }
        }
        //define method for reading indexes and set instance objects for table rows
        async read() {
            let db = this.db;
            let model = this;
            let indexes = await db.select(model['@id']).from(model['@struct']['table']);
            indexes.forEach(function (id) {
                model[id[model['@id']]] = new Application.System.ORM.Instance(model, id[model['@id']]);
                model[id[model['@id']]].read();
            })
        }
        //define method for checking existense of  record in DB (). if record no more available, delete it's index from model
        async refresh() {
            let model = this;
            for (let id in model) {
                let check = await model[id].asObject(model['@id']);
                if (empty(check)) delete model[id];
            }
            await this.read();
        }

        async delete(id){
            await this["@id"].delete();
        }
        async new(row = {}){
            let newObject = new Application.System.ORM.Instance(this,0);
            let pairs = newObject['@pairs'];
            let _row = {};
            
            for(let i in _row){
                _row[pairs[i][1]] = null;
            }

            for(let i in row){
                _row[pairs[i][1]] = row[i];
            }
            let db = this.db;
            let id = (await db.insert(_row).into(this['@struct'].table))[0];
            this[id] = new Application.System.ORM.Instance(this,id);
            this[id].read();
            return this[id];
        }
    }

    static Instance = class {
        constructor(model, id) {
            //add internal attributes
            this['@id'] = id;

            //add links to external objects
            this['@model'] = model;

            let pairs = {}; //field-column mapping
            for (let i in model['@struct'].fields) {
                let f = model['@struct'].fields[i];
                pairs[f] = [f, f]
            };
            let mapping = ObjSelector(model['@struct'], 'mapping', true);
            for (let key in mapping) {
                pairs[key] = [key, mapping[key]];
            }
            this['@pairs'] = pairs;


            // do not show methods in "for ... in ..." structures
            for (let method in this) {
                Object.defineProperty(this, method, {
                    enumerable: false
                });
            }
        }

        read() {
            //read and add
            let id = this['@id'];
            let model = this['@model'];
            let pairs = this['@pairs'];
            let Models = model.models;
            let db = model.db;

            //populate objects with fields, set up getter/setter for each
            for (let i in model['@struct'].fields) {
                let field = model['@struct'].fields[i];
                let fieldname = pairs[field][0];
                let columnname = pairs[field][1];
                let config = {
                    enumerable: true,
                    configurable: true,
                    writeable: true
                }
                if (!empty(
                        model['@struct'].relay[fieldname]
                    )) {
                    //read content and retrieve instance of relayed object
                    config.get = async function () {
                        let row = await db.select(columnname).from(model['@struct'].table).where(model['@struct'].id, '=', id).limit(1);
                        return Models[model['@struct'].relay[fieldname]][row[0][columnname]]
                    }
                    config.set = async function (value) {
                        let row = {}
                        if ("object" === typeof value) row[columnname] = value['@id'];
                        else row[columnname] = value;
                        await db.update(row).where(model['@struct'].id, '=', id).into(model['@struct'].table);
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
                        await db.update(row).where(model['@struct'].id, '=', id).into(model['@struct'].table);
                    }
                }
                Object.defineProperty(this, fieldname, config);
            }
        }

        async asObject(fieldset = [], fullTree = false) {
            let pairs = this['@pairs']
            let model = this['@model'];
            let Models = model.models;
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
                        if (fullTree && !empty(o[field])) {
                            o[field] = await Models[model['@struct'].relay[field]][o[field]].asObject([], fullTree)
                        }
                    }

                }
            }
            return o;
        }

        async delete(){
            let model = this['@model'];
            let db = model.db;
            await db.where(model['@struct'].id,'=',this['@id']).del().into(model['@struct'].table);
            delete model[this['@id']];
        }
    }
}
