/*global CSL: true */

CSL.Util.PageRangeMangler = {};

CSL.Util.PageRangeMangler.getFunction = function (state, rangeType) {
    var rangerex, pos, len, stringify, listify, expand, minimize, minimize_internal, chicago15, chicago16, lst, m, b, e, ret, begin, end, ret_func;
    
    var range_delimiter = state.getTerm(rangeType + "-range-delimiter");

    rangerex = /([0-9]*[a-zA-Z]+0*)?([0-9]+[a-z]*)\s*(?:\u2013|-)\s*([0-9]*[a-zA-Z]+0*)?([0-9]+[a-z]*)/;

    stringify = function (lst) {
        len = lst.length;
        for (pos = 1; pos < len; pos += 2) {
            if ("object" === typeof lst[pos]) {
                lst[pos] = lst[pos].join("");
            }
        }
        var ret = lst.join("");
        ret = ret.replace(/([^\\])\-/g, "$1"+state.getTerm(rangeType + "-range-delimiter"));
        return ret;
    };

    listify = function (str) {
        var m, lst, ret;
        // Normalized delimiter form, for use in regexps
        var hyphens = "\\s+\\-\\s+";
        // Normalize delimiters to hyphen wrapped in single spaces
        var this_range_delimiter = range_delimiter === "-" ? "" : range_delimiter;
        var delimRex = new RegExp("([^\\\\])[-" + this_range_delimiter + "\\u2013]", "g");
        str = str.replace(delimRex, "$1 - ").replace(/\s+-\s+/g, " - ");
        // Workaround for Internet Explorer
        //var rexm = new RegExp("((?:[0-9]*[a-zA-Z]+)?[0-9]+" + hyphens + "(?:[0-9]*[a-zA-Z]+)?[0-9]+)", "g");
        //var rexlst = new RegExp("(?:[0-9]*[a-zA-Z]+)?[0-9]+" + hyphens + "(?:[0-9]*[a-zA-Z]+)?[0-9]+");
        var rexm = new RegExp("((?:[0-9]*[a-zA-Z]+0*)?[0-9]+[a-z]*" + hyphens + "(?:[0-9]*[a-zA-Z]+0*)?[0-9]+[a-z]*)", "g");
        var rexlst = new RegExp("(?:[0-9]*[a-zA-Z]+0*)?[0-9]+[a-z]*" + hyphens + "(?:[0-9]*[a-zA-Z]+0*)?[0-9]+[a-z]*");
        m = str.match(rexm);
        lst = str.split(rexlst);
        if (lst.length === 0) {
            ret = m;
        } else {
            ret = [lst[0]];
            for (pos = 1, len = lst.length; pos < len; pos += 1) {
                ret.push(m[pos - 1].replace(/\s*\-\s*/g, "-"));
                ret.push(lst[pos]);
            }
        }
        return ret;
    };

    expand = function (str) {
        str = "" + str;
        lst = listify(str);
        len = lst.length;
        for (pos = 1; pos < len; pos += 2) {
            m = lst[pos].match(rangerex);
            if (m) {
                if (!m[3] || m[1] === m[3]) {
                    if (m[4].length < m[2].length) {
                        m[4] = m[2].slice(0, (m[2].length - m[4].length)) + m[4];
                    }
                    if (parseInt(m[2], 10) < parseInt(m[4], 10)) {
                        m[3] = range_delimiter + (m[1] ? m[1] : "");
                        lst[pos] = m.slice(1);
                    }
                }
            }
            if ("string" === typeof lst[pos]) {
                lst[pos] = lst[pos].replace(/\-/g, range_delimiter);
            }
        }
        return lst;
    };

    minimize = function (lst, minchars, isyear) {
        len = lst.length;
        for (var i = 1, ilen = lst.length; i < ilen; i += 2) {
            if ("object" === typeof lst[i]) {
                lst[i][3] = minimize_internal(lst[i][1], lst[i][3], minchars, isyear);
                if (lst[i][2].slice(1) === lst[i][0]) {
                    lst[i][2] = range_delimiter;
                }
            }
        }
        return stringify(lst);
    };

    minimize_internal = function (begin, end, minchars, isyear) {
        if (!minchars) {
            minchars = 0;
        }
        b = ("" + begin).split("");
        e = ("" + end).split("");
        ret = e.slice();
        ret.reverse();
        if (b.length === e.length) {
            for (var i = 0, ilen = b.length; i < ilen; i += 1) {
                if (b[i] === e[i] && ret.length > minchars) {
                    ret.pop();
                } else {
                    if (minchars && isyear && ret.length === 3) {
                        var front = b.slice(0, i);
                        front.reverse();
                        ret = ret.concat(front);
                    }
                    break;
                }
            }
        }
        ret.reverse();
        return ret.join("");
    };

    chicago15 = function (lst) {
        len = lst.length;
        for (pos = 1; pos < len; pos += 2) {
            if ("object" === typeof lst[pos]) {
                m = lst[pos];
                begin = parseInt(m[1], 10);
                end = parseInt(m[3], 10);
                if (begin > 100 && begin % 100 && parseInt((begin / 100), 10) === parseInt((end / 100), 10)) {
                    m[3] = "" + (end % 100);
                } else if (begin >= 10000) {
                    e = "" + end;
                    for (var i = 3; i < e.length; i++) {
                        var divisor = Math.pow(10, i);
                        if (Math.floor(begin / divisor) === Math.floor(end / divisor)) {
                            m[3] = "" + (end % divisor);
                            break;
                        }
                    }
                }
            }
            if (m[2].slice(1) === m[0]) {
                m[2] = range_delimiter;
            }
        }
        return stringify(lst);
    };

    chicago16 = function (lst) {
        len = lst.length;
        for (pos = 1; pos < len; pos += 2) {
            if ("object" === typeof lst[pos]) {
                m = lst[pos];
                begin = parseInt(m[1], 10);
                end = parseInt(m[3], 10);
                e = "" + end;
                if (begin > 100 && begin % 100) {
                    for (var i = 2; i < e.length; i++) {
                        var divisor = Math.pow(10, i);
                        if (Math.floor(begin / divisor) === Math.floor(end / divisor)) {
                            m[3] = "" + (end % divisor);
                            break;
                        }
                    }
                }
            }
            if (m[2].slice(1) === m[0]) {
                m[2] = range_delimiter;
            }
        }
        return stringify(lst);
    };

    //
    // The top-level option handlers.
    //
    var sniff = function (str, func, minchars, isyear) {
        var ret;
		str = "" + str;
		var lst = expand(str);
        var ret = func(lst, minchars, isyear);
        return ret;
    };
    if (!state.opt[rangeType + "-range-format"]) {
        ret_func = function (str) {
            //return str.replace("-", "\u2013", "g");
            return sniff(str, stringify);
        };
    } else if (state.opt[rangeType + "-range-format"] === "expanded") {
        ret_func = function (str) {
            return sniff(str, stringify);
        };
    } else if (state.opt[rangeType + "-range-format"] === "minimal") {
        ret_func = function (str) {
            return sniff(str, minimize);
        };
    } else if (state.opt[rangeType + "-range-format"] === "minimal-two") {
        ret_func = function (str, isyear) {
            return sniff(str, minimize, 2, isyear);
        };
    } else if (state.opt[rangeType + "-range-format"] === "chicago") {
        ret_func = function (str) {
            return sniff(str, chicago15);
        };
    } else if (state.opt[rangeType + "-range-format"] === "chicago-15") {
        ret_func = function (str) {
            return sniff(str, chicago15);
        };
    } else if (state.opt[rangeType + "-range-format"] === "chicago-16") {
        ret_func = function (str) {
            return sniff(str, chicago16);
        };
    }

    return ret_func;
};

