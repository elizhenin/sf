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
        Object.defineProperty(this, "@html", {
            enumerable: false
        });
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
        let functionArgs = Object.keys(data);
        let functionBody = '';
        functionBody += `(${functionArgs.join(', ')}, includeOnce_loaded)=>{\n`;
        functionBody += `return new Promise(async function(resolve,reject){\n`;
        functionBody += `let _this = {}\n`;
        functionBody += `const print=function(s,c=_this){c['@html']+=s}\n`;
        functionBody += `const echo=function(){for(let i in arguments) print(arguments[i])}\n`;
        functionBody += `_this["@loaded"] = arguments[arguments.length-1]; Object.defineProperty(_this, "@loaded", {enumerable: false});\n`;
        functionBody += `const include = async function(viewName){
            let v = new Application.System.ViewJS(viewName);
            `;
        functionBody += includeAssign;
        functionBody += `_this["@html"]+= await v.render(_this["@loaded"]);
            }\n`;
        functionBody +=
            `const includeOnce = async function(viewName){
            if(_this["@loaded"][viewName]){}else{_this["@loaded"][viewName] = true;await include(viewName);}
        };\n`;
        functionBody += this._parse()+`\n`;
        functionBody += `})\n}\n`;
      
        let AsyncFunction = (async function () {}).constructor;
        let result = '';
        try {
            let func = eval(functionBody);
            result = await func(...Object.values(data), includeOnce_loaded);
        } catch (e) {
            console.log('View name: ', this['@viewName']);
            console.log(`${e.name}: ${e.message} \n${e.stack.split('\n')[1]}`);
            let trace_body = functionBody.split("\n");
            console.log('Function body: ');
            for (let i in trace_body) {
                console.log(i, trace_body[i])
            }
            result = `<div><p>${e.toString()}</p><p>View name: <b>${this['@viewName']}</b></p></div>`;
        }
        return result;
    }

    _parse() {
        const codeString = '\'"`'; //string brackets
        let codeStringPosition = -1 // selected bracket
        const codeOpen = '<?js'; // code begin marker
        let codeOpenPosition = 0; // cursor position in codeOpen string
        const codeClose = '?>'; //code close marker
        let codeClosePosition = 0; // cursor position in codeClose string
        const html = this["@html"];

        const htmlState = 0,
            codeOpenState = 1,
            codeCloseState = 2,
            codeBodyState = 3,
            codeStringState = 4;

        let currentState = htmlState;

        const html_length = html.length;

        let code = '_this["@html"] = `';
        let toState = function (State) {
            if (codeBodyState === State) {
                if (-1 === codeStringPosition) code += '`;\n';
            }
            if (htmlState === State && codeCloseState === currentState) {
                code += '\n _this["@html"]+=`';
            }
            codeOpenPosition = 0;
            codeClosePosition = 0;
            return State;
        };
        for (let currentPosition = 0; currentPosition < html_length; currentPosition++) {
            let chr = html[currentPosition];
            if (-1 === codeStringPosition) {
                switch (currentState) {
                    case htmlState: {
                        if (chr === codeOpen[codeOpenPosition]) {
                            currentState = toState(codeOpenState);
                            codeOpenPosition++;
                        } else {
                            if ("`" === chr) code += "\\";
                            code += chr;
                        };
                        break;
                    }
                    case codeOpenState: {
                        if (chr === codeOpen[codeOpenPosition]) {
                            if (codeOpenPosition === codeOpen.length - 1) {
                                currentState = toState(codeBodyState);
                            }
                            codeOpenPosition++;
                        } else {
                            code += codeOpen.slice(0, codeOpenPosition) + chr
                            currentState = toState(htmlState);
                        }
                        break
                    }
                    case codeCloseState: {
                        if (chr === codeClose[codeClosePosition]) {
                            if (codeClosePosition === codeClose.length - 1) {
                                currentState = toState(htmlState);
                            }
                            codeClosePosition++;
                        } else {
                            code += codeClose.slice(0, codeClosePosition) + chr
                            currentState = toState(codeBodyState);
                        }
                        break
                    }
                    case codeBodyState: {
                        if (chr === codeClose[codeClosePosition]) {
                            currentState = toState(codeCloseState);
                            codeClosePosition++;
                        } else {
                            code += chr;
                            if (-1 === codeStringPosition && codeString.indexOf(chr) > -1) {
                                codeStringPosition = codeString.indexOf(chr);
                            }
                        };
                        break
                    }
                    case codeStringState: {
                        break
                    }
                }
            } else {
                code += chr;
                if (chr === codeString[codeStringPosition]) {
                    currentState = toState(codeBodyState);
                    codeStringPosition = -1
                }
            }

        }
        if (0 === currentState) code += '`;\n';
        code += 'resolve(_this["@html"]);\n';
        return code;
    }

}