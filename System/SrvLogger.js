module.exports = class SrvLogger{
    static access_file = Application.lib.path.join(Application._dirname, Application.config.Server.AccessLog)
    static error_file = Application.lib.path.join(Application._dirname, Application.config.Server.ErrorLog)

    static access(req,res) {
        let currDate = new Date();
        currDate = toRuTimeString(currDate) + ' ' + toRuDateString(currDate);
        let row = `${res.statusCode}\t${req.ip}\t[${currDate}]\t${req.method}\t${req.headers['host']}\t${req.url}\t${req.headers['user-agent']}\n`;
        Application.lib.fs.appendFile(this.access_file, row, (err) => {});
    }

    static error(req, err) {
        let currDate = new Date();
        currDate = toRuTimeString(currDate) + ' ' + toRuDateString(currDate);
        let row = "";
        try {
            row = req.ip + '  [' + currDate + '] ' + req.method + ' ' + req.headers['host'] + ' ' + req.url + '\n';
        } catch (e) {}
        row += err + '\n';
        row += JSON.stringify(req.params) + '\n';
        row += '\n';
        Application.lib.fs.appendFile(this.error_file, row, (err) => {});
    }
}
