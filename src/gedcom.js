/* jshint: browser */
(function (GLOBAL) {
    'use strict';
    /**
     * @namespace
     */
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
            try {
                result = _parse(file);
            } catch(err) {
                done(null, err);
                return null;
            }
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
            try {
                result = _parse(evt.target.result);
            } catch(err) {
                done(null, err);
            }
            done(result.records, result.ignored);
        };

        reader.onerror = function () {
            done(null);
        };

        reader.onabort = function () {
            done(null);
        };

        reader.readAsText(file);
    };

    // caches data from geonames
    var geocache = {};

    /**
     * Uses geonames service to get the coordinates of a place
     * name.  The results are cached internally to limit API calls
     * to geonames.
     *
     * @todo Unimplmented
     */
    gedcom.georeference = function (s, done) {
        if (!geocache.hasOwnProperty(s)) {
            geocache[s] = {
                name: s,
                longitude: 0,
                latitude: 0
            };
        }
        done(geocache[s]);
    };

    /**
     * Generate a tree structure from the family records.
     * For each person in the database, a new object is created
     * with the following properties: ::
     *   {
     *     mothers: [],
     *     fathers: [],
     *     children: [],
     *     spouses: [],
     *     siblings: []
     *   }
     *
     * @param {TAFFY} records A taffydb database of records from gedcom.parse
     * @returns {object[]}
     *
     * @todo Unimplemented
     */
    gedcom.tree = function (records) {
    };

    /**
     * Private normalization handlers.
     * @private
     */
    function normalizeName(person) {
        var names = person.NAME;
        person.name = null;
        delete person.NAME;

        if (!names || !names.length) {
            return 'No names present';
        }

        // maybe be smarter later, but for now just use the first
        // object and throw away the rest.
        name = names[0];

        names.forEach(function (name) {
            if (person.name) {
                // already found
                return;
            }
            var obj = {}, arr;
            obj.first = 'UNKNOWN'; // allow unknown first name
            obj.middle = []; // some people don't have exactly 1 middle name
            if (name.SURN && name.SURN[0]) {
                obj.last = name.SURN[0];
            } else {
                obj.last = name.value.match(/\/(.*)\//);
                if (obj.last) {
                    obj.last = obj.last[1];
                }
            }
            if (name.GIVN && name.GIVN[0]) {
                arr = name.GIVN[0].split(/\s+/);
                if (arr[0]) {
                    obj.first = arr[0];
                }
                obj.middle = arr.slice(1).join(' ');
            }
            person.name = obj;
        });
    }

    function normalizeDate(d) {
        // The standard date method seems to do a pretty good job with this.
        // Maybe handle invalid values here?
        return new Date(d);
    }

    // try to get the best date out of an array of date strings
    // for now just using the longest string
    function normalizeDates(dates) {
        var out = {
            alt: [],
            date: new Date(NaN),
            str: 'UNKNOWN'
        };
        var n = 0;
        dates.forEach(function (d) {
            out.alt.push(d);
            if (n < d.length) {
                n = d.length;
                out.date = normalizeDate(d);
                out.str = d;
                if (!d.valueOf()) {
                    n = 0;
                }
            }
        });
        return out.date;
    }

    function normalizeDatePlace(source) {
        var target = {
            date: null,
            place: null
        };

        (source || []).forEach(function (b) {
            target.date = normalizeDates(b.DATE || []);
            normalizePlaces(
                b.PLAC || [],
                function (p) {
                    target.place = p;
                }
            );
        });
        if (target.date || target.place) {
            return target;
        }
        return null;
    }

    function normalizeBirth(person) {
        person.born = normalizeDatePlace(person.BIRT);
        delete person.BIRT;
    }

    function normalizeRes(person) {
        var res = (person.RESI || []).map(function (r) {
            return normalizeDatePlace([r]);
        });
        Array.prototype.push.apply(res, (person.CENS || []).map(function (r) {
            return normalizeDatePlace([r]);
        }));
        delete person.RESI;
        delete person.CENS;
        person.res = res;
    }

    function normalizeDeath(person) {
        if (person.DEAT && person.DEAT[0] &&
            person.DEAT[0].value.toUpperCase()[0] === 'Y') {
            person.died = true;
        } else {
            person.died = normalizeDatePlace(person.DEAT);
        }
        delete person.DEAT;
    }

    function normalizeBuried(person) {
        person.buried = normalizeDatePlace(person.BURI);
        delete person.BURI;
    }

    function normalizePlace(place, done) {
        // hmmm don't realy want an async method here...
        // maybe preload all PLAC tags before normalization
        gedcom.georeference(place, done);
    }

    function normalizePlaces(places, done) {
        if (places && places[0]) {
            gedcom.georeference(places[0], done);
        } else {
            done(null);
        }
    }

    function normalizeSex(person) {
        var s;
        if (person.SEX &&
            person.SEX[0] &&
            typeof person.SEX[0].value === 'string'
           ) {
            s = person.SEX[0].value;
            if (s.toUpperCase() === 'M') {
                person.sex = 'M';
            } else if (s.toUpperCase() === 'F') {
                person.sex = 'F';
            } else {
                person.sex = 'O'; // other, I guess
            }
        } else {
            person.sex = null;
        }
        delete person.SEX;
    }

    function normalizePerson(person, people, families) {
        delete person.CHAN;
        delete person._UID;
        delete person.type;
        normalizeSex(person);
        normalizeName(person);
        normalizeBirth(person);
        normalizeRes(person);
        normalizeDeath(person);
        normalizeBuried(person);

        person.childOf = [];
        if (person.FAMC) {
            person.FAMC.forEach(function (fam) {
                person.childOf.push(fam.value);

            });
        }
        delete person.FAMC;

        person.parentOf = [];
        if (person.FAMS) {
            person.FAMS.forEach(function (fam) {
                person.parentOf.push(fam.value);
            });
        }
        delete person.FAMS;
    }

    function normalizeFamily(family) {
        family.children = [];
        family.parents = [];
        family.father = family.HUSB ? family.HUSB[0].value : null;
        family.mother = family.WIFE ? family.WIFE[0].value : null;
        ['HUSB', 'WIFE', 'CHIL'].forEach(function (type) {
            var arr = family.parents;
            if (type === 'CHIL') {
                arr = family.children;
            }
            if (family[type] && family[type].length) {
                family[type].forEach(function(p) {
                    arr.push(p.value);
                });
            }
            delete family[type];
        });

        family.marriage = normalizeDatePlace(family.MARR);
        delete family.MARR;
        family.license = normalizeDatePlace(family.MARL);
        delete family.MARL;
        family.divorce = normalizeDatePlace(family.DIV);
        delete family.DIV;
    }

    /**
     * Normalize important fields in the record list and remove duplicate
     * keys to simplify database querying.
     *
     * @todo Maybe provide custom handlers to override defaults
     *
     * @param {object[]} records Output from gedcom.parse
     * @returns {object}
     */
     gedcom.normalize = function (records) {
         var out = {
             people: [],
             families: [],
             ignored: []
         };
         records.forEach(function (record) {
            if (typeof record.type !== 'string') {
                out.ignored.push(record);
            } else if (record.type.toUpperCase() === 'INDI') {
                out.people.push(record);
                normalizePerson(record);
            } else if (record.type.toUpperCase() === 'FAM') {
                out.families.push(record);
                normalizeFamily(record);
            }
         });

         var db = TAFFY(out.familes);
         out.people.forEach(function (person) {
            var family;

            person.childOf.forEach(function (familyId) {
                var family = db({'id': familyId}).get()[0];
                if (family) {
                    if (family.father) {
                        person.father = family.father;
                    }
                    if (family.mother) {
                        persion.mother = family.mother;
                    }
                }
            });

            person.children = [];
            person.parentOf.forEach(function (familyId) {
                var family = db({'id': familyId}).get()[0];
                if (family) {
                    Array.prototype.push.call(person.children, family.children);
                }
            });
         });
         return out;
     };

    GLOBAL.gedcom = gedcom;
})(window);
