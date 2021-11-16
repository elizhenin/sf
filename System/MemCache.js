module.exports = class{
    constructor() {
        let CleanupInterval = 5000;
        let ResponseTTL = 50000;
        if (!empty(Application.config.MemCache) && !empty(Application.config.MemCache.ResponseTTL)) ResponseTTL = Application.config.MemCache.ResponseTTL;
        setInterval(function () {
            console.log(MemCache._storage)
            let now = Date.now();
            for (let i in MemCache._storage) {
                let item = MemCache._storage[i];
                let age = now - item.time;
                if (age > ResponseTTL) {
                    delete MemCache._storage[i];
                }
            }
        }, CleanupInterval);
    }
    _storage = {}
    set(key, data) {
        this._storage[key] = {
            time: +Date.now(),
            data: data
        }
    }
    get(key) {
        if (this.isset(key)) return this._storage[key].data;
        else return null;
    }

    isset(key) {
        return (!empty(this._storage[key]))
    }
}