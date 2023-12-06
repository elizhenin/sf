class SrvLogger extends BaseObject {
    static access_file = Application.lib.path.join(Application._dirname, Application.config.Server.AccessLog)
    static error_file = Application.lib.path.join(Application._dirname, Application.config.Server.ErrorLog)

    static access(req, res) {
        let currDate = new Date();
        currDate = toRuTimeString(currDate) + ' ' + toRuDateString(currDate);
        let row = `${res.statusCode}\t${req.ip}\t[${currDate}]\t${req.method}\t${req.headers['host']}\t${req.url}\t${req.headers['user-agent']}\n`;
        Application.lib.fs.appendFile(this.access_file, row, (err) => { });
    }

    static error(req, err) {
        let currDate = new Date();
        currDate = toRuTimeString(currDate) + ' ' + toRuDateString(currDate);
        let ip = 'unknownIP';
        let method = 'unknownMethod';
        let host = 'unknownHost';
        let url = 'unknownUrl';
        let params = '';
        if (!empty(req)) {
            if (req.ip) ip = req.ip;
            if (req.method) method = req.method;
            if (req.headers && req.headers['host']) host = req.headers['host'];
            if (req.url) url = req.url;
            if (req.params) params = JSON.stringify(req.params, ' ', 2);
        }
        let row = "";
        row = `${ip}  [${currDate}] ${method} ${host} ${url}\n`;
        row += `error msg: ${(typeof err === 'object') ? (JSON.stringify(err, ' ', 2)) : err}\n`;
        row += `body params: ${params}\n`;
        row += '\n';
        Application.lib.fs.appendFile(this.error_file, row, (err) => { });
    }
}

//override global error catcher
global.ErrorCatcher = function (e, req = null) {
    console.log(e);
    SrvLogger.error(req, e);
}

module.exports = SrvLogger;
