const xml2js = use(Application.lib.xml2js);

const asyncXMLparse = (xml) => {
    return new Promise(function (resolve, reject) {
        xml2js.parseString(xml, {
            mergeAttrs: true
        }, (err, result) => {
            if (!empty(err)) reject(err);

            const reduceArrays = (root) => {
                let keys = [];
                if (typeof root == 'string') { } else {
                    if (root instanceof Array) {
                        for (let i = 0; i <= root.length - 1; i++) { keys.push(i) };
                    } else {
                        keys = Object.keys(root);
                    };
                    keys.forEach(k => {
                        if (root[k] instanceof Array) {
                            switch (root[k].length) {
                                case 0: {
                                    root[k] = null;
                                    break;
                                }
                                case 1: {
                                    root[k] = root[k][0];
                                }
                                default: {
                                    reduceArrays(root[k])
                                }
                            }
                        } else {
                            reduceArrays(root[k])
                        }

                    });
                };

            };
            reduceArrays(result);
            resolve(result)
        })
    })
}


module.exports = class XmlParser extends BaseObject {

    async parse(string) {
        return await asyncXMLparse(string)
    }
}
