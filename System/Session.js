let _cookieName = 'sf-session-id';
try {
    let tmp = Application.config.Session.CookieName;
    if (tmp != undefined) _cookieName = tmp;
} catch (e) {}

let maxAge =  60 * 15;//15 minutes
try {
    if (Application.config.Session.CookieMaxAge != undefined) maxAge = Application.config.Session.CookieMaxAge;
} catch (e) {}

module.exports = {
    _cookieName: _cookieName,
    _storage: {},
    instance: class {
        constructor(session_id = '@') {
            if (typeof Application.System.Session._storage[session_id] == 'undefined') Application.System.Session._storage[session_id] = {};
            this._storage = Application.System.Session._storage[session_id];
        }

        get(key, alt) {
            let result = alt;
            if (typeof this._storage[key] != "undefined") result = this._storage[key];
            return result;
        }

        set(key, value) {
            this._storage[key] = value;
            return value
        }

    },

    middleware: function (req, res) {
        //called in Routes
        let session_id;
        if (typeof req.cookies[Application.System.Session._cookieName] != "undefined") {
            session_id = req.cookies[Application.System.Session._cookieName];
        } else session_id = GUID();
    
        res.setHeader('Set-Cookie', `${Application.System.Session._cookieName}=${session_id}; HttpOnly; Path=/;Max-Age=${maxAge}`);

        return true;
    }
}
