module.exports = class IniParser extends Object {
	constructor(string) {
		super();
		function isForbidden(str) {
			let forbidden = ['__proto__'];
			let r = true;
			if (-1 === forbidden.indexOf(str.trim())) r = false;
			return r;
		}
		let target = this;
		let lines = string.split('\n')
		for (let line of lines) {
			line = line.trim();
			if (line[0] === '[' && line[line.length - 1] === ']') {
				line = line.slice(1, -1);
				line = line.split('\\');
				let allowed = true;
				for (let l of line) if (isForbidden(l)) allowed = false;
				if (allowed) {
					line = line.join('.');
					target = ObjSelector(this, line, true)
				}
			} else {
				let keyvalue = line.split('=');
				let key = keyvalue.shift().trim();
				let value = keyvalue.join('=').trim();

				if (key[0] === '"' && key[key.length - 1] === '"') key = key.slice(1, -1);
				if (value[0] === '"' && value[value.length - 1] === '"') value = value.slice(1, -1);

				if (!isForbidden(key)) {
					if (!empty(value)) target[key] = value;
				}
			}
		}
	}
}
