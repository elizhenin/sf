/*
sample Model with basic CRUD operations
(L)ist, (C)reate, (U)pdate, (D)elete
filters for List:
[ {
 field: field_name,
 expression: sql_expression,
 value: search_value
}, ... ]

usage:
await LCRUD.With("tablename")
await LCRUD.<Operation>()
*/

module.exports = function (db_config = 'default') {
    let NewOBJ = {};
    NewOBJ._settings = {
        'db_config': db_config
    };
    NewOBJ.DB = function () {
        return Application.DB[NewOBJ._settings.db_config];
    };

    NewOBJ.With = async function (table) {
        this._selected_table = table;
        return this;
    }
    NewOBJ.Create = async function (item_object) {
        let $db = await this.DB().insert(item_object).into(this._selected_table);
        return $db;
    }
    NewOBJ.Read = async function (item_id) {
        let records = await this.DB().select('').from(this._selected_table).where('id', '=', item_id).limit(1);
        if (records.length) return records[0];
        else return false;
    }
    NewOBJ.List = async function (filter) {
        let records = this.DB().select('').from(this._selected_table);
        if(filter && typeof filter == typeof []){
            for(let i in filter){
                let item = filter[i]
                records = records.where(item.field,item.expression,item.value);
            }
        }
        records = await records;
        if (records.length) return records;
        else return false;
    }
    NewOBJ.Update = async function (item_object) {
        let item_id = item_object.id;
        delete item_object.id;
        let $db = await this.DB().update(item_object).where('id', '=', item_id).into(this._selected_table);
        return $db;
    }
    NewOBJ.Delete = async function (item_id) {
        let $db = await this.DB().where("id", '=', item_id).del().into(this._selected_table);
        return $db;
    }

    return NewOBJ;
};