module.exports = {
    toRuDateString: function (d) {
        var date = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
        return date;
    },
    toRuTimeString: function (d) {
        var time = d.getHours() + ":" + ("0" + d.getMinutes(2)).slice(-2) + ":" + ("0" + d.getSeconds(2)).slice(-2);
        return time;
    },
    toRuDateTimeString: function (d) {
        var date = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
        var time = d.getHours() + ":" + ("0" + d.getMinutes(2)).slice(-2);
        return time + ' ' + date;
    }
};