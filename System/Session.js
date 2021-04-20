module.exports = {
    _storage: {},
    instance: function (session_id = '@') {
        this._storage[session_id] = {};
        let NewOBJ = {}
        NewOBJ._storage = this._storage[session_id];
            NewOBJ.get = function (key, alt) {
                let result = alt;
                if (typeof this._storage[key] != "undefined") result = this._storage[key];
                return result;
            };

            NewOBJ.set = function (key, value) {
                this._storage[key] = value;
                return value
            }
            
        return NewOBJ;
    },
    middleware: async function (req, res) {
        let id;
        if (typeof req.cookies.Session != "undefined") {
            id = req.cookies.Session;
        }else id = Date.now() + "_" + md5(req.ip);
        res.setHeader('Set-Cookie',`Session=${id}; HttpOnly; Path=/;Max-Age=${1000 * 60 * 15}`)
        return true;
    }
}