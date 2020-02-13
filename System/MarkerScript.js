// View parse with small scripting support

module.exports = function MarkerScript(view_name) {
    // marker brackets:
    this.markerBefore = '<%';
    this.markerAfter = '%>';
    // content of this View:
    this.html = '';
    this.markers = {};

    this._aggregateMarkers = function () {
        var pattern = new RegExp('(' + this.markerBefore + ')(.+?)(' + this.markerAfter + ')', 'g');
        this.markers = this.html.match(pattern);
        try {
            for (i = 0; i < this.markers.length; i++) {
                this.markers[i] = this.markers[i].split(this.markerBefore).join('');
                this.markers[i] = this.markers[i].split(this.markerAfter).join('');
            }
            //for execution priority - 'for' blocks must be before static variables
            var for_list = [];
            var other_list = [];
            this.markers.forEach(marker => {
                if (marker.startsWith('for ')) {
                    for_list.push(marker);
                } else {
                    other_list.push(marker);
                }
            });
            this.markers = for_list.concat(other_list);
            for_list = undefined;
            other_list = undefined;

        } catch (e) {}

    };

    //for object
    try {
        this.html = Application.module.ObjSelector(Application.View, view_name);
        this._aggregateMarkers();
    } catch (e) {}


    //from variable
    this.factory = function (html) {
        this.html = html;
        this._aggregateMarkers();
    };


    // key = value for replacement
    this._data = {};

    // save one pair marker=content in data
    this.apply = function (marker, content) {
        this._data[marker] = content;
        return this;
    };
    // add array of pairs marker=content to data 
    this.data = function (datapack) {
        this._data = Object.assign(this._data, datapack);
        return this;
    };


    //apply replacement
    this.parse = function () {

        function BeforeMarker(html, marker) {
            var beginPos = 0;
            var endPos = html.indexOf(marker);
            var result = html;
            if (endPos > -1) {
                result = html.slice(beginPos, endPos);
            }
            return result;
        }

        function AfterMarker(html, marker) {
            var beginPos = html.indexOf(marker);
            var result = '';
            if (beginPos > -1) {
                result = html.slice(beginPos + marker.length);
            }
            return result;
        }

        try {
            this.markers.forEach(key => {
                if (key.indexOf(' ') > -1) {
                    //command found
                    var command = key.split(' ');
                    switch (command[0]) {
                        case "if": {
                            //if condition
                            /*
                            Syntax:
                            
                            if variable
                            {some block for variable==true}
                             [ else variable
                            {some alt block  for variable==false} ]
                            endif variable

                            */

                            var BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'if ' + command[1] + this.markerAfter);
                            var AfterBlock = AfterMarker(this.html, this.markerBefore + 'if ' + command[1] + this.markerAfter);
                            var TrueBlock = BeforeMarker(AfterBlock, this.markerBefore + 'endif ' + command[1] + this.markerAfter);
                            AfterBlock = AfterMarker(AfterBlock, this.markerBefore + 'endif ' + command[1] + this.markerAfter);
                            var FalseBlock = AfterMarker(TrueBlock, this.markerBefore + 'else ' + command[1] + this.markerAfter);
                            TrueBlock = BeforeMarker(TrueBlock, this.markerBefore + 'else ' + command[1] + this.markerAfter);

                            if (typeof this._data[command[1]] != "undefined") {
                                if (this._data[command[1]]) { //show block if true
                                    this.html = BeforeBlock + TrueBlock + AfterBlock;
                                } else { //show alt block if false
                                    this.html = BeforeBlock + FalseBlock + AfterBlock;
                                }
                            }
                            break;
                        }

                        case "is": {
                            //is condition
                            /*
                            Syntax:
                            
                            is variable==something
                            {some block for condition is true}
                             [ notis variable
                            {some alt block  for condition is false} ]
                            endis variable

                            */

                            var BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'is ' + command[1] + " " + command[2] + this.markerAfter);
                            var AfterBlock = AfterMarker(this.html, this.markerBefore + 'is ' + command[1] + " " + command[2] + this.markerAfter);
                            var TrueBlock = BeforeMarker(AfterBlock, this.markerBefore + 'endis ' + command[1] + this.markerAfter);
                            AfterBlock = AfterMarker(AfterBlock, this.markerBefore + 'endis ' + command[1] + this.markerAfter);
                            var FalseBlock = AfterMarker(TrueBlock, this.markerBefore + 'notis ' + command[1] + this.markerAfter);
                            TrueBlock = BeforeMarker(TrueBlock, this.markerBefore + 'notis ' + command[1] + this.markerAfter);

                            if (typeof this._data[command[1]] != "undefined") {
                                if (this._data[command[1]] == command[2]) { //show block if true
                                    this.html = BeforeBlock + TrueBlock + AfterBlock;
                                } else { //show alt block if false
                                    this.html = BeforeBlock + FalseBlock + AfterBlock;
                                }
                            }
                            break;
                        }

                        case "for": {
                            //for cycle
                            /*
                            Syntax:
                            
                            for array
                            {some block}
                            endfor array

                            */
                            var BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'for ' + command[1] + this.markerAfter);
                            var AfterBlock = AfterMarker(this.html, this.markerBefore + 'for ' + command[1] + this.markerAfter);
                            var CycleBlock = BeforeMarker(AfterBlock, this.markerBefore + 'endfor ' + command[1] + this.markerAfter);
                            AfterBlock = AfterMarker(AfterBlock, this.markerBefore + 'endfor ' + command[1] + this.markerAfter);

                            if (typeof this._data[command[1]] != "undefined") {
                                var block_list = '';
                                for (let key in this._data[command[1]]) {
                                    var View_Block = new MarkerScript();
                                    View_Block.factory(CycleBlock);
                                    View_Block.data(this._data[command[1]][key]);
                                    block_list += View_Block.value();
                                }
                                this.html = BeforeBlock + block_list + AfterBlock;
                            }

                            break;
                        }

                        case "with": {
                            //for entering deeper in object branch
                            /*
                            Syntax:
                            
                            with object
                            {some block}
                            endwith object

                            */
                            var BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'with ' + command[1] + this.markerAfter);
                            var AfterBlock = AfterMarker(this.html, this.markerBefore + 'with ' + command[1] + this.markerAfter);
                            var CycleBlock = BeforeMarker(AfterBlock, this.markerBefore + 'endwith ' + command[1] + this.markerAfter);
                            AfterBlock = AfterMarker(AfterBlock, this.markerBefore + 'endwith ' + command[1] + this.markerAfter);

                            if (typeof this._data[command[1]] != "undefined") {
                                var View_Block = new MarkerScript();
                                View_Block.factory(CycleBlock);
                                View_Block.data(this._data[command[1]]);
                                this.html = BeforeBlock + View_Block.value() + AfterBlock;
                            }

                            break;
                        }

                        default: {

                        }
                    }

                } else {
                    //its just a variable
                    try {
                        if (this._data[key])
                            this.html = this.html.split(this.markerBefore + key + this.markerAfter).join(this._data[key]);
                    } catch (e) {
                        ErrorCatcher(e);
                    }
                }
            });
        } catch (e) {}
        return this;
    };
    //apply replacement, clear unused markers and return current resulting text
    this.render = function () {
        this.parse();

        this._aggregateMarkers();
        try {
            this.markers.forEach(marker => {
                this.html = this.html.split(this.markerBefore + marker + this.markerAfter).join('');
            });
        } catch (e) {}
        return this.html;
    };

    //apply replacement and return current resulting text
    this.value = function () {
        this.parse();
        this._aggregateMarkers();
        return this.html;
    };
};