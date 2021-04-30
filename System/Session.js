let _cookieName = 'sukina-session-id';
try {
    let tmp = Application.config.Session.CookieName;
    _cookieName = tmp;
} catch (e) {}

module.exports = {
    _cookieName:_cookieName,
    _storage:{},
    instance:class{
        constructor(session_id = '@'){
            if(typeof  Application.System.Session._storage[session_id] =='undefined') Application.System.Session._storage[session_id] = {};
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

    middleware:function (req, res) {
        let id;
        if (typeof req.cookies[Application.System.Session._cookieName] != "undefined") {
            id = req.cookies[Application.System.Session._cookieName];
        } else id = Date.now() + "_" + md5(req.ip);
        let maxAge = 1000 * 60 * 15;
        try {
            let tmp = Application.config.Session.CookieMaxAge;
            maxAge = tmp;
        } catch (e) {}
        res.setHeader('Set-Cookie', `${[Application.System.Session._cookieName]}=${id}; HttpOnly; Path=/;Max-Age=${maxAge}`)
        return true;
    }
}