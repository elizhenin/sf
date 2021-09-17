let REG_GROUP = /^\s*\[(.+?)\]\s*$/
let REG_PROP = /^\s*([^#].*?)\s*=\s*(.*?)\s*$/
let forbidden = ['__proto__'];

function parse(string) {
	let object = {}
	let lines = string.split('\n')
	let group
	let match

	for (let i = 0, len = lines.length; len > i; i++) {
		if (match = lines[i].match(REG_GROUP)) {
			if (-1 === forbidden.indexOf(match[1])) {
				object[match[1]] = group = object[match[1]] || {};
			}
		} else if (group && (match = lines[i].match(REG_PROP))) {
			if (-1 === forbidden.indexOf(match[1])) {
				group[match[1]] = match[2];
			}
		}
	}

	return object;
}
module.exports = parse