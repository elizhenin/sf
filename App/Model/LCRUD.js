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

module.exports = class extends Application.Model.$SF {
 
    async With(table) {
        this._selected_table = table;
        return this;
    }

    async Create(item_object) {
        let $db = await this.DB().insert(item_object).into(this._selected_table);
        return $db;
    }

    async Create(item_object) {
        let $db = await this.DB().insert(item_object).into(this._selected_table);
        return $db;
    }

    async Read(item_id) {
        let records = await this.DB().select('').from(this._selected_table).where('id', '=', item_id).limit(1);
        if (records.length) return records[0];
        else return false;
    }

    async List(filter) {
        let records = this.DB().select('').from(this._selected_table);
        if (filter && typeof filter == typeof []) {
            for (let i in filter) {
                let item = filter[i]
                records = records.where(item.field, item.expression, item.value);
            }
        }
        records = await records;
        if (records.length) return records;
        else return false;
    }

    async Update(item_object) {
        let item_id = item_object.id;
        delete item_object.id;
        let $db = await this.DB().update(item_object).where('id', '=', item_id).into(this._selected_table);
        return $db;
    }

    async Delete(item_id) {
        let $db = await this.DB().where("id", '=', item_id).del().into(this._selected_table);
        return $db;
    }

}
