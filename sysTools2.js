class SysTools {
    constructor() {
        let Context = null;
        if (typeof global != "undefined") Context = global;
        if (typeof window != "undefined") Context = window;
        if (Context !== null) {
            //enable sysTools
            Object.assign(Context, this)
        }
        if (Context !== null) {
            //enable CryptoJS

            // CryptoJS v3.1.2
            // code.google.com/p/crypto-js
            // (c) 2009-2013 by Jeff Mott. All rights reserved.
            // code.google.com/p/crypto-js/wiki/License

            Context.CryptoJS = function (u, p) {
                var d = {},
                    l = d.lib = {},
                    s = function () { },
                    t = l.Base = {
                        extend: function (a) {
                            s.prototype = this;
                            var c = new s;
                            a && c.mixIn(a);
                            c.hasOwnProperty("init") || (c.init = function () {
                                c.$super.init.apply(this, arguments)
                            });
                            c.init.prototype = c;
                            c.$super = this;
                            return c
                        },
                        create: function () {
                            var a = this.extend();
                            a.init.apply(a, arguments);
                            return a
                        },
                        init: function () { },
                        mixIn: function (a) {
                            for (var c in a) a.hasOwnProperty(c) && (this[c] = a[c]);
                            a.hasOwnProperty("toString") && (this.toString = a.toString)
                        },
                        clone: function () {
                            return this.init.prototype.extend(this)
                        }
                    },
                    r = l.WordArray = t.extend({
                        init: function (a, c) {
                            a = this.words = a || [];
                            this.sigBytes = c != p ? c : 4 * a.length
                        },
                        toString: function (a) {
                            return (a || v).stringify(this)
                        },
                        concat: function (a) {
                            var c = this.words,
                                e = a.words,
                                j = this.sigBytes;
                            a = a.sigBytes;
                            this.clamp();
                            if (j % 4)
                                for (var k = 0; k < a; k++) c[j + k >>> 2] |= (e[k >>> 2] >>> 24 - 8 * (k % 4) & 255) << 24 - 8 * ((j + k) % 4);
                            else if (65535 < e.length)
                                for (let k = 0; k < a; k += 4) c[j + k >>> 2] = e[k >>> 2];
                            else c.push.apply(c, e);
                            this.sigBytes += a;
                            return this
                        },
                        clamp: function () {
                            var a = this.words,
                                c = this.sigBytes;
                            a[c >>> 2] &= 4294967295 <<
                                32 - 8 * (c % 4);
                            a.length = u.ceil(c / 4)
                        },
                        clone: function () {
                            var a = t.clone.call(this);
                            a.words = this.words.slice(0);
                            return a
                        },
                        random: function (a) {
                            for (var c = [], e = 0; e < a; e += 4) c.push(4294967296 * u.random() | 0);
                            return new r.init(c, a)
                        }
                    }),
                    w = d.enc = {},
                    v = w.Hex = {
                        stringify: function (a) {
                            var c = a.words;
                            a = a.sigBytes;
                            for (var e = [], j = 0; j < a; j++) {
                                var k = c[j >>> 2] >>> 24 - 8 * (j % 4) & 255;
                                e.push((k >>> 4).toString(16));
                                e.push((k & 15).toString(16))
                            }
                            return e.join("")
                        },
                        parse: function (a) {
                            for (var c = a.length, e = [], j = 0; j < c; j += 2) e[j >>> 3] |= parseInt(a.substr(j,
                                2), 16) << 24 - 4 * (j % 8);
                            return new r.init(e, c / 2)
                        }
                    },
                    b = w.Latin1 = {
                        stringify: function (a) {
                            var c = a.words;
                            a = a.sigBytes;
                            for (var e = [], j = 0; j < a; j++) e.push(String.fromCharCode(c[j >>> 2] >>> 24 - 8 * (j % 4) & 255));
                            return e.join("")
                        },
                        parse: function (a) {
                            for (var c = a.length, e = [], j = 0; j < c; j++) e[j >>> 2] |= (a.charCodeAt(j) & 255) << 24 - 8 * (j % 4);
                            return new r.init(e, c)
                        }
                    },
                    x = w.Utf8 = {
                        stringify: function (a) {
                            try {
                                return decodeURIComponent(escape(b.stringify(a)))
                            } catch (c) {
                                throw Error("Malformed UTF-8 data");
                            }
                        },
                        parse: function (a) {
                            return b.parse(unescape(encodeURIComponent(a)))
                        }
                    },
                    q = l.BufferedBlockAlgorithm = t.extend({
                        reset: function () {
                            this._data = new r.init;
                            this._nDataBytes = 0
                        },
                        _append: function (a) {
                            "string" == typeof a && (a = x.parse(a));
                            this._data.concat(a);
                            this._nDataBytes += a.sigBytes
                        },
                        _process: function (a) {
                            var c = this._data,
                                e = c.words,
                                j = c.sigBytes,
                                k = this.blockSize,
                                b = j / (4 * k),
                                b = a ? u.ceil(b) : u.max((b | 0) - this._minBufferSize, 0);
                            a = b * k;
                            j = u.min(4 * a, j);
                            if (a) {
                                for (var q = 0; q < a; q += k) this._doProcessBlock(e, q);
                                q = e.splice(0, a);
                                c.sigBytes -= j
                            }
                            return new r.init(q, j)
                        },
                        clone: function () {
                            var a = t.clone.call(this);
                            a._data = this._data.clone();
                            return a
                        },
                        _minBufferSize: 0
                    });
                l.Hasher = q.extend({
                    cfg: t.extend(),
                    init: function (a) {
                        this.cfg = this.cfg.extend(a);
                        this.reset()
                    },
                    reset: function () {
                        q.reset.call(this);
                        this._doReset()
                    },
                    update: function (a) {
                        this._append(a);
                        this._process();
                        return this
                    },
                    finalize: function (a) {
                        a && this._append(a);
                        return this._doFinalize()
                    },
                    blockSize: 16,
                    _createHelper: function (a) {
                        return function (b, e) {
                            return (new a.init(e)).finalize(b)
                        }
                    },
                    _createHmacHelper: function (a) {
                        return function (b, e) {
                            return (new n.HMAC.init(a,
                                e)).finalize(b)
                        }
                    }
                });
                var n = d.algo = {};
                return d
            }(Math);
            (function () {
                var u = CryptoJS,
                    p = u.lib.WordArray;
                u.enc.Base64 = {
                    stringify: function (d) {
                        var l = d.words,
                            p = d.sigBytes,
                            t = this._map;
                        d.clamp();
                        d = [];
                        for (var r = 0; r < p; r += 3)
                            for (var w = (l[r >>> 2] >>> 24 - 8 * (r % 4) & 255) << 16 | (l[r + 1 >>> 2] >>> 24 - 8 * ((r + 1) % 4) & 255) << 8 | l[r + 2 >>> 2] >>> 24 - 8 * ((r + 2) % 4) & 255, v = 0; 4 > v && r + 0.75 * v < p; v++) d.push(t.charAt(w >>> 6 * (3 - v) & 63));
                        if (l = t.charAt(64))
                            for (; d.length % 4;) d.push(l);
                        return d.join("")
                    },
                    parse: function (d) {
                        var l = d.length,
                            s = this._map,
                            t = s.charAt(64);
                        t && (t = d.indexOf(t), -1 != t && (l = t));
                        for (var t = [], r = 0, w = 0; w <
                            l; w++)
                            if (w % 4) {
                                var v = s.indexOf(d.charAt(w - 1)) << 2 * (w % 4),
                                    b = s.indexOf(d.charAt(w)) >>> 6 - 2 * (w % 4);
                                t[r >>> 2] |= (v | b) << 24 - 8 * (r % 4);
                                r++
                            } return p.create(t, r)
                    },
                    _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
                }
            })();
            (function (u) {
                function p(b, n, a, c, e, j, k) {
                    b = b + (n & a | ~n & c) + e + k;
                    return (b << j | b >>> 32 - j) + n
                }

                function d(b, n, a, c, e, j, k) {
                    b = b + (n & c | a & ~c) + e + k;
                    return (b << j | b >>> 32 - j) + n
                }

                function l(b, n, a, c, e, j, k) {
                    b = b + (n ^ a ^ c) + e + k;
                    return (b << j | b >>> 32 - j) + n
                }

                function s(b, n, a, c, e, j, k) {
                    b = b + (a ^ (n | ~c)) + e + k;
                    return (b << j | b >>> 32 - j) + n
                }
                for (var t = CryptoJS, r = t.lib, w = r.WordArray, v = r.Hasher, r = t.algo, b = [], x = 0; 64 > x; x++) b[x] = 4294967296 * u.abs(u.sin(x + 1)) | 0;
                r = r.MD5 = v.extend({
                    _doReset: function () {
                        this._hash = new w.init([1732584193, 4023233417, 2562383102, 271733878])
                    },
                    _doProcessBlock: function (q, n) {
                        for (var a = 0; 16 > a; a++) {
                            var c = n + a,
                                e = q[c];
                            q[c] = (e << 8 | e >>> 24) & 16711935 | (e << 24 | e >>> 8) & 4278255360
                        }
                        var a = this._hash.words,
                            c = q[n + 0],
                            e = q[n + 1],
                            j = q[n + 2],
                            k = q[n + 3],
                            z = q[n + 4],
                            r = q[n + 5],
                            t = q[n + 6],
                            w = q[n + 7],
                            v = q[n + 8],
                            A = q[n + 9],
                            B = q[n + 10],
                            C = q[n + 11],
                            u = q[n + 12],
                            D = q[n + 13],
                            E = q[n + 14],
                            x = q[n + 15],
                            f = a[0],
                            m = a[1],
                            g = a[2],
                            h = a[3],
                            f = p(f, m, g, h, c, 7, b[0]),
                            h = p(h, f, m, g, e, 12, b[1]),
                            g = p(g, h, f, m, j, 17, b[2]),
                            m = p(m, g, h, f, k, 22, b[3]),
                            f = p(f, m, g, h, z, 7, b[4]),
                            h = p(h, f, m, g, r, 12, b[5]),
                            g = p(g, h, f, m, t, 17, b[6]),
                            m = p(m, g, h, f, w, 22, b[7]),
                            f = p(f, m, g, h, v, 7, b[8]),
                            h = p(h, f, m, g, A, 12, b[9]),
                            g = p(g, h, f, m, B, 17, b[10]),
                            m = p(m, g, h, f, C, 22, b[11]),
                            f = p(f, m, g, h, u, 7, b[12]),
                            h = p(h, f, m, g, D, 12, b[13]),
                            g = p(g, h, f, m, E, 17, b[14]),
                            m = p(m, g, h, f, x, 22, b[15]),
                            f = d(f, m, g, h, e, 5, b[16]),
                            h = d(h, f, m, g, t, 9, b[17]),
                            g = d(g, h, f, m, C, 14, b[18]),
                            m = d(m, g, h, f, c, 20, b[19]),
                            f = d(f, m, g, h, r, 5, b[20]),
                            h = d(h, f, m, g, B, 9, b[21]),
                            g = d(g, h, f, m, x, 14, b[22]),
                            m = d(m, g, h, f, z, 20, b[23]),
                            f = d(f, m, g, h, A, 5, b[24]),
                            h = d(h, f, m, g, E, 9, b[25]),
                            g = d(g, h, f, m, k, 14, b[26]),
                            m = d(m, g, h, f, v, 20, b[27]),
                            f = d(f, m, g, h, D, 5, b[28]),
                            h = d(h, f,
                                m, g, j, 9, b[29]),
                            g = d(g, h, f, m, w, 14, b[30]),
                            m = d(m, g, h, f, u, 20, b[31]),
                            f = l(f, m, g, h, r, 4, b[32]),
                            h = l(h, f, m, g, v, 11, b[33]),
                            g = l(g, h, f, m, C, 16, b[34]),
                            m = l(m, g, h, f, E, 23, b[35]),
                            f = l(f, m, g, h, e, 4, b[36]),
                            h = l(h, f, m, g, z, 11, b[37]),
                            g = l(g, h, f, m, w, 16, b[38]),
                            m = l(m, g, h, f, B, 23, b[39]),
                            f = l(f, m, g, h, D, 4, b[40]),
                            h = l(h, f, m, g, c, 11, b[41]),
                            g = l(g, h, f, m, k, 16, b[42]),
                            m = l(m, g, h, f, t, 23, b[43]),
                            f = l(f, m, g, h, A, 4, b[44]),
                            h = l(h, f, m, g, u, 11, b[45]),
                            g = l(g, h, f, m, x, 16, b[46]),
                            m = l(m, g, h, f, j, 23, b[47]),
                            f = s(f, m, g, h, c, 6, b[48]),
                            h = s(h, f, m, g, w, 10, b[49]),
                            g = s(g, h, f, m,
                                E, 15, b[50]),
                            m = s(m, g, h, f, r, 21, b[51]),
                            f = s(f, m, g, h, u, 6, b[52]),
                            h = s(h, f, m, g, k, 10, b[53]),
                            g = s(g, h, f, m, B, 15, b[54]),
                            m = s(m, g, h, f, e, 21, b[55]),
                            f = s(f, m, g, h, v, 6, b[56]),
                            h = s(h, f, m, g, x, 10, b[57]),
                            g = s(g, h, f, m, t, 15, b[58]),
                            m = s(m, g, h, f, D, 21, b[59]),
                            f = s(f, m, g, h, z, 6, b[60]),
                            h = s(h, f, m, g, C, 10, b[61]),
                            g = s(g, h, f, m, j, 15, b[62]),
                            m = s(m, g, h, f, A, 21, b[63]);
                        a[0] = a[0] + f | 0;
                        a[1] = a[1] + m | 0;
                        a[2] = a[2] + g | 0;
                        a[3] = a[3] + h | 0
                    },
                    _doFinalize: function () {
                        var b = this._data,
                            n = b.words,
                            a = 8 * this._nDataBytes,
                            c = 8 * b.sigBytes;
                        n[c >>> 5] |= 128 << 24 - c % 32;
                        var e = u.floor(a /
                            4294967296);
                        n[(c + 64 >>> 9 << 4) + 15] = (e << 8 | e >>> 24) & 16711935 | (e << 24 | e >>> 8) & 4278255360;
                        n[(c + 64 >>> 9 << 4) + 14] = (a << 8 | a >>> 24) & 16711935 | (a << 24 | a >>> 8) & 4278255360;
                        b.sigBytes = 4 * (n.length + 1);
                        this._process();
                        b = this._hash;
                        n = b.words;
                        for (let a = 0; 4 > a; a++) c = n[a], n[a] = (c << 8 | c >>> 24) & 16711935 | (c << 24 | c >>> 8) & 4278255360;
                        return b
                    },
                    clone: function () {
                        var b = v.clone.call(this);
                        b._hash = this._hash.clone();
                        return b
                    }
                });
                t.MD5 = v._createHelper(r);
                t.HmacMD5 = v._createHmacHelper(r)
            })(Math);
            (function () {
                var u = CryptoJS,
                    p = u.lib,
                    d = p.Base,
                    l = p.WordArray,
                    p = u.algo,
                    s = p.EvpKDF = d.extend({
                        cfg: d.extend({
                            keySize: 4,
                            hasher: p.MD5,
                            iterations: 1
                        }),
                        init: function (d) {
                            this.cfg = this.cfg.extend(d)
                        },
                        compute: function (d, r) {
                            for (var p = this.cfg, s = p.hasher.create(), b = l.create(), u = b.words, q = p.keySize, p = p.iterations; u.length < q;) {
                                n && s.update(n);
                                var n = s.update(d).finalize(r);
                                s.reset();
                                for (var a = 1; a < p; a++) n = s.finalize(n), s.reset();
                                b.concat(n)
                            }
                            b.sigBytes = 4 * q;
                            return b
                        }
                    });
                u.EvpKDF = function (d, l, p) {
                    return s.create(p).compute(d,
                        l)
                }
            })();
            CryptoJS.lib.Cipher || function (u) {
                var p = CryptoJS,
                    d = p.lib,
                    l = d.Base,
                    s = d.WordArray,
                    t = d.BufferedBlockAlgorithm,
                    r = p.enc.Base64,
                    w = p.algo.EvpKDF,
                    v = d.Cipher = t.extend({
                        cfg: l.extend(),
                        createEncryptor: function (e, a) {
                            return this.create(this._ENC_XFORM_MODE, e, a)
                        },
                        createDecryptor: function (e, a) {
                            return this.create(this._DEC_XFORM_MODE, e, a)
                        },
                        init: function (e, a, b) {
                            this.cfg = this.cfg.extend(b);
                            this._xformMode = e;
                            this._key = a;
                            this.reset()
                        },
                        reset: function () {
                            t.reset.call(this);
                            this._doReset()
                        },
                        process: function (e) {
                            this._append(e);
                            return this._process()
                        },
                        finalize: function (e) {
                            e && this._append(e);
                            return this._doFinalize()
                        },
                        keySize: 4,
                        ivSize: 4,
                        _ENC_XFORM_MODE: 1,
                        _DEC_XFORM_MODE: 2,
                        _createHelper: function (e) {
                            return {
                                encrypt: function (b, k, d) {
                                    return ("string" == typeof k ? c : a).encrypt(e, b, k, d)
                                },
                                decrypt: function (b, k, d) {
                                    return ("string" == typeof k ? c : a).decrypt(e, b, k, d)
                                }
                            }
                        }
                    });
                d.StreamCipher = v.extend({
                    _doFinalize: function () {
                        return this._process(!0)
                    },
                    blockSize: 1
                });
                var b = p.mode = {},
                    x = function (e, a, b) {
                        var c = this._iv;
                        c ? this._iv = u : c = this._prevBlock;
                        for (var d = 0; d < b; d++) e[a + d] ^=
                            c[d]
                    },
                    q = (d.BlockCipherMode = l.extend({
                        createEncryptor: function (e, a) {
                            return this.Encryptor.create(e, a)
                        },
                        createDecryptor: function (e, a) {
                            return this.Decryptor.create(e, a)
                        },
                        init: function (e, a) {
                            this._cipher = e;
                            this._iv = a
                        }
                    })).extend();
                q.Encryptor = q.extend({
                    processBlock: function (e, a) {
                        var b = this._cipher,
                            c = b.blockSize;
                        x.call(this, e, a, c);
                        b.encryptBlock(e, a);
                        this._prevBlock = e.slice(a, a + c)
                    }
                });
                q.Decryptor = q.extend({
                    processBlock: function (e, a) {
                        var b = this._cipher,
                            c = b.blockSize,
                            d = e.slice(a, a + c);
                        b.decryptBlock(e, a);
                        x.call(this,
                            e, a, c);
                        this._prevBlock = d
                    }
                });
                b = b.CBC = q;
                q = (p.pad = {}).Pkcs7 = {
                    pad: function (a, b) {
                        for (var c = 4 * b, c = c - a.sigBytes % c, d = c << 24 | c << 16 | c << 8 | c, l = [], n = 0; n < c; n += 4) l.push(d);
                        c = s.create(l, c);
                        a.concat(c)
                    },
                    unpad: function (a) {
                        a.sigBytes -= a.words[a.sigBytes - 1 >>> 2] & 255
                    }
                };
                d.BlockCipher = v.extend({
                    cfg: v.cfg.extend({
                        mode: b,
                        padding: q
                    }),
                    reset: function () {
                        v.reset.call(this);
                        var a = this.cfg,
                            b = a.iv,
                            a = a.mode;
                        if (this._xformMode == this._ENC_XFORM_MODE) var c = a.createEncryptor;
                        else c = a.createDecryptor, this._minBufferSize = 1;
                        this._mode = c.call(a,
                            this, b && b.words)
                    },
                    _doProcessBlock: function (a, b) {
                        this._mode.processBlock(a, b)
                    },
                    _doFinalize: function () {
                        var a = this.cfg.padding;
                        if (this._xformMode == this._ENC_XFORM_MODE) {
                            a.pad(this._data, this.blockSize);
                            var b = this._process(!0)
                        } else b = this._process(!0), a.unpad(b);
                        return b
                    },
                    blockSize: 4
                });
                var n = d.CipherParams = l.extend({
                    init: function (a) {
                        this.mixIn(a)
                    },
                    toString: function (a) {
                        return (a || this.formatter).stringify(this)
                    }
                }),
                    b = (p.format = {}).OpenSSL = {
                        stringify: function (a) {
                            var b = a.ciphertext;
                            a = a.salt;
                            return (a ? s.create([1398893684,
                                1701076831
                            ]).concat(a).concat(b) : b).toString(r)
                        },
                        parse: function (a) {
                            a = r.parse(a);
                            var b = a.words;
                            if (1398893684 == b[0] && 1701076831 == b[1]) {
                                var c = s.create(b.slice(2, 4));
                                b.splice(0, 4);
                                a.sigBytes -= 16
                            }
                            return n.create({
                                ciphertext: a,
                                salt: c
                            })
                        }
                    },
                    a = d.SerializableCipher = l.extend({
                        cfg: l.extend({
                            format: b
                        }),
                        encrypt: function (a, b, c, d) {
                            d = this.cfg.extend(d);
                            var l = a.createEncryptor(c, d);
                            b = l.finalize(b);
                            l = l.cfg;
                            return n.create({
                                ciphertext: b,
                                key: c,
                                iv: l.iv,
                                algorithm: a,
                                mode: l.mode,
                                padding: l.padding,
                                blockSize: a.blockSize,
                                formatter: d.format
                            })
                        },
                        decrypt: function (a, b, c, d) {
                            d = this.cfg.extend(d);
                            b = this._parse(b, d.format);
                            return a.createDecryptor(c, d).finalize(b.ciphertext)
                        },
                        _parse: function (a, b) {
                            return "string" == typeof a ? b.parse(a, this) : a
                        }
                    }),
                    p = (p.kdf = {}).OpenSSL = {
                        execute: function (a, b, c, d) {
                            d || (d = s.random(8));
                            a = w.create({
                                keySize: b + c
                            }).compute(a, d);
                            c = s.create(a.words.slice(b), 4 * c);
                            a.sigBytes = 4 * b;
                            return n.create({
                                key: a,
                                iv: c,
                                salt: d
                            })
                        }
                    },
                    c = d.PasswordBasedCipher = a.extend({
                        cfg: a.cfg.extend({
                            kdf: p
                        }),
                        encrypt: function (b, c, d, l) {
                            l = this.cfg.extend(l);
                            d = l.kdf.execute(d,
                                b.keySize, b.ivSize);
                            l.iv = d.iv;
                            b = a.encrypt.call(this, b, c, d.key, l);
                            b.mixIn(d);
                            return b
                        },
                        decrypt: function (b, c, d, l) {
                            l = this.cfg.extend(l);
                            c = this._parse(c, l.format);
                            d = l.kdf.execute(d, b.keySize, b.ivSize, c.salt);
                            l.iv = d.iv;
                            return a.decrypt.call(this, b, c, d.key, l)
                        }
                    })
            }();
            (function () {
                for (var u = CryptoJS, p = u.lib.BlockCipher, d = u.algo, l = [], s = [], t = [], r = [], w = [], v = [], b = [], x = [], q = [], n = [], a = [], c = 0; 256 > c; c++) a[c] = 128 > c ? c << 1 : c << 1 ^ 283;
                for (var e = 0, j = 0, c = 0; 256 > c; c++) {
                    var k = j ^ j << 1 ^ j << 2 ^ j << 3 ^ j << 4,
                        k = k >>> 8 ^ k & 255 ^ 99;
                    l[e] = k;
                    s[k] = e;
                    var z = a[e],
                        F = a[z],
                        G = a[F],
                        y = 257 * a[k] ^ 16843008 * k;
                    t[e] = y << 24 | y >>> 8;
                    r[e] = y << 16 | y >>> 16;
                    w[e] = y << 8 | y >>> 24;
                    v[e] = y;
                    y = 16843009 * G ^ 65537 * F ^ 257 * z ^ 16843008 * e;
                    b[k] = y << 24 | y >>> 8;
                    x[k] = y << 16 | y >>> 16;
                    q[k] = y << 8 | y >>> 24;
                    n[k] = y;
                    e ? (e = z ^ a[a[a[G ^ z]]], j ^= a[a[j]]) : e = j = 1
                }
                var H = [0, 1, 2, 4, 8,
                    16, 32, 64, 128, 27, 54
                ],
                    d = d.AES = p.extend({
                        _doReset: function () {
                            for (var a = this._key, c = a.words, d = a.sigBytes / 4, a = 4 * ((this._nRounds = d + 6) + 1), e = this._keySchedule = [], j = 0; j < a; j++)
                                if (j < d) e[j] = c[j];
                                else {
                                    var k = e[j - 1];
                                    j % d ? 6 < d && 4 == j % d && (k = l[k >>> 24] << 24 | l[k >>> 16 & 255] << 16 | l[k >>> 8 & 255] << 8 | l[k & 255]) : (k = k << 8 | k >>> 24, k = l[k >>> 24] << 24 | l[k >>> 16 & 255] << 16 | l[k >>> 8 & 255] << 8 | l[k & 255], k ^= H[j / d | 0] << 24);
                                    e[j] = e[j - d] ^ k
                                } c = this._invKeySchedule = [];
                            for (let d = 0; d < a; d++) j = a - d, k = d % 4 ? e[j] : e[j - 4], c[d] = 4 > d || 4 >= j ? k : b[l[k >>> 24]] ^ x[l[k >>> 16 & 255]] ^ q[l[k >>>
                                8 & 255]] ^ n[l[k & 255]]
                        },
                        encryptBlock: function (a, b) {
                            this._doCryptBlock(a, b, this._keySchedule, t, r, w, v, l)
                        },
                        decryptBlock: function (a, c) {
                            var d = a[c + 1];
                            a[c + 1] = a[c + 3];
                            a[c + 3] = d;
                            this._doCryptBlock(a, c, this._invKeySchedule, b, x, q, n, s);
                            d = a[c + 1];
                            a[c + 1] = a[c + 3];
                            a[c + 3] = d
                        },
                        _doCryptBlock: function (a, b, c, d, e, j, l, f) {
                            for (var m = this._nRounds, g = a[b] ^ c[0], h = a[b + 1] ^ c[1], k = a[b + 2] ^ c[2], n = a[b + 3] ^ c[3], p = 4, r = 1; r < m; r++) var q = d[g >>> 24] ^ e[h >>> 16 & 255] ^ j[k >>> 8 & 255] ^ l[n & 255] ^ c[p++],
                                s = d[h >>> 24] ^ e[k >>> 16 & 255] ^ j[n >>> 8 & 255] ^ l[g & 255] ^ c[p++],
                                t =
                                    d[k >>> 24] ^ e[n >>> 16 & 255] ^ j[g >>> 8 & 255] ^ l[h & 255] ^ c[p++],
                                n = d[n >>> 24] ^ e[g >>> 16 & 255] ^ j[h >>> 8 & 255] ^ l[k & 255] ^ c[p++],
                                g = q,
                                h = s,
                                k = t;
                            q = (f[g >>> 24] << 24 | f[h >>> 16 & 255] << 16 | f[k >>> 8 & 255] << 8 | f[n & 255]) ^ c[p++];
                            s = (f[h >>> 24] << 24 | f[k >>> 16 & 255] << 16 | f[n >>> 8 & 255] << 8 | f[g & 255]) ^ c[p++];
                            t = (f[k >>> 24] << 24 | f[n >>> 16 & 255] << 16 | f[g >>> 8 & 255] << 8 | f[h & 255]) ^ c[p++];
                            n = (f[n >>> 24] << 24 | f[g >>> 16 & 255] << 16 | f[h >>> 8 & 255] << 8 | f[k & 255]) ^ c[p++];
                            a[b] = q;
                            a[b + 1] = s;
                            a[b + 2] = t;
                            a[b + 3] = n
                        },
                        keySize: 8
                    });
                u.AES = p._createHelper(d)
            })();
        }
    }

    //classes
    BaseObject = class BaseObject {
        className() {
            return empty(this.constructor.name) ? null : this.constructor.name;
        }
    }

    //functions

    Now = () => {
        return new Date().getTime()
    }

    asyncSleep = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    GUID = () => {
        //not as in RFC, but unique enough and correct in validators. JS is 53-bits integer timestamp and no MICROseconds available
        let guid, yChar, xChar, timestamp;
        yChar = ['8', '9', 'a', 'b'];
        xChar = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

        // in timestamp and guid arrays ignore the 0 index and work from 1
        // ommit the 0 index item at the end
        timestamp = ' 0' + Now().toString(16);
        // GUID mask is hhhhhhhh-hhhh-4xxx-yxxx-xxxxxxxxxxxx
        // h: positions of timestamp hex digits
        // x: positions of random hex digits
        // y: positions of allowed hex digits

        guid = new Array(37);
        guid[0] = '';
        guid[9] = '-';
        guid[14] = '-';
        guid[15] = '4';
        guid[19] = '-';
        guid[24] = '-';
        // replace Y with allowed digit
        guid[20] = array_rand(yChar);
        // replace X positions with randoms
        for (let i = 16; i <= 18; i++) {
            guid[i] = array_rand(xChar)
        };

        for (let i = 21; i <= 23; i++) {
            guid[i] = array_rand(xChar)
        };
        for (let i = 25; i <= 36; i++) {
            guid[i] = array_rand(xChar)
        };
        // replace H positions with timestamp hex digits
        for (let i = 1; i <= 8; i++) { guid[i] = timestamp[i] };
        for (let i = 10; i <= 13; i++) { guid[i] = timestamp[i - 1] };
        guid = guid.join('');
        return guid
    }

    ObjSelector = (SourceObj, ClassPath, createIfUndefined = false) => {
        //recusive get property from object by path string "className1.className2.className3.[etc N times].." or array ['className1','className2',...] in same way
        let ClassPathArray = ClassPath;
        if (!Array.isArray(ClassPathArray)) ClassPathArray = ClassPath.toString().split('.');
        let ObjSelected = SourceObj;
        for (let classPath of ClassPathArray) {
            const nextVal = ObjSelected[classPath];
            //TODO here is hotfix for exception case where trying to get property of null.
            //But now it return null instead of undefined while null is any step of path, not only while last.
            if (null === nextVal || "undefined" === typeof nextVal) {
                if (createIfUndefined) ObjSelected[classPath] = {};
                else {
                    ObjSelected = nextVal;
                    break;
                }
            }

            ObjSelected = ObjSelected[classPath];
        }
        return ObjSelected;
    }

    asType = (_in) => {
        try {
            if (_in.toLowerCase() === 'true') return true;
            if (_in.toLowerCase() === 'false') return false;
            if (_in.toLowerCase() === 'null') return null;
            if (_in.toLowerCase() === 'nan') return NaN;
            if (_in.toLowerCase() === 'undefined') return undefined;
            if (_in == parseFloat(_in)) return parseFloat(_in);
        } catch (e) { }
        return _in;
    }

    toRuDateString = (d) => {
        var date = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
        return date;
    }

    toRuTimeString = (d) => {
        var time = d.getHours() + ":" + ("0" + d.getMinutes(2)).slice(-2) + ":" + ("0" + d.getSeconds(2)).slice(-2);
        return time;
    }

    toRuDateTimeString = (d) => {
        var date = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
        var time = d.getHours() + ":" + ("0" + d.getMinutes(2)).slice(-2);
        return time + ' ' + date;
    }

    toLocaleISOString = (d) => {
        var date = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}T${("0" + d.getHours()).slice(-2)}:${("0" + d.getMinutes(2)).slice(-2)}:${("0" + d.getSeconds(2)).slice(-2)}`;
        return date
    }

    struct2flat = (S) => {
        let flat = {};

        function resolver(obj, path = "", root = false) {
            if (Array.isArray(obj)) {

                flat[path + '.length'] = obj.length;
                for (let i = 0; i < obj.length; i++) {
                    let _path = path + '[' + i + ']';

                    resolver(obj[i], _path);
                }
            } else {
                if (typeof obj == "object" && null != obj) {
                    let keys = Object.keys(obj);
                    for (let i = 0; i < keys.length; i++) {
                        let _path = path + (root ? '' : '.') + keys[i];
                        resolver(obj[keys[i]], _path)
                    }
                } else {
                    if (root) flat = obj;
                    else flat[path] = obj;
                }

            }
        }

        resolver(S, '', true);

        return flat;
    }

    flat2struct = (flatObj) => {
        const res = {};
        for (const flatKey of Object.keys(flatObj)) {
            let path = flatKey.split('.');
            const key = path.pop();
            path.join('.');
            const branch = ObjSelector(res, path, true);
            branch[key] = flatObj[flatKey];
        }
        return res;
    }

    list2tree = (list) => {
        let map = {},
            node, roots = [],
            i;
        for (let i = 0; i < list.length; i++) {
            map[list[i].id] = i; // initialize the map
            list[i].children = []; // initialize the children
        }
        for (let i = 0; i < list.length; i++) {
            node = list[i];
            if (node.parent_id != 0) {
                // if you have dangling branches check that map[node.parentId] exists
                if (list[map[node.parent_id]]) {
                    list[map[node.parent_id]].children.push(node);
                }
            } else {
                roots.push(node);
            }
        }
        return roots;
    }

    tree2list = (tree) => {
        //removed dublicated code. struct2flat do the same with more features
        return struct2flat(tree);
    }

    //functions from PHP
    empty = (v) => {
        let isEmpty = false;
        let type = typeof v;
        if (null == v) type = "undefined";
        switch (type) {
            case 'string': {
                if (v.trim().length == 0) isEmpty = true;
                break;
            }
            case 'number': {
                if (v == 0 || isNaN(v)) isEmpty = true;
                break;
            }
            case 'object': {
                if (Array.isArray(v) && v.length == 0) isEmpty = true;
                if (Object.keys(v).length == 0) isEmpty = true;
                break;
            }
            case 'boolean': {
                isEmpty = !v;
                break;
            }
            case 'undefined': {
                isEmpty = true;
                break;
            }
        }
        return isEmpty;
    }

    mb_stripos = (haystack, needle, offset = 0) => {
        return mb_strpos(haystack.toString().toLowerCase(), needle.toString().toLowerCase(), offset);
    }

    mb_strpos = (haystack, needle, offset = 0) => {
        let tmp = haystack.slice(offset);
        tmp = tmp.split(needle);
        return tmp.length < 2 ? false : tmp[0].length;
    }

    str_shuffle = (str) => { return str.split('').sort(function () { return 0.5 - Math.random() }).join(''); }

    array_rand = (arr) => { return arr[Math.floor(Math.random() * arr.length)] }

    array_column = (array, column_key, index_key = null) => {
        let result = {};
        if (index_key === null) {
            result = [];
        }
        for (const row of array) {
            if (index_key === null) {
                result.push(row[column_key]);
            } else {
                result[row[index_key]] = [row[column_key]]
            }
        }
        return result;
    }

    use = (obj) => {
        /* 
         example. At the top of your component:
         const myFooLibrary = use(Application.Library.Foo);

         if Application.Library.Foo doesn't loaded yet, use() forces error, and this component will be loaded later
        */
        if (typeof obj === 'undefined') {
            class invokeUseError extends undefined { }
        }
        return obj;
    }

    htmlspecialchars = (string) => {
        let result = string;
        if (!empty(string))
            result = string.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('\'').join('&apos;').split('"').join('&quot;');
        return result
    }

    htmlspecialchars_decode = (string) => {
        let result = string;
        if (!empty(string))
            result = string.split('&amp;').join('&').split('&lt;').join('<').split('&gt;').join('>').split('&apos;').join('\'').split('&quot;').join('"');
        return result
    }

    striptags = (string) => {
        let regex = /(<([^>]+)>)/ig;
        let result = string;
        if (!empty(string))
            result = string.replace(regex, "");
        return result
    }

    trim = (string) => {
        let result = ""
        if ("undefined" !== typeof string) result = string.toString().trim();
        return result
    }

    explode = (divider, string) => {
        let result = []
        if ("undefined" !== typeof string) result = string.toString().split(divider);
        return result
    }

    base64_encode = (str) => {
        if ("undefined" !== typeof Buffer) {
            return new Buffer.from(str).toString('base64');
        } else {
            /**
             *  part of
             *  Base64 encode / decode
             *  http://www.webtoolkit.info/
             *
             **/
            let Base64 = {
                // private property
                _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                // public method for encoding
                encode: function (input) {
                    var output = "";
                    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                    var i = 0;

                    input = Base64._utf8_encode(input);

                    while (i < input.length) {

                        chr1 = input.charCodeAt(i++);
                        chr2 = input.charCodeAt(i++);
                        chr3 = input.charCodeAt(i++);

                        enc1 = chr1 >> 2;
                        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                        enc4 = chr3 & 63;

                        if (isNaN(chr2)) {
                            enc3 = enc4 = 64;
                        } else if (isNaN(chr3)) {
                            enc4 = 64;
                        }

                        output = output +
                            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
                    }
                    return output;
                },
                // private method for UTF-8 encoding
                _utf8_encode: function (string) {
                    string = string.replace(/\r\n/g, "\n");
                    var utftext = "";

                    for (var n = 0; n < string.length; n++) {

                        var c = string.charCodeAt(n);

                        if (c < 128) {
                            utftext += String.fromCharCode(c);
                        } else if ((c > 127) && (c < 2048)) {
                            utftext += String.fromCharCode((c >> 6) | 192);
                            utftext += String.fromCharCode((c & 63) | 128);
                        } else {
                            utftext += String.fromCharCode((c >> 12) | 224);
                            utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                            utftext += String.fromCharCode((c & 63) | 128);
                        }
                    }
                    return utftext;
                }
            }
            return Base64.encode(str);
        }

    }

    base64_decode = (str) => {
        if ("undefined" !== typeof Buffer) {
            return new Buffer.from(str, 'base64').toString();
        } else {
            /**
             *  part of
             *  Base64 encode / decode
             *  http://www.webtoolkit.info/
             *
             **/
            let Base64 = {

                // private property
                _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                // public method for decoding
                decode: function (input) {
                    let output = "";
                    let chr1, chr2, chr3;
                    let enc1, enc2, enc3, enc4;
                    let i = 0;

                    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

                    while (i < input.length) {

                        enc1 = this._keyStr.indexOf(input.charAt(i++));
                        enc2 = this._keyStr.indexOf(input.charAt(i++));
                        enc3 = this._keyStr.indexOf(input.charAt(i++));
                        enc4 = this._keyStr.indexOf(input.charAt(i++));

                        chr1 = (enc1 << 2) | (enc2 >> 4);
                        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                        chr3 = ((enc3 & 3) << 6) | enc4;

                        output = output + String.fromCharCode(chr1);

                        if (enc3 != 64) {
                            output = output + String.fromCharCode(chr2);
                        }
                        if (enc4 != 64) {
                            output = output + String.fromCharCode(chr3);
                        }
                    }

                    output = Base64._utf8_decode(output);

                    return output;
                },
                // private method for UTF-8 decoding
                _utf8_decode: function (utftext) {
                    let string = "";
                    let i = 0;
                    let c = 0;
                    let c1 = 0;
                    let c2 = 0;

                    while (i < utftext.length) {

                        c = utftext.charCodeAt(i);

                        if (c < 128) {
                            string += String.fromCharCode(c);
                            i++;
                        } else if ((c > 191) && (c < 224)) {
                            c2 = utftext.charCodeAt(i + 1);
                            string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                            i += 2;
                        } else {
                            c2 = utftext.charCodeAt(i + 1);
                            c3 = utftext.charCodeAt(i + 2);
                            string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                            i += 3;
                        }
                    }
                    return string;
                }
            }
            return Base64.decode(str);
        }
    }

    md5 = (str, as_bin = false) => {
        let result;
        /*
        md5(input:<string|array>,as_bin:<boolean>)
        if as_bin true, input/output is array of 8bit charcodes.
        if false, input is string and output is hex string too
        */
        function M(d) {
            let _, m = "0123456789ABCDEF",
                f = "";
            for (let r = 0; r < d.length; r++) {
                _ = d.charCodeAt(r), f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _);
            }
            return f
        }

        function X(d) {
            let _ = Array(d.length >> 2);
            for (let m = 0; m < _.length; m++) _[m] = 0;
            if ("string" === typeof d) {
                for (let m = 0; m < 8 * d.length; m += 8) {
                    _[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32;
                }
            } else {
                for (let m = 0; m < 8 * d.length; m += 8) {
                    _[m >> 5] |= (255 & d[m / 8]) << m % 32;
                }
            }
            return _
        }

        function V(d) {
            let _ = "";
            for (let m = 0; m < 32 * d.length; m += 8) _ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255);
            return _
        }

        function Y(d, _) {
            d[_ >> 5] |= 128 << _ % 32, d[14 + (_ + 64 >>> 9 << 4)] = _;
            let m = 1732584193,
                f = -271733879,
                r = -1732584194,
                i = 271733878;
            for (let n = 0; n < d.length; n += 16) {
                let h = m,
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
        result = M(V(Y(X(str), 8 * str.length)));
        result = result.toLowerCase();
        if (as_bin) {
            let hex2bin = function (hexSource) {
                let hexdec = function (hexString) {
                    hexString = (hexString + '').replace(/[^a-f0-9]/gi, '');
                    return parseInt(hexString, 16);
                };
                let bin = [];
                for (let i = 0; i < hexSource.length; i = i + 2) {
                    bin.push(hexdec(hexSource.substr(i, 2)));
                }
                return bin;
            }
            result = hex2bin(result);
        }
        return result;

    }

    toUTF8Array = (str) => {
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

    sha1 = (s) => {

        const byteToUint8Array = function (byteArray) {
            var uint8Array = new Uint8Array(byteArray.length);
            for (var i = 0; i < uint8Array.length; i++) {
                uint8Array[i] = byteArray[i];
            }

            return uint8Array;
        }
        // author Hsun
        // Message padding bits, complement the length.
        const fillString = function (str) {
            var blockAmount = ((str.length + 8) >> 6) + 1,
                blocks = [],
                i;

            for (let i = 0; i < blockAmount * 16; i++) {
                blocks[i] = 0;
            }
            for (let i = 0; i < str.length; i++) {
                blocks[i >> 2] |= str[i] << (24 - (i & 3) * 8);
            }
            blocks[i >> 2] |= 0x80 << (24 - (i & 3) * 8);
            blocks[blockAmount * 16 - 1] = str.length * 8;

            return blocks;
        }
        // Convert the input binary array to a hexadecimal string.
        const binToHex = function (binArray) {
            let hexString = "0123456789abcdef",
                str = "",
                i;

            for (let i = 0; i < binArray.length * 4; i++) {
                str += hexString.charAt((binArray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                    hexString.charAt((binArray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
            }

            return str;
        }
        // The core function, the output is a number array with a length of 5,
        // corresponding to a 160-bit message digest.
        let core = function (blockArray) {
            var w = [],
                a = 0x67452301,
                b = 0xEFCDAB89,
                c = 0x98BADCFE,
                d = 0x10325476,
                e = 0xC3D2E1F0,
                olda,
                oldb,
                oldc,
                oldd,
                olde,
                t,
                i,
                j;

            for (let i = 0; i < blockArray.length; i += 16) { //每次处理512位 16*32
                olda = a;
                oldb = b;
                oldc = c;
                oldd = d;
                olde = e;

                for (let j = 0; j < 80; j++) { //对每个512位进行80步操作
                    if (j < 16) {
                        w[j] = blockArray[i + j];
                    } else {
                        w[j] = cyclicShift(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
                    }
                    t = modPlus(modPlus(cyclicShift(a, 5), ft(j, b, c, d)), modPlus(modPlus(e, w[j]), kt(j)));
                    e = d;
                    d = c;
                    c = cyclicShift(b, 30);
                    b = a;
                    a = t;
                }

                a = modPlus(a, olda);
                b = modPlus(b, oldb);
                c = modPlus(c, oldc);
                d = modPlus(d, oldd);
                e = modPlus(e, olde);
            }

            return [a, b, c, d, e];
        }
        // According to the t value, return the corresponding f function used in
        // the compression function.
        let ft = function (t, b, c, d) {
            if (t < 20) {
                return (b & c) | ((~b) & d);
            } else if (t < 40) {
                return b ^ c ^ d;
            } else if (t < 60) {
                return (b & c) | (b & d) | (c & d);
            } else {
                return b ^ c ^ d;
            }
        }
        // According to the t value, return the corresponding K value used in
        // the compression function.
        let kt = function (t) {
            return (t < 20) ? 0x5A827999 :
                (t < 40) ? 0x6ED9EBA1 :
                    (t < 60) ? 0x8F1BBCDC : 0xCA62C1D6;
        }
        // Modulo 2 to the 32nd power addition, because JavaScript's number is a
        // double-precision floating-point number, so the 32-bit number is split
        // into the upper 16 bits and the lower 16 bits are added separately.
        let modPlus = function (x, y) {
            var low = (x & 0xFFFF) + (y & 0xFFFF),
                high = (x >> 16) + (y >> 16) + (low >> 16);

            return (high << 16) | (low & 0xFFFF);
        }
        // Rotate left of the input 32-bit num binary number, because JavaScript's
        // number is a double-precision floating-point number, so you need to pay
        //  attention to the shift.
        let cyclicShift = function (num, k) {
            return (num << k) | (num >>> (32 - k));
        }
        // The main function calculates the message digest based on the input message
        // string and returns the message digest in hexadecimal.
        return binToHex(core(fillString(byteToUint8Array(toUTF8Array(s)))));
    }

    sha256 = (s) => {
        let asciiArray = toUTF8Array(s);
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        };

        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        const lengthProperty = 'length'
        let i, j; // Used as a counter across the whole file
        let result = ''

        const words = [];
        const asciiBitLength = asciiArray[lengthProperty] * 8;

        //* caching results is optional - remove/add slash from front of this line to toggle
        // Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
        // (we actually calculate the first 64, but extra values are just ignored)
        var hash = sha256.h = sha256.h || [];
        // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
        const k = sha256.k = sha256.k || [];
        let primeCounter = k[lengthProperty];
        /*/
        var hash = [], k = [];
        var primeCounter = 0;
        //*/

        const isComposite = {};
        for (let c = 2; primeCounter < 64; c++) {
            if (!isComposite[c]) {
                for (let i = 0; i < 313; i += c) {
                    isComposite[i] = c;
                }
                hash[primeCounter] = (mathPow(c, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(c, 1 / 3) * maxWord) | 0;
            }
        }

        asciiArray.push(0x80) // Append Ƈ' bit (plus zero padding)
        while (asciiArray[lengthProperty] % 64 - 56) asciiArray.push(0x00) // More zero padding
        for (let i = 0; i < asciiArray[lengthProperty]; i++) {
            j = asciiArray[i];
            if (j >> 8) return; // ASCII check: only accept characters in range 0-255
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
        words[words[lengthProperty]] = (asciiBitLength)

        // process each chunk
        for (let j = 0; j < words[lengthProperty];) {
            var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
            var oldHash = hash;
            // This is now the undefinedworking hash", often labelled as variables a...g
            // (we have to truncate as well, otherwise extra entries at the end accumulate
            hash = hash.slice(0, 8);

            for (let i = 0; i < 64; i++) {
                const i2 = i + j;
                // Expand the message into 64 words
                // Used below if 
                const w15 = w[i - 15], w2 = w[i - 2];

                // Iterate
                const a = hash[0], e = hash[4];
                const temp1 = hash[7]
                    + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
                    + ((e & hash[5]) ^ ((~e) & hash[6])) // ch
                    + k[i]
                    // Expand the message schedule if needed
                    + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) // s0
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)) // s1
                    ) | 0
                    );
                // This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
                const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
                    + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])); // maj

                hash = [(temp1 + temp2) | 0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
                hash[4] = (hash[4] + temp1) | 0;
            }

            for (let i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i]) | 0;
            }
        }

        for (let i = 0; i < 8; i++) {
            for (let j = 3; j + 1; j--) {
                const b = (hash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? 0 : '') + b.toString(16);
            }
        }
        return result;
    }

}

module.exports = SysTools;
