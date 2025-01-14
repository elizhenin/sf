const parseCSV = use(Application.lib['csv-load-sync'].parseCSV);

module.exports = class CsvParser extends Array {

    constructor(string) {
        super();
        const jsonObj = parseCSV(string)
        //attempt to determine bools and numbers
        for (let row of jsonObj) {
            const keys = Object.keys(row);
            for (const k of keys) {
                row[k] = asType(row[k]);
            }
            this.push(row);
        }
    }
}
