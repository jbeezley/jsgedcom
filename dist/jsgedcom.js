!function(a) {
    "use strict";
    function b(a) {
        var b, c, d = a.trim().split(/\r?\n/), e = [], f = null, g = [], h = new RegExp("^@([^@].*)@$");
        return "HEAD" !== d[0].split(/\s+/)[1] ? null : (d.forEach(function(a, d) {
            var i = a.trim().split(/\s+/), j = Number(i[0]), k = i[1] || "", l = i.slice(2).join(" "), m = k.match(h), n = l.match(h);
            if (f || m) {
                if (m) return b = null, c = null, f = {
                    type: l,
                    id: m[1]
                }, void e.push(f);
                if (n && (n = n[1]), 1 === j) f[k] ? (c = {
                    value: n || l
                }, b.push(c)) : (c = {
                    value: n || l
                }, b = [ c ], f[k] = b); else if (2 === j) c[k] || (c[k] = []), c[k].push(n || l); else {
                    if (0 === j && "TRLR" === k) return;
                    g.push({
                        line: d,
                        content: a,
                        record: f
                    }), console.log("Unhandled structure at line " + d);
                }
            }
        }), {
            records: e,
            ignored: g
        });
    }
    function c(a) {
        var b = a.NAME;
        return a.name = null, delete a.NAME, b && b.length ? (name = b[0], void b.forEach(function(b) {
            if (!a.name) {
                var c, d = {};
                d.first = "UNKNOWN", d.middle = [], b.SURN && b.SURN[0] ? d.last = b.SURN[0] : (d.last = b.value.match(/\/(.*)\//), 
                d.last && (d.last = d.last[1])), b.GIVN && b.GIVN[0] && (c = b.GIVN[0].split(/\s+/), 
                c[0] && (d.first = c[0]), d.middle = c.slice(1).join(" ")), a.name = d;
            }
        })) : "No names present";
    }
    function d(a) {
        return new Date(a);
    }
    function e(a) {
        var b = {
            alt: [],
            date: new Date(0/0),
            str: "UNKNOWN"
        }, c = 0;
        return a.forEach(function(a) {
            b.alt.push(a), c < a.length && (c = a.length, b.date = d(a), b.str = a, a.valueOf() || (c = 0));
        }), b.date;
    }
    function f(a) {
        var b = {
            date: null,
            place: null
        };
        return (a || []).forEach(function(a) {
            b.date = e(a.DATE || []), k(a.PLAC || [], function(a) {
                b.place = a;
            });
        }), b.date || b.place ? b : null;
    }
    function g(a) {
        a.born = f(a.BIRT), delete a.BIRT;
    }
    function h(a) {
        var b = (a.RESI || []).map(function(a) {
            return f([ a ]);
        });
        Array.prototype.push.apply(b, (a.CENS || []).map(function(a) {
            return f([ a ]);
        })), delete a.RESI, delete a.CENS, a.res = b;
    }
    function i(a) {
        a.died = a.DEAT && a.DEAT[0] && "Y" === a.DEAT[0].value.toUpperCase()[0] ? !0 : f(a.DEAT), 
        delete a.DEAT;
    }
    function j(a) {
        a.buried = f(a.BURI), delete a.BURI;
    }
    function k(a, b) {
        a && a[0] ? o.georeference(a[0], b) : b(null);
    }
    function l(a) {
        var b;
        a.SEX && a.SEX[0] && "string" == typeof a.SEX[0].value ? (b = a.SEX[0].value, a.sex = "M" === b.toUpperCase() ? "M" : "F" === b.toUpperCase() ? "F" : "O") : a.sex = null, 
        delete a.SEX;
    }
    function m(a) {
        delete a.CHAN, delete a._UID, delete a.type, l(a), c(a), g(a), h(a), i(a), j(a), 
        a.childOf = [], a.FAMC && a.FAMC.forEach(function(b) {
            a.childOf.push(b.value);
        }), delete a.FAMC, a.parentOf = [], a.FAMS && a.FAMS.forEach(function(b) {
            a.parentOf.push(b.value);
        }), delete a.FAMS;
    }
    function n(a) {
        a.children = [], a.parents = [], a.father = a.HUSB ? a.HUSB[0].value : null, a.mother = a.WIFE ? a.WIFE[0].value : null, 
        [ "HUSB", "WIFE", "CHIL" ].forEach(function(b) {
            var c = a.parents;
            "CHIL" === b && (c = a.children), a[b] && a[b].length && a[b].forEach(function(a) {
                c.push(a.value);
            }), delete a[b];
        }), a.marriage = f(a.MARR), delete a.MARR, a.license = f(a.MARL), delete a.MARL, 
        a.divorce = f(a.DIV), delete a.DIV;
    }
    var o = {};
    o.parse = function(c, d) {
        var e;
        if ("string" == typeof c) {
            try {
                e = b(c);
            } catch (f) {
                return d(null, f), null;
            }
            return d(e.records, e.ignored), e.records;
        }
        if (!a.FileReader) throw new Error("Brower does not support HTTP5 FileReader.");
        var g = new FileReader();
        g.onload = function(a) {
            try {
                e = b(a.target.result);
            } catch (c) {
                d(null, c);
            }
            d(e.records, e.ignored);
        }, g.onerror = function() {
            d(null);
        }, g.onabort = function() {
            d(null);
        }, g.readAsText(c);
    };
    var p = {};
    o.georeference = function(a, b) {
        p.hasOwnProperty(a) || (p[a] = {
            name: a,
            longitude: 0,
            latitude: 0
        }), b(p[a]);
    }, o.tree = function() {}, o.normalize = function(a) {
        var b = {
            people: [],
            families: [],
            ignored: []
        };
        a.forEach(function(a) {
            "string" != typeof a.type ? b.ignored.push(a) : "INDI" === a.type.toUpperCase() ? (b.people.push(a), 
            m(a)) : "FAM" === a.type.toUpperCase() && (b.families.push(a), n(a));
        });
        var c = TAFFY(b.families);
        return b.people.forEach(function(a) {
            a.father = null, a.mother = null, a.childOf.forEach(function(b) {
                var d = c({
                    id: b
                }).get()[0];
                d && (d.father && (a.father = d.father), d.mother && (a.mother = d.mother));
            }), a.children = [], a.parentOf.forEach(function(b) {
                var d = c({
                    id: b
                }).get()[0];
                d && Array.prototype.push.apply(a.children, d.children);
            });
        }), b;
    }, a.gedcom = o;
}(window);