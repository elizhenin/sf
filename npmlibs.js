Application.lib.path = require('path');
    Application.lib.fs = require('fs');
    Application.lib.fs_promises = require('fs').promises;
    Application.lib.nodemailer = require('nodemailer');
    Application.lib.cluster = require('cluster');
    Application.lib.request = require('request-promise');
    Application.lib['sync-sqlite'] = require('sync-sqlite');
    Application.lib.cyrillicToTranslit = new require("cyrillic-to-translit-js")();
    Application.lib.jsdom = require('jsdom');
    Application.lib.sha1 = require('sha-1');
    Application.lib.StrUnEscape = require('backslash');
    Application.lib.terser = require('terser');
    //HTTP does this really needed?
    Application.lib.busboy = require("busboy");
    //HTTP
    Application.lib.http = require('http');
    Application.lib['path-to-regexp'] = require('path-to-regexp');