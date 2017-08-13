
CSL.Util.Names = {};

CSL.Util.Names.compareNamesets = CSL.NameOutput.prototype._compareNamesets;

/**
 * Un-initialize a name (quash caps after first character)
 */
CSL.Util.Names.unInitialize = function (state, name) {
    var i, ilen, namelist, punctlist, ret;
    if (!name) {
        return "";
    }
    namelist = name.split(/(?:-|\s+)/);
    punctlist = name.match(/(-|\s+)/g);
    ret = "";
    for (i = 0, ilen = namelist.length; i < ilen; i += 1) {
        if (CSL.ALL_ROMANESQUE_REGEXP.exec(namelist[i].slice(0,-1)) 
            && namelist[i] 
            && namelist[i] !== namelist[i].toUpperCase()) {

            // More or less like this, to address the following fault report:
            // http://forums.zotero.org/discussion/17610/apsa-problems-with-capitalization-of-mc-mac-etc/
            namelist[i] = namelist[i].slice(0, 1) + namelist[i].slice(1, 2).toLowerCase() + namelist[i].slice(2);
        }
        ret += namelist[i];
        if (i < ilen - 1) {
            ret += punctlist[i];
        }
    }
    return ret;
};

/**
 * Initialize a name.
 */
CSL.Util.Names.initializeWith = function (state, name, terminator, normalizeOnly) {
    var i, ilen, j, jlen, mm, lst, ret;
    if (!name) {
        return "";
    }
    if (!terminator) {
        terminator = "";
    }
    if (["Lord", "Lady"].indexOf(name) > -1
        || (!name.match(CSL.STARTSWITH_ROMANESQUE_REGEXP)
            && !terminator.match("%s"))) {
        return name;
    }
    var namelist = name;
    if (state.opt["initialize-with-hyphen"] === false) {
        namelist = namelist.replace(/-/g, " ");
    }

    // Oh boy.
    // We need to suss out what is a set of initials or abbreviation,
    // so that they can be selectively normalized. Steps might be:
    //   (1) Split the string
    //   (2) Step through the string, deleting periods and, if initalize="false", then
    //       (a) note abbreviations and initials (separately).
    //   (3) If initialize="false" then:
    //       (a) Do the thing below, but only pushing terminator; or else
    //       (b) Do the thing below

    // (1) Split the string
    namelist = namelist.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
    namelist = namelist.replace(/-([a-z])/g, "\u2013$1");
    // Workaround for Internet Explorer
    //namelist = namelist.split(/(\-|\s+)/);
    // Workaround for Internet Explorer
    mm = namelist.match(/[-\s]+/g);
    lst = namelist.split(/[-\s]+/);

    if (lst.length === 0) {
        // This doesn't make much sense, and may be impossible.
        namelist = mm;
    } else {
        namelist = [lst[0]];
        for (i = 1, ilen = lst.length; i < ilen; i += 1) {
            namelist.push(mm[i - 1]);
            namelist.push(lst[i]);
        }
    }
    lst = namelist;

    // This case remains: John T.S. Smith. Fix up by stepping through
    // in reverse.
    for (i = lst.length -1; i > -1; i += -1) {
        if (lst[i] && lst[i].slice(0, -1).indexOf(".") > -1) {
            
            var lstend = lst.slice(i + 1);
            var lstmid = lst[i].slice(0, -1).split(".");
            lst = lst.slice(0, i);
            for (j = 0, jlen = lstmid.length; j < jlen; j += 1) {
                lst.push(lstmid[j] + ".");
                if (j < lstmid.length - 1) {
                    lst.push(" ");
                }
            }
            lst = lst.concat(lstend);
        }
    }

    // Use doInitializeName or doNormalizeName, depending on requirements.
    if (normalizeOnly) {
        ret = CSL.Util.Names.doNormalize(state, lst, terminator);
    } else {
        ret = CSL.Util.Names.doInitialize(state, lst, terminator);
    }
    ret = ret.replace(/\u2013([a-z])/g, "-$1");
    return ret;
};

CSL.Util.Names.doNormalize = function (state, namelist, terminator) {
    var i, ilen;
    terminator = terminator ? terminator : "";
    //   (2) Step through the string, deleting periods and, if initalize="false", then
    //       (a) note abbreviations and initials (separately).

    var isAbbrev = [];
    for (i = 0, ilen = namelist.length; i < ilen; i += 1) {
        if (namelist[i].length > 1 && namelist[i].slice(-1) === ".") {
            namelist[i] = namelist[i].slice(0, -1);
            isAbbrev.push(true);
        } else if (namelist[i].length === 1 && namelist[i].toUpperCase() === namelist[i]) {
            isAbbrev.push(true);
        } else {
            isAbbrev.push(false);
        }
    }
    //   (3) If initialize="false" then:
    //       (a) Do the thing below, but only pushing terminator; or else
    //       (b) Do the thing below
    for (i = 0, ilen = namelist.length; i < ilen; i += 2) {
        if (isAbbrev[i]) {
            if (i < namelist.length - 2) {
                namelist[i + 1] = "";
                // If terminator does not end in a space,
                // and this is a ROMANESQUE,
                // and this or partner is not an initial,
                // add a space.
                // Otherwise, just use terminator.
                // ... but always trim space-like things from the
                // end of a cluster of initials.
                if ((!terminator || terminator.slice(-1) && terminator.slice(-1) !== " ")
                    && namelist[i].length && namelist[i].match(CSL.ALL_ROMANESQUE_REGEXP)
                    && (namelist[i].length > 1 || namelist[i + 2].length > 1)) {
                    namelist[i + 1] = " ";
                }
                if (namelist[i + 2].length > 1) {
                    namelist[i] = namelist[i] + terminator.replace(/[\u0009\u000a\u000b\u000c\u000d\u0020\ufeff\u00a0]+$/, "");
                } else {
                    namelist[i] = namelist[i] + terminator;
                }
            }
            if (i === namelist.length - 1) {
                namelist[i] = namelist[i] + terminator;
            }
        }
    }
    return namelist.join("").replace(/[\u0009\u000a\u000b\u000c\u000d\u0020\ufeff\u00a0]+$/,"").replace(/\s*-\s*/g, "-").replace(/[\u0009\u000a\u000b\u000c\u000d\u0020]+/g, " ");
};

CSL.Util.Names.doInitialize = function (state, namelist, terminator) {
    var i, ilen, m, j, jlen, lst, n;
    for (i = 0, ilen = namelist.length; i < ilen; i += 2) {
        n = namelist[i];
        if (!n) {
            continue;
        }
        m = n.match(CSL.NAME_INITIAL_REGEXP);
        if (!m && (!n.match(CSL.STARTSWITH_ROMANESQUE_REGEXP) && n.length > 1 && terminator.match("%s"))) {
            m = n.match(/(.)(.*)/);
        }
        if (m && m[1] === m[1].toUpperCase()) {
            var extra = "";
            if (m[2]) {
                var s = "";
                lst = m[2].split("");
                for (j = 0, jlen = lst.length; j < jlen; j += 1) {
                    var c = lst[j];
                    if (c === c.toUpperCase()) {
                        s += c;
                    } else {
                        break;
                    }
                }
                if (s.length < m[2].length) {
                    extra = s.toLocaleLowerCase();
                }
            }
            namelist[i] = m[1].toLocaleUpperCase() + extra;
            if (i < (ilen - 1)) {
                if (terminator.match("%s")) {
                    namelist[i] = terminator.replace("%s", namelist[i]);
                } else {
                    if (namelist[i + 1].indexOf("-") > -1) {
                        namelist[i + 1] = terminator + namelist[i + 1];
                    } else {
                        namelist[i + 1] = terminator;
                    }
                }
            } else {
                if (terminator.match("%s")) {
                    namelist[i] = terminator.replace("%s", namelist[i]);
                } else {
                    namelist.push(terminator);
                }
            }
        } else if (n.match(CSL.ROMANESQUE_REGEXP)) {
            namelist[i] = " " + n;
        }
    }
    var ret = namelist.join("");
    ret = ret.replace(/[\u0009\u000a\u000b\u000c\u000d\u0020\ufeff\u00a0]+$/,"").replace(/\s*-\s*/g, "-").replace(/[\u0009\u000a\u000b\u000c\u000d\u0020]+/g, " ");
    return ret;
};

CSL.Util.Names.getRawName = function (name) {
    var ret = [];
    if (name.given) {
        ret.push(name.given);
    }
    if (name.family) {
        ret.push(name.family);
    }
    return ret.join(" ");
};

// deleted CSL.Util.Names.initNameSlices()
// no longer used.

// deleted CSL.Util.Names,rescueNameElements()
// apparently not used.


