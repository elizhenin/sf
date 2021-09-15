Application.lib.cluster = require('cluster');
Application.lib.path = require('path');
Application.lib.fs = require('fs');
Application.lib.fs_promises = require('fs').promises;
Application.lib.nodemailer = require('nodemailer');
Application.lib.cyrillicToTranslit = new require("cyrillic-to-translit-js")();
Application.lib.jsdom = require('jsdom');
Application.lib.StrUnEscape = require('backslash');
Application.lib.terser = require('terser');
//HTTP
Application.lib.http = require('http');
Application.lib.zlib = require('zlib');
Application.lib['path-to-regexp'] = require('path-to-regexp');
