module.exports = class {
    constructor(viewName = null, req = null, res = null, i18n_lang = null) {
        //add meta information
        this['@viewName'] = viewName;
        //add external data
        this['@req'] = req;
        this['@res'] = res;
        let i18n = function (lang_key) {
            let result = '';
            if (!empty(i18n_lang)) {
                let value = lang_key;
                let langpack = ObjSelector(Application.i18n, i18n_lang, true);
                if (!empty(langpack[lang_key])) value = langpack[lang_key];
                result = value;
            } else {
                result = lang_key;
            }
            return result
        }
        this['@i18n'] = i18n;

        if (viewName) {
            try {
                this['@html'] = ObjSelector(Application.View, viewName);
            } catch (e) {
                throw new Error('View "' + viewName + '" not found')
            }
        }
        // do not show methods in "for ... in ..." structures
        for (let method in this) {
            Object.defineProperty(this, method, {
                enumerable: false
            });
        }
    }

    factory(str) {
        this["@html"] = str;
        return this;
    }
    async render(includeOnce_loaded = {}) {
        //take variables
        let data = {
            req: this['@req'],
            res: this['@res'],
            i18n: this['@i18n'],
        }
        let includeAssign = '';
        for (let i in this) {
            data[i] = this[i];
            includeAssign += `v.${i} = ${i};\n`;
        }

        let functionBody = '';
        functionBody+=`this["@loaded"] = arguments[arguments.length-1];\n`;
        functionBody += `let include = async function(viewName){
            let v = new Application.System.ViewJS(viewName);
            `;
        functionBody += includeAssign;
        functionBody += `this["@html"]+= await v.render(this["@loaded"]);
            }\n`;
        functionBody +=
            `let includeOnce = async function(viewName){
            if(this["@loaded"][viewName]){}else{this["@loaded"][viewName] = true;await include(viewName);}
        };\n`;
        functionBody += this._parse();
        let functionArgs = Object.keys(data);
        let AsyncFunction = (async function () {}).constructor;
        let func = new AsyncFunction(functionArgs, functionBody);
        let result = '';
        try {
            result = await func(...Object.values(data),includeOnce_loaded);
        } catch (e) {
            console.log('View name: ', this['@viewName']);
            console.log('Error: ', e);
            result = `<div><p>${e.toString()}</p><p>View name: <b>${this['@viewName']}</b></p></div>`;
        }
        func = undefined;
        return result;
    }

    _parse() {
        let codeString = '\'"`'; //string brackets
        let codeStringPosition = -1 // selected bracket
        let codeOpen = '<?js'; // code begin marker
        let codeOpenPosition = 0; // cursor position in codeOpen string
        let codeClose = '?>'; //code close marker
        let codeClosePosition = 0; // cursor position in codeClose string
        let html = this["@html"];
        let states = ['html', 'codeOpen', 'codeClose', 'codeBody', 'codeString']
        let currentState = 0;
        let html_length = html.length;

        let code = 'this["@html"] = `';
        let toState = function (stateName) {
            if ('codeBody' === stateName) {
                if (-1 === codeStringPosition) code += '`;\n';
            }
            if ('html' === stateName && 2 === currentState) {
                code += '\n this["@html"]+=`';
            }
            codeOpenPosition = 0;
            codeClosePosition = 0;
            return states.indexOf(stateName)
        };
        for (let currentPosition = 0; currentPosition < html_length; currentPosition++) {
            let chr = html[currentPosition];
            if (-1 === codeStringPosition) {
                switch (currentState) {
                    case 0: {
                        if (chr === codeOpen[codeOpenPosition]) {
                            currentState = toState('codeOpen');
                            codeOpenPosition++;
                        } else code += chr;
                        break;
                    }
                    case 1: {
                        if (chr === codeOpen[codeOpenPosition]) {
                            if (codeOpenPosition === codeOpen.length - 1) {
                                currentState = toState('codeBody');
                            }
                            codeOpenPosition++;
                        } else {
                            code += codeOpen.slice(0, codeOpenPosition) + chr
                            currentState = toState('html');
                        }
                        break
                    }
                    case 2: {
                        if (chr === codeClose[codeClosePosition]) {
                            if (codeClosePosition === codeClose.length - 1) {
                                currentState = toState('html');
                            }
                            codeClosePosition++;
                        } else {
                            code += codeClose.slice(0, codeClosePosition) + chr
                            currentState = toState('codeBody');
                        }
                        break
                    }
                    case 3: {
                        if (chr === codeClose[codeClosePosition]) {
                            currentState = toState('codeClose');
                            codeClosePosition++;
                        } else {
                            code += chr;
                            if (-1 === codeStringPosition && codeString.indexOf(chr) > -1) {
                                codeStringPosition = codeString.indexOf(chr);
                            }
                        };
                        break
                    }
                    case 4: {
                        break
                    }
                }
            } else {
                code += chr;
                if (chr === codeString[codeStringPosition]) {
                    currentState = toState('codeBody');
                    codeStringPosition = -1
                }
            }

        }
        if (0 === currentState) code += '`;\n';
        code += 'return this["@html"];\n';
        return code;
    }

}