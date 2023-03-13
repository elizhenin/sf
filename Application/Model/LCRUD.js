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

module.exports = class extends Application.System.Model {
 
    async With(table) {
        this._selected_table = table;
        return this;
    }

    async Create(item_object) {
        let $db = await this.DB().insert(item_object).into(this._selected_table);
        return $db;
    }

    async Read(item_id) {
        let records = await this.DB().select().from(this._selected_table).where('id', '=', item_id).limit(1);
        if (records.length) return records[0];
        else return false;
    }

    async List(filter) {
        let records = this.DB().select().from(this._selected_table);
        if (filter && typeof filter == typeof []) {
            for (let i in filter) {
                let item = filter[i]
                if (["string", "number"].indexOf(typeof item.value) > -1) records = records.where(item.field, item.expression, item.value);
                if (typeof item.value == "object") {
                    if (item.logic == 'AND') {
                        for (let value_index in item.value) records = records.where(item.field, item.expression, item.value[value_index]);
                    }
                    if (item.logic == 'OR') {
                        records = records.andWhere(function () {
                            let count = 0;
                            let op = 'orWhere';
                            for (let value_index in item.value) {
                                this[op](item.field, item.expression, item.value[value_index])
                                count = count + 1;
                            }
                        })
                    }
                }
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
        let op = "=";
        if (typeof item_id.length == "number") op = "IN";
        let $db = await this.DB().where("id", op, item_id).del().into(this._selected_table);
        return $db;
    }

}
