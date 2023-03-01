// View parse with small scripting support

module.exports = class View {

    constructor(view_name = null, req = null, res = null, lang = null) {
        // marker brackets:
        this.markerBefore = '{{';
        this.markerAfter = '}}';
        // content of this View:
        this.html = '';
        this.markers = {};
        //for object
        if (view_name) {
            try {
                this.html = ObjSelector(Application.View, view_name);
                this._aggregateMarkers();
            } catch (e) {
                throw new Error('View "' + view_name + '" not found')
            }
        }

        // key = value for replacement
        this._data = {};

        this.req = req;
        this.res = res;
        this.lang = lang;
    }

    _aggregateMarkers() {
        let pattern = new RegExp('(' + this.markerBefore + ')(.+?)(' + this.markerAfter + ')', 'g');
        this.markers = this.html.match(pattern);
        try {
            for (let i = 0; i < this.markers.length; i++) {
                this.markers[i] = this.markers[i].split(this.markerBefore).join('');
                this.markers[i] = this.markers[i].split(this.markerAfter).join('');
            }
            //for execution priority - 'inc' blocks must be before 'for' and both them before static variables
            let inc_list = []
            let for_list = [];
            let with_list = [];
            let other_list = [];
            this.markers.forEach(marker => {
                let command = marker.split(' ').reverse().pop();
                switch (command) {
                    case 'include': {
                        inc_list.push(marker);
                        break;
                    }
                    case 'for': {
                        for_list.push(marker);
                        break;
                    }
                    case 'with': {
                        with_list.push(marker);
                        break;
                    }
                    default: {
                        other_list.push(marker);
                    }
                }
            });
            this.markers = inc_list;
            this.markers = this.markers.concat(for_list);
            this.markers = this.markers.concat(with_list);
            this.markers = this.markers.concat(other_list);
            inc_list = undefined;
            for_list = undefined;
            other_list = undefined;

        } catch (e) {}
    };

    //from variable
    factory(html) {
        this.html = html;
        this._aggregateMarkers();
    };

    // save one pair marker=content in data
    apply(marker, content) {
        this._data[marker] = content;
        return this;
    };
    // add array of pairs marker=content to data 
    data(datapack) {
        this._data = Object.assign(this._data, datapack);
        return this;
    };


    //apply replacement
    async parse(cleanup = false) {

        let BeforeMarker = function (html, marker) {
            let beginPos = 0;
            let endPos = html.indexOf(marker);
            let result = html;
            if (endPos > -1) {
                result = html.slice(beginPos, endPos);
            }
            return result;
        }

        let AfterMarker = function (html, marker) {
            let beginPos = html.indexOf(marker);
            let result = '';
            if (beginPos > -1) {
                result = html.slice(beginPos + marker.length);
            }
            return result;
        }


        for (let markers_index in this.markers) {

            try {
                let key = this.markers[markers_index];
                if (key.indexOf(' ') > -1) {
                    //command found
                    let command = key.split(' ');
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

                            let BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'if ' + command[1] + this.markerAfter);
                            let AfterBlock = AfterMarker(this.html, this.markerBefore + 'if ' + command[1] + this.markerAfter);
                            let TrueBlock = BeforeMarker(AfterBlock, this.markerBefore + 'endif ' + command[1] + this.markerAfter);
                            AfterBlock = AfterMarker(AfterBlock, this.markerBefore + 'endif ' + command[1] + this.markerAfter);
                            let FalseBlock = AfterMarker(TrueBlock, this.markerBefore + 'else ' + command[1] + this.markerAfter);
                            TrueBlock = BeforeMarker(TrueBlock, this.markerBefore + 'else ' + command[1] + this.markerAfter);
                            if ("undefined" != typeof this._data[command[1]]) {
                                if (this._data[command[1]]) { //show block if true
                                    this.html = BeforeBlock + TrueBlock + AfterBlock;
                                } else { //show alt block if false
                                    this.html = BeforeBlock + FalseBlock + AfterBlock;
                                }
                            } else {
                                if (cleanup) {
                                    this.html = BeforeBlock + AfterBlock;
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

                            let BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'is ' + command[1] + " " + command[2] + this.markerAfter);
                            let AfterBlock = AfterMarker(this.html, this.markerBefore + 'is ' + command[1] + " " + command[2] + this.markerAfter);
                            let TrueBlock = BeforeMarker(AfterBlock, this.markerBefore + 'endis ' + command[1] + this.markerAfter);
                            AfterBlock = AfterMarker(AfterBlock, this.markerBefore + 'endis ' + command[1] + this.markerAfter);
                            let FalseBlock = AfterMarker(TrueBlock, this.markerBefore + 'notis ' + command[1] + this.markerAfter);
                            TrueBlock = BeforeMarker(TrueBlock, this.markerBefore + 'notis ' + command[1] + this.markerAfter);

                            if ("undefined" != typeof this._data[command[1]]) {
                                if (this._data[command[1]] == command[2]) { //show block if true
                                    this.html = BeforeBlock + TrueBlock + AfterBlock;
                                } else { //show alt block if false
                                    this.html = BeforeBlock + FalseBlock + AfterBlock;
                                }
                            } else {
                                if (cleanup) {
                                    this.html = BeforeBlock + AfterBlock;
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
                            let BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'for ' + command[1] + this.markerAfter);
                            let AfterBlock = AfterMarker(this.html, this.markerBefore + 'for ' + command[1] + this.markerAfter);
                            let CycleBlock = BeforeMarker(AfterBlock, this.markerBefore + 'endfor ' + command[1] + this.markerAfter);
                            AfterBlock = AfterMarker(AfterBlock, this.markerBefore + 'endfor ' + command[1] + this.markerAfter);

                            if ("undefined" != typeof this._data[command[1]]) {

                                let block_list = '';
                                for (let key in this._data[command[1]]) {
                                    let View_Block = new View(null, this.req, this.res, this.lang);
                                    View_Block.factory(CycleBlock);
                                    View_Block.data(this._data[command[1]][key]);
                                    block_list += await View_Block.value();
                                }
                                this.html = BeforeBlock + block_list + AfterBlock;
                            } else {
                                if (cleanup) {
                                    this.html = BeforeBlock + AfterBlock;
                                }
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
                            let BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'with ' + command[1] + this.markerAfter);
                            let AfterBlock = AfterMarker(this.html, this.markerBefore + 'with ' + command[1] + this.markerAfter);
                            let CycleBlock = BeforeMarker(AfterBlock, this.markerBefore + 'endwith ' + command[1] + this.markerAfter);
                            AfterBlock = AfterMarker(AfterBlock, this.markerBefore + 'endwith ' + command[1] + this.markerAfter);

                            if ("undefined" != typeof this._data[command[1]]) {
                                let View_Block = new View(null, this.req, this.res, this.lang);
                                View_Block.factory(CycleBlock);
                                View_Block.data(this._data[command[1]]);
                                this.html = BeforeBlock + await View_Block.value() + AfterBlock;
                            } else {
                                if (cleanup) {
                                    this.html = BeforeBlock + AfterBlock;
                                }
                            }
                            break;
                        }

                        case "include": {
                            //include static view in place
                            /*
                            Syntax:
                            include View.form
                            */
                            let BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'include ' + command[1] + this.markerAfter);
                            let AfterBlock = AfterMarker(this.html, this.markerBefore + 'include ' + command[1] + this.markerAfter);
                            if (!empty(command[1])) {
                                /* variables syntax:
                                ?var_name, if "?" found - look for var_name in data and replace
                                */
                                let view_path = command[1].split('.');
                                for (let i in view_path) {
                                    let path_part = view_path[i];
                                    let part_var = path_part.split('?');
                                    if (part_var.length > 1) {
                                        for (let k in part_var) {
                                            if (!empty(this._data[part_var[k]]))
                                                part_var[k] = this._data[part_var[k]].toString();
                                        }
                                    }
                                    view_path[i] = part_var.join('');
                                }
                                view_path = view_path.join('.');

                                if (!empty(ObjSelector(Application.View, view_path))) {
                                    let View_Block = new View(view_path, this.req, this.res, this.lang);
                                    View_Block.data(this._data);
                                    this.html = BeforeBlock + await View_Block.value() + AfterBlock;
                                } else {
                                    if (cleanup) {
                                        this.html = BeforeBlock + AfterBlock;
                                    } else ErrorCatcher('Warning: View ' + view_path + ' not found')
                                }

                            }
                            break;
                        }

                        case 'widget': {
                            //execute async function and put result in place
                            /*
                            Syntax:
                            widget Application.Library.SomeFunc
                            ^^ means "await Application.Library.SomeFunc(this.req, this.res, this._data)"
                            */
                            let BeforeBlock = BeforeMarker(this.html, this.markerBefore + 'widget ' + command[1] + this.markerAfter);
                            let AfterBlock = AfterMarker(this.html, this.markerBefore + 'widget ' + command[1] + this.markerAfter);
                            if (!empty(command[1])) {

                                let code_path = command[1];
                                let code_exist = true;
                                if (!ObjSelector(global, code_path)) {
                                    code_exist = false;
                                }

                                if (code_exist) {
                                    let New_Block = ObjSelector(global, code_path);
                                    this.html = BeforeBlock + await New_Block(this.req, this.res, this._data) + AfterBlock;
                                } else {
                                    ErrorCatcher('Error: Function ' + code_path + '() not found')
                                }
                            } else {
                                if (cleanup) {
                                    this.html = BeforeBlock + AfterBlock;
                                }
                            }

                            break;
                        }

                        case "i18n": {
                            //i18n from Application.18n[langName][key], where key is all after i18n command
                            /*
                            Syntax:
                            i18n Hello World

                            */
                            let BeforeBlock = BeforeMarker(this.html, this.markerBefore + key + this.markerAfter);
                            let AfterBlock = AfterMarker(this.html, this.markerBefore + key + this.markerAfter);

                            let lang_key = key.slice(4, key.length).trim();
                            if (!empty(this.lang)) {
                                let value = lang_key;
                                let langpack = ObjSelector(Application.i18n, this.lang, true);
                                if (!empty(langpack[lang_key])) value = langpack[lang_key];
                                this.html = BeforeBlock + value + AfterBlock;
                            } else {
                                this.html = BeforeBlock + lang_key + AfterBlock;
                            }
                            break;
                        }

                        default: {}
                    }

                } else {
                    //its just a variable
                    try {
                        if ("undefined" != typeof this._data[key]) {
                            this.html = this.html.split(this.markerBefore + key + this.markerAfter).join(this._data[key]);
                        } else {
                            if (cleanup) {
                                this.html = this.html.split(this.markerBefore + key + this.markerAfter).join("");
                            }
                        }
                    } catch (e) {
                        ErrorCatcher(e);
                    }
                }

            } catch (e) {
                ErrorCatcher(e)
            }
        }

        return this;
    };

    //apply replacement, clear unused markers and return current resulting text
    async render() {
        await this.parse(true);
        this._aggregateMarkers();
        this._data = {}
        await this.parse(true);
        return this.html;
    };

    //apply replacement and return current resulting text
    async value() {
        await this.parse();
        this._aggregateMarkers();
        return this.html;
    };

};