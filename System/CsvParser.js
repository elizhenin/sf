const parseCSV = use(Application.lib['csv-load-sync'].parseCSV);

module.exports = class CsvParser extends Array{

    constructor(string) {
        super();
        const jsonObj = parseCSV(string)
        //attempt to determine bools and numbers
        for (let row of jsonObj) {
            const keys = Object.keys(row);
            for (const k of keys) {
                if (row[k].toLowerCase() === 'true') row[k] = true;
                if (row[k].toLowerCase() === 'false') row[k] = false;
                if (row[k].toLowerCase() === 'null') row[k] = null;
                if (row[k].toLowerCase() === 'nan') row[k] = NaN;
                if (row[k].toLowerCase() === 'undefined') row[k] = undefined;
                if (row[k] == parseFloat(row[k])) row[k] = parseFloat(row[k]);
            }
            this.push(row);
        }
    }
}