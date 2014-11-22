/* jshint: browser */
(function (GLOBAL) {
    'use strict';
    
    var gedcom = {};

    /**
     * Implementation.
     * @private
     */
    function _parse(content) {
        var lines = content.trim().split(/\r?\n/);
        var records = [];
        var current = null;
        var sub, chi;
        var ignored = [];

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
                ignored.push({
                    line: index,
                    content: line,
                    record: current
                });
                console.log('Unhandled structure at line ' + index);
            }
            
        });

        return {
            records: records,
            ignored: ignored
        };
    }

    /**
     * Parses a gedcom file and constructs a raw JSON compatible object
     * containing all information from the file.  Not all properties
     * are handled by this parser.  Unhandled lines are written to
     * the console and reported in the returned object.
     *
     * @param {(File|string)} file The file object or string content of a gedcom file.
     * @param {function} done A callback function taking the parsed result as an argument.
     *
     * @example
     * gedcom.parse(file, function (records, ignored) {
     *   // records:
     *   [
     *     {
     *       type: 'INDI',
     *       id: 'I1'
     *       NAME: [
     *         value: 'John /Doe/',
     *         'GIVN': [
     *           'John'
     *         ],
     *         'SURN': [
     *           'Doe'
     *         ]
     *       ],
     *       ...
     *     },
     *     ...
     *     {
     *       type: 'FAM',
     *       id: 'F1',
     *       HUSB: [
     *         {
     *           value: 'I1'
     *         }
     *       ],
     *       WIFE: [
     *         {
     *           value: 'I2'
     *         }
     *       ],
     *       CHIL: [
     *         ...
     *       ]
     *     },
     *     ...
     *   ]
     *
     *   // ignored: array of lines ignored
     *   [
     *     {
     *       line: 100,
     *       content: '3 SOME unhandled content',
     *       record: {}  // The record containing the line.
     *     }
     *   ]
     * });
     */
    gedcom.parse = function (file, done) {
        var result;
        if (typeof file === 'string') {
            result = _parse(file);
            done(result.records, result.ignored);
            return result.records;
        } else {
            // check for browswer compatibility
            if (!GLOBAL.FileReader) {
                throw new Error('Brower does not support HTTP5 FileReader.');
            }
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

    GLOBAL.gedcom = gedcom;
})(window);
