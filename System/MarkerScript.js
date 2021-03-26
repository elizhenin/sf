// View parse with small scripting support

module.exports = function MarkerScript(view_name = null, req = null, res = null) {
    // marker brackets:
    this.markerBefore = '{{';
    this.markerAfter = '}}';
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
            //for execution priority - 'inc' blocks must be before 'for' and both them before static variables
            var inc_list = []
            var for_list = [];
            var other_list = [];
            this.markers.forEach(marker => {
                if (marker.startsWith('include ')) {
                    inc_list.push(marker);
                } else {
                    if (marker.startsWith('for ')) {
                        for_list.push(marker);
                    } else {
                        other_list.push(marker);
                    }
                }
            });
            this.markers = inc_list.concat(
                for_list.concat(
                    other_list
                )
            );
            inc_list = undefined;
            for_list = undefined;
            other_list = undefined;

        } catch (e) {}
    };

    //for object
    if (view_name) {
        try {
            this.html = Application.System.ObjSelector(Application.View, view_name);
            this._aggregateMarkers();
        } catch (e) {
            throw new Error('View "' + view_name + '" not found')
        }
    }


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
    this.parse = async function () {
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
            for(let markers_index in this.markers){
                let key = this.markers[markers_index]

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
                            
                            is variable something
                            {some block for condition variable==something is true}
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
                                    let View_Block = new MarkerScript();
                                    View_Block.factory(CycleBlock);
                                    View_Block.data(this._data[command[1]][key]);
                                    block_list += await View_Block.value();
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
                                let View_Block = new MarkerScript();
                                View_Block.factory(CycleBlock);
                                View_Block.data(this._data[command[1]]);
                                this.html = BeforeBlock + await View_Block.value() + AfterBlock;
                            }

                            break;
                        }

                        case "include": {
                            //include static view in place
                            /*
                            Syntax:
                            include View.form
                            */
                            var BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'include ' + command[1] + this.markerAfter);
                            var AfterBlock = AfterMarker(this.html, this.markerBefore + 'include ' + command[1] + this.markerAfter);
                            if (typeof command[1] != "undefined") {
                                /* variables syntax:
                                ?var_name, if "?" found - look for var_name in data and replace
                                */
                                let view_path = command[1].split('.');
                                for (let i in view_path) {
                                    let path_part = view_path[i];
                                    let part_var = path_part.split('?');
                                    if (part_var.length > 1) {
                                        for (let k in part_var) {
                                            if (typeof this._data[part_var[k]] != "undefined")
                                                part_var[k] = this._data[part_var[k]].toString();
                                        }
                                    }
                                    view_path[i] = part_var.join('');
                                }
                                view_path = view_path.join('.');
                                let view_exist = true;
                                if (!Application.System.ObjSelector(Application.View, view_path)) {
                                    view_exist = false;
                                }


                                if (view_exist) {
                                    let View_Block = new MarkerScript(view_path);
                                    View_Block.data(this._data);
                                    this.html = BeforeBlock + await View_Block.value() + AfterBlock;
                                } else {
                                    ErrorCatcher('Error: View ' + view_path + ' not found')
                                }

                            }

                            break;
                        }
                        case 'widget': {
                            //execute async function and put result in place
                            /*
                            Syntax:
                            include Application.Library.SomeFunc
                            ^^ means "await Application.Library.SomeFunc(this._data)"
                            */
                            var BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'widget ' + command[1] + this.markerAfter);
                            var AfterBlock = AfterMarker(this.html, this.markerBefore + 'widget ' + command[1] + this.markerAfter);
                            if (typeof command[1] != "undefined") {
                               
                                let code_path = command[1];
                                let code_exist = true;
                                if (!Application.System.ObjSelector(global, code_path)) {
                                    code_exist = false;
                                }

                                if (code_exist) {
                                    let New_Block = Application.System.ObjSelector(global, code_path);
                                    this.html = BeforeBlock + await New_Block(req,res,this._data) + AfterBlock;
                                } else {
                                    ErrorCatcher('Error: Function ' + code_path + '() not found')
                                }
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
            }
        } catch (e) {}
        return this;
    };
    //apply replacement, clear unused markers and return current resulting text
    this.render = async function () {
        await this.parse();

        this._aggregateMarkers();
        try {
            this.markers.forEach(marker => {
                this.html = this.html.split(this.markerBefore + marker + this.markerAfter).join('');
            });
        } catch (e) {}
        return this.html;
    };

    //apply replacement and return current resulting text
    this.value = async function () {
        await this.parse();
        this._aggregateMarkers();
        return this.html;
    };

};
