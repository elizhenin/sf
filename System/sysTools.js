module.exports = function () {
    //add some useful functions from php
    global.htmlspecialchars = function (string) {
        return string.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('\'').join('&apos;').split('"').join('&quot;');
    };
    global.htmlspecialchars_decode = function (string) {
        return string.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>').split('&apos;').join('\'').split('&quot;').join('"');
    };

    global.striptags = function (string) {
        var regex = /(<([^>]+)>)/ig;
        return string.replace(regex, "");
    };

    global.trim = function(string){
        let result = ""
        if(typeof string != "undefined") result = string.toString().trim();
        return result
    }

    global.explode = function(divider,string){
        let result = []
        if(typeof string != "undefined") result = string.toString().split(divider);
        return result
    }

    global.base64_encode = function (str) {

        return new Buffer.from(str).toString('base64');

    };

    global.base64_decode = function (str) {
        return new Buffer.from(str, 'base64').toString();
    };

    global.md5 = function (str, as_bin = false) {

        function M(d) {
            for (var _, m = "0123456789ABCDEF", f = "", r = 0; r < d.length; r++) _ = d.charCodeAt(r), f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _);
            return f
        }

        function X(d) {
            for (var _ = Array(d.length >> 2), m = 0; m < _.length; m++) _[m] = 0;
            for (m = 0; m < 8 * d.length; m += 8) _[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32;
            return _
        }

        function V(d) {
            for (var _ = "", m = 0; m < 32 * d.length; m += 8) _ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255);
            return _
        }

        function Y(d, _) {
            d[_ >> 5] |= 128 << _ % 32, d[14 + (_ + 64 >>> 9 << 4)] = _;
            for (var m = 1732584193, f = -271733879, r = -1732584194, i = 271733878, n = 0; n < d.length; n += 16) {
                var h = m,
                    t = f,
                    g = r,
                    e = i;
                f = md5_ii(f = md5_ii(f = md5_ii(f = md5_ii(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_ff(f = md5_ff(f = md5_ff(f = md5_ff(f, r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 0], 7, -680876936), f, r, d[n + 1], 12, -389564586), m, f, d[n + 2], 17, 606105819), i, m, d[n + 3], 22, -1044525330), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 4], 7, -176418897), f, r, d[n + 5], 12, 1200080426), m, f, d[n + 6], 17, -1473231341), i, m, d[n + 7], 22, -45705983), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 8], 7, 1770035416), f, r, d[n + 9], 12, -1958414417), m, f, d[n + 10], 17, -42063), i, m, d[n + 11], 22, -1990404162), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 12], 7, 1804603682), f, r, d[n + 13], 12, -40341101), m, f, d[n + 14], 17, -1502002290), i, m, d[n + 15], 22, 1236535329), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 1], 5, -165796510), f, r, d[n + 6], 9, -1069501632), m, f, d[n + 11], 14, 643717713), i, m, d[n + 0], 20, -373897302), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 5], 5, -701558691), f, r, d[n + 10], 9, 38016083), m, f, d[n + 15], 14, -660478335), i, m, d[n + 4], 20, -405537848), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 9], 5, 568446438), f, r, d[n + 14], 9, -1019803690), m, f, d[n + 3], 14, -187363961), i, m, d[n + 8], 20, 1163531501), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 13], 5, -1444681467), f, r, d[n + 2], 9, -51403784), m, f, d[n + 7], 14, 1735328473), i, m, d[n + 12], 20, -1926607734), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 5], 4, -378558), f, r, d[n + 8], 11, -2022574463), m, f, d[n + 11], 16, 1839030562), i, m, d[n + 14], 23, -35309556), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 1], 4, -1530992060), f, r, d[n + 4], 11, 1272893353), m, f, d[n + 7], 16, -155497632), i, m, d[n + 10], 23, -1094730640), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 13], 4, 681279174), f, r, d[n + 0], 11, -358537222), m, f, d[n + 3], 16, -722521979), i, m, d[n + 6], 23, 76029189), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 9], 4, -640364487), f, r, d[n + 12], 11, -421815835), m, f, d[n + 15], 16, 530742520), i, m, d[n + 2], 23, -995338651), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 0], 6, -198630844), f, r, d[n + 7], 10, 1126891415), m, f, d[n + 14], 15, -1416354905), i, m, d[n + 5], 21, -57434055), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 12], 6, 1700485571), f, r, d[n + 3], 10, -1894986606), m, f, d[n + 10], 15, -1051523), i, m, d[n + 1], 21, -2054922799), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 8], 6, 1873313359), f, r, d[n + 15], 10, -30611744), m, f, d[n + 6], 15, -1560198380), i, m, d[n + 13], 21, 1309151649), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 4], 6, -145523070), f, r, d[n + 11], 10, -1120210379), m, f, d[n + 2], 15, 718787259), i, m, d[n + 9], 21, -343485551), m = safe_add(m, h), f = safe_add(f, t), r = safe_add(r, g), i = safe_add(i, e)
            }
            return Array(m, f, r, i)
        }

        function md5_cmn(d, _, m, f, r, i) {
            return safe_add(bit_rol(safe_add(safe_add(_, d), safe_add(f, i)), r), m)
        }

        function md5_ff(d, _, m, f, r, i, n) {
            return md5_cmn(_ & m | ~_ & f, d, _, r, i, n)
        }

        function md5_gg(d, _, m, f, r, i, n) {
            return md5_cmn(_ & f | m & ~f, d, _, r, i, n)
        }

        function md5_hh(d, _, m, f, r, i, n) {
            return md5_cmn(_ ^ m ^ f, d, _, r, i, n)
        }

        function md5_ii(d, _, m, f, r, i, n) {
            return md5_cmn(m ^ (_ | ~f), d, _, r, i, n)
        }

        function safe_add(d, _) {
            var m = (65535 & d) + (65535 & _);
            return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m
        }

        function bit_rol(d, _) {
            return d << _ | d >>> 32 - _
        }
        str = str.toString();
        result = M(V(Y(X(str), 8 * str.length)));
        result = result.toLowerCase();
        if (as_bin) {
            let hex2bin = function (hexSource) {
                let hexdec = function (hexString) {
                    hexString = (hexString + '').replace(/[^a-f0-9]/gi, '');
                    return parseInt(hexString, 16);
                };
                var bin = '';
                for (var i = 0; i < hexSource.length; i = i + 2) {
                    bin += String.fromCharCode(hexdec(hexSource.substr(i, 2)));
                }
                return bin;
            }



            result = hex2bin(result);
        }
        return result;

    };

    global.sha1 = async function (str) {
        let result = ''
        let toUTF8Array = function(str) {
            var utf8 = [];
            for (var i = 0; i < str.length; i++) {
                var charcode = str.charCodeAt(i);
                if (charcode < 0x80) utf8.push(charcode);
                else if (charcode < 0x800) {
                    utf8.push(0xc0 | (charcode >> 6),
                        0x80 | (charcode & 0x3f));
                } else if (charcode < 0xd800 || charcode >= 0xe000) {
                    utf8.push(0xe0 | (charcode >> 12),
                        0x80 | ((charcode >> 6) & 0x3f),
                        0x80 | (charcode & 0x3f));
                }
                // surrogate pair
                else {
                    i++;
                    // UTF-16 encodes 0x10000-0x10FFFF by
                    // subtracting 0x10000 and splitting the
                    // 20 bits of 0x0-0xFFFFF into two halves
                    charcode = 0x10000 + (((charcode & 0x3ff) << 10) |
                        (str.charCodeAt(i) & 0x3ff));
                    utf8.push(0xf0 | (charcode >> 18),
                        0x80 | ((charcode >> 12) & 0x3f),
                        0x80 | ((charcode >> 6) & 0x3f),
                        0x80 | (charcode & 0x3f));
                }
            }
            return utf8;
        }

        let byteToUint8Array = function(byteArray) {
            var uint8Array = new Uint8Array(byteArray.length);
            for (var i = 0; i < uint8Array.length; i++) {
                uint8Array[i] = byteArray[i];
            }

            return uint8Array;
        }

        let buf2hex = function(buffer) { // buffer is an ArrayBuffer
            return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
        }
        result = buf2hex(await crypto.subtle.digest('SHA-1', byteToUint8Array(toUTF8Array(str))));
        return result;
    }
    
    global.empty = function (a) { //TODO make to real work
        var exists = false;
        if (typeof (a) == 'undefined') {} else {
            exists = true;
        }
        var result = !exists;
        if (exists) {
            if (a) {
                result = false;
            }
        }
        return result;
    };

    global.usort = function(inputArr, sorter) {
      
        var valArr = []
        var k = ''
        var i = 0
        var sortByReference = false
        var populateArr = {}
      
        if (typeof sorter === 'string') {
          sorter = this[sorter]
        } else if (Object.prototype.toString.call(sorter) === '[object Array]') {
          sorter = this[sorter[0]][sorter[1]]
        }
      
        var iniVal = 'on'
        sortByReference = iniVal === 'on'
        populateArr = sortByReference ? inputArr : populateArr
      
        for (k in inputArr) {
          // Get key and value arrays
          if (inputArr.hasOwnProperty(k)) {
            valArr.push(inputArr[k])
            if (sortByReference) {
              delete inputArr[k]
            }
          }
        }
        try {
          valArr.sort(sorter)
        } catch (e) {
          return false
        }
        for (i = 0; i < valArr.length; i++) {
          // Repopulate the old array
          populateArr[i] = valArr[i]
        }
      
        return sortByReference || populateArr
      }

      
    //add some useful functions from smalltalk
    Boolean.prototype.ifTrue = function (procedure) {
        if (this == true) procedure();
        return this;
    };
    Boolean.prototype.ifFalse = function (procedure) {
        if (this == false) procedure();
        return this;
    };
    Number.prototype.between = function (min) {
        var check = {
            value: this,
            min: min,
            and: function (max) {
                return ((this.value - this.min) * (this.value - max) <= 0);
            }
        };

        return check;
    };
};