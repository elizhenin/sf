//very simple view parser. replace marker by content

module.exports = function (view_name) {
    // marker brackets:
    this.markerBefore = '<%';
    this.markerAfter = '%>';
    // content of this View:
    this.html = Application.module.ObjSelector(Application.View, view_name);
    // replace one marker to content in all document
    this.apply = function (marker, content) {
        try {
            this.html = this.html.split(this.markerBefore + marker + this.markerAfter).join(content);
        } catch (e) {
            ErrorCatcher(e);
        }
        return this;
    };
    // replace pack of markers with their content (array of pairs marker=content)
    this.data = function (datapack) {
        var key;
        for (key in datapack) {
            this.apply(key, datapack[key]);
        }
        return this;
    };
    //return array of markers at the time of calling
    this.markers = function () {
        var pattern = new RegExp('(' + this.markerBefore + ')(.+?)(' + this.markerAfter + ')', 'g');
        var markers = this.html.match(pattern);
        try {
            for (i = 0; i < markers.length; i++) {
                markers[i] = markers[i].split(this.markerBefore).join('');
                markers[i] = markers[i].split(this.markerAfter).join('');
            }
        } catch (e) {}
        return markers;
    };
    //replace all unused markers and return resulting text
    this.render = function () {
        var unused_markers = this.markers();
        var clean_array = {};
        try {
            unused_markers.forEach(marker => {
                clean_array[marker] = '';
            });
            this.data(clean_array);
        } catch (e) {}
        return this.html;
    };
    //just return current resulting text
    this.value = function () {
        return this.html;
    };
};