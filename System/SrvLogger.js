module.exports = {
    "access_file": Application.lib.path.join(Application._dirname, Application.config.Server.AccessLog),
    "error_file": Application.lib.path.join(Application._dirname, Application.config.Server.ErrorLog),

    "access": function (req) {
        let currDate = new Date();
        currDate = toRuTimeString(currDate) + ' ' + toRuDateString(currDate);
        let row = req.connection.remoteAddress + ' (' + req.headers['x-forwarded-for'] + ')   [' + currDate + '] ' + req.method + ' ' + req.headers['host'] + ' ' + req.url + ' ' + req.headers['user-agent'] + '\n';
        Application.lib.fs.appendFile(this.access_file, row, (err) => {});
    },

    "error": function (req, err) {
        let currDate = new Date();
        currDate = toRuTimeString(currDate) + ' ' + toRuDateString(currDate);
        let row = req.connection.remoteAddress + ' (' + req.headers['x-forwarded-for'] + ')  [' + currDate + '] ' + req.method + ' ' + req.headers['host'] + ' ' + req.url + '\n';
        row += err + '\n';
        row += JSON.stringify(req.params) + '\n';
        row += '\n';
        Application.lib.fs.appendFile(this.error_file, row, (err) => {});
    }
}
