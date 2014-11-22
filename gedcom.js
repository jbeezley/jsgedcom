/* jshint: browser */
(function (GLOBAL) {
    'use strict';
    
    var gedcom = {};

    function _parse(content) {
        var lines = content.trim().split(/\r?\n/);
        var records = [];
        var current = null;
        var sub, chi;

        // matches links to other records
        var re_link = new RegExp('^@([^@].*)@$');

        // Check compatibility
        if (lines[0].split(/\s+/)[1] !== 'HEAD') {
            return null;
        }

        lines.forEach(function (line, index) {
            var lineArr = line.trim().split(/\s+/);
            var level = Number(lineArr[0]);
            var tag = lineArr[1] || '';
            var prop = lineArr.slice(2).join(' ');
            var id = tag.match(re_link);
            var link = prop.match(re_link);
            var rec;

            if (!current && !id) {
                return; // ignoring header
            }

            if (id) {
                sub = null;
                chi = null;
                current = {
                    type: prop,
                    id: id[1]
                };
                records.push(current);
                return;
            }

            if (link) {
                link = link[1];
            }

            if (level === 1) {
                if (!current[tag]) {
                    chi = {
                        value: link || prop
                    };
                    sub = [chi];
                    current[tag] = sub;
                } else {
                    chi = {
                        value: link || prop
                    };
                    sub.push(chi);
                }
            } else if (level === 2) {
                if (!chi[tag]) {
                    chi[tag] = [];
                }
                chi[tag].push(link || prop);
            } else if (level === 0 && tag === 'TRLR') {
                return; // end of file record
            } else {
                console.log('Unhandled structure at line ' + index);
            }
            
        });

        return records;
    }

    gedcom.parse = function (file, done) {
        if (typeof file === 'string') {
            done(_parse(file));
        }
        var reader = new FileReader();

        reader.onload = function (evt) {
            done(_parse(evt.target.result));
        };

        reader.onerror = function () {
            done(null);
        };

        reader.onabort = function () {
            done(null);
        };

        reader.readAsText(file);
    };

    // check for browswer compatibility
    if (GLOBAL.File && GLOBAL.FileReader && GLOBAL.FileList && GLOBAL.Blob) {
        GLOBAL.gedcom = gedcom;
    }
})(window);
