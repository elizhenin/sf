let _cookieName = 'sf-session-id';
try {
    let tmp = Application.config.Session.CookieName;
    if (tmp != undefined) _cookieName = tmp;
} catch (e) { }

let CookieMaxAge = 900; //15 minutes
if (!empty(Application.config.Session) && !empty(Application.config.Session.CookieMaxAge)) CookieMaxAge = Application.config.Session.CookieMaxAge;


module.exports = class Session extends BaseObject {
    static _cookieName = _cookieName
    static _storage = {}
    static _lastAccess = {}
    static instance = class extends BaseObject {
        constructor(session_id = '@') {
            super();
            if (empty(Application.System.Session._storage[session_id])) Application.System.Session._storage[session_id] = {};
            this._storage = Application.System.Session._storage[session_id];
            this._session_id = session_id;
        }

        get(key, alt) {
            let result = alt;
            if (!empty(this._storage[key])) result = this._storage[key];
            return result;
        }

        set(key, value) {
            this._storage[key] = value;
            return value
        }

    }

    static middleware(req, res) {
        //called in Routes
        let session_id;
        if (!empty(req.cookies[Application.System.Session._cookieName])) {
            session_id = req.cookies[Application.System.Session._cookieName];
        } else session_id = GUID();

        req[Application.System.Session._cookieName] = session_id;
        res.setHeader('Set-Cookie', `${Application.System.Session._cookieName}=${session_id}; HttpOnly; Path=/;Max-Age=${CookieMaxAge};SameSite=None;Secure`);
        Application.System.Session._lastAccess[session_id] = Date.now();
        return true;
    }
}


let CleanupInterval = 5000;
if (!empty(Application.config.Session) && !empty(Application.config.Session.CleanupInterval)) CleanupInterval = Application.config.Session.CleanupInterval;
setInterval(function () {
    let now = Date.now();
    let end = CookieMaxAge * 1000;
    let sessions = Object.keys(Application.System.Session._lastAccess);
    let sessions_length = sessions.length;
    for (let i = 0; i < sessions_length; i++) {
        let session = sessions[i];
        let age = now - Application.System.Session._lastAccess[session];
        if (age > end) {
            delete Application.System.Session._lastAccess[session];
            delete Application.System.Session._storage[session];
        }
    }
}, CleanupInterval)
