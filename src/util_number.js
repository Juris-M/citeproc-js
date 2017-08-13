
CSL.Util.padding = function (num) {
    var m = num.match(/\s*(-{0,1}[0-9]+)/);
    if (m) {
        num = parseInt(m[1], 10);
        if (num < 0) {
            num = 99999999999999999999 + num;
        }
        num = "" + num;
        while (num.length < 20) {
            num = "0" + num;
        }
    }
    return num;
};

CSL.Util.LongOrdinalizer = function () {};

CSL.Util.LongOrdinalizer.prototype.init = function (state) {
    this.state = state;
};

CSL.Util.LongOrdinalizer.prototype.format = function (num, gender) {
    if (num < 10) {
        num = "0" + num;
    }
    // Argument true means "loose".
    var ret = CSL.Engine.getField(
        CSL.LOOSE, 
        this.state.locale[this.state.opt.lang].terms,
        "long-ordinal-" + num,
        "long", 
        0, 
        gender
    );
    if (!ret) {
        ret = this.state.fun.ordinalizer.format(num, gender);
    }
    // Probably too optimistic -- what if only renders in _sort?
    this.state.tmp.cite_renders_content = true;
    return ret;
};


CSL.Util.Ordinalizer = function (state) {
    this.state = state;
    this.suffixes = {};
};

CSL.Util.Ordinalizer.prototype.init = function () {
    if (!this.suffixes[this.state.opt.lang]) {
        this.suffixes[this.state.opt.lang] = {};
        for (var i = 0, ilen = 3; i < ilen; i += 1) {
            var gender = [undefined, "masculine", "feminine"][i];
            this.suffixes[this.state.opt.lang][gender] = [];
            for (var j = 1; j < 5; j += 1) {
                var ordinal = this.state.getTerm("ordinal-0" + j, "long", false, gender);
                if ("undefined" === typeof ordinal) {
                    delete this.suffixes[this.state.opt.lang][gender];
                    break;
                }
                this.suffixes[this.state.opt.lang][gender].push(ordinal);
            }
        }
    }
};

CSL.Util.Ordinalizer.prototype.format = function (num, gender) {
    var str;
    num = parseInt(num, 10);
    str = "" + num;
    var suffix = "";
    var trygenders = [];
    if (gender) {
        trygenders.push(gender);
    }
    trygenders.push("neuter");
    if (this.state.locale[this.state.opt.lang].ord["1.0.1"]) {
        suffix = this.state.getTerm("ordinal",false,0,gender);
        var trygender;
        for (var i = 0, ilen = trygenders.length; i < ilen; i += 1) {
            trygender = trygenders[i];
            var ordinfo = this.state.locale[this.state.opt.lang].ord["1.0.1"];
            if (ordinfo["whole-number"][str] && ordinfo["whole-number"][str][trygender]) {
                suffix = this.state.getTerm(this.state.locale[this.state.opt.lang].ord["1.0.1"]["whole-number"][str][trygender],false,0,gender);
            } else if (ordinfo["last-two-digits"][str.slice(str.length - 2)] && ordinfo["last-two-digits"][str.slice(str.length - 2)][trygender]) {
                suffix = this.state.getTerm(this.state.locale[this.state.opt.lang].ord["1.0.1"]["last-two-digits"][str.slice(str.length - 2)][trygender],false,0,gender);
            } else if (ordinfo["last-digit"][str.slice(str.length - 1)] && ordinfo["last-digit"][str.slice(str.length - 1)][trygender]) {
                suffix = this.state.getTerm(this.state.locale[this.state.opt.lang].ord["1.0.1"]["last-digit"][str.slice(str.length - 1)][trygender],false,0,gender);
            }
            if (suffix) {
                break;
            }
        }
    } else {
        if (!gender) {
            // XXX hack to prevent crash on CSL 1.0 styles.
            // Reported by Carles.
            gender = undefined;
        }
        this.state.fun.ordinalizer.init();
        if ((num / 10) % 10 === 1 || (num > 10 && num < 20)) {
            suffix = this.suffixes[this.state.opt.lang][gender][3];
        } else if (num % 10 === 1 && num % 100 !== 11) {
            suffix = this.suffixes[this.state.opt.lang][gender][0];
        } else if (num % 10 === 2 && num % 100 !== 12) {
            suffix = this.suffixes[this.state.opt.lang][gender][1];
        } else if (num % 10 === 3 && num % 100 !== 13) {
            suffix = this.suffixes[this.state.opt.lang][gender][2];
        } else {
            suffix = this.suffixes[this.state.opt.lang][gender][3];
        }
    }
    str = str += suffix;
    return str;
};

CSL.Util.Romanizer = function () {};

CSL.Util.Romanizer.prototype.format = function (num) {
    var ret, pos, n, numstr, len;
    ret = "";
    if (num < 6000) {
        numstr = num.toString().split("");
        numstr.reverse();
        pos = 0;
        n = 0;
        len = numstr.length;
        for (pos = 0; pos < len; pos += 1) {
            n = parseInt(numstr[pos], 10);
            ret = CSL.ROMAN_NUMERALS[pos][n] + ret;
        }
    }
    return ret;
};


/**
 * Create a suffix formed from a list of arbitrary characters of arbitrary length.
 * <p>This is a <i>lot</i> harder than it seems.</p>
 */
CSL.Util.Suffixator = function (slist) {
    if (!slist) {
        slist = CSL.SUFFIX_CHARS;
    }
    this.slist = slist.split(",");
};

/**
 * The format method.
 * <p>This method is used in generating ranges.  Every numeric
 * formatter (of which Suffixator is one) must be an instantiated
 * object with such a "format" method.</p>
 */

CSL.Util.Suffixator.prototype.format = function (N) {
    // Many thanks to Avram Lyon for this code, and good
    // riddance to the several functions that it replaces.
    var X;
    N += 1;
    var key = "";
    do {
        X = ((N % 26) === 0) ? 26 : (N % 26);
        key = this.slist[X-1] + key;
        N = (N - X) / 26;
    } while ( N !== 0 );
    return key;
};


CSL.Engine.prototype.processNumber = function (node, ItemObject, variable) {
    var val;
    var me = this;

    // XXXX shadow_numbers should carry an array of objects with
    // XXXX full data for each. The test of a number should be
    // XXXX a separate function, possibly supported by a splitter
    // XXXX method also used here. Keep code for each action in one place,
    // XXXX to prevent debugging from becoming a nightmare.

    // The capture pattern below would apply affixes to all sub-elements,
    // which is not what we want. Sub-elements should nest within, or
    // affixes should be edited. The latter is probably easier to handle.
    
    // values = [
    //   {
    //     label: "sec.",
    //     label-form: "plural",
    //     value: 100,
    //     styling: [object],
    //     numeric: true
    //     joiningSuffix: " & ",
    //   },
    //   {
    //     label: "sec.",
    //     label-form: "none",
    //     value: 103,
    //     styling: [object],
    //     numeric: true,
    //     joiningSuffix: ""
    //   }
    // ]
    
    function normalizeFieldValue(str) {
        str = str.trim();
        var m = str.match(/^([^ ]+)/);
        if (m && !CSL.STATUTE_SUBDIV_STRINGS[m[1]]) {
            var embeddedLabel = null;
            if (variable === "locator" ) {
                if (ItemObject.label) {
                    embeddedLabel = CSL.STATUTE_SUBDIV_STRINGS_REVERSE[ItemObject.label];
                } else {
                    embeddedLabel = "p.";
                }
            } else {
                embeddedLabel = CSL.STATUTE_SUBDIV_STRINGS_REVERSE[variable];
            }
            if (embeddedLabel) {
                str = embeddedLabel + " " + str;
            }
        }
        return str;
    }
    

    function composeNumberInfo(origLabel, label, val, joiningSuffix) {
        joiningSuffix = joiningSuffix ? joiningSuffix : "";
        var info = {}, m;

        if (!label && !CSL.STATUTE_SUBDIV_STRINGS_REVERSE[variable]) {
                label = "var:"+variable;
        }
        
        if (label) {
            m = label.match(/(\s*)([^\s]*)(\s*)/);
            info.label = m[2];
            info.origLabel = origLabel;
            info.labelSuffix = m[3] ? m[3] : "";
            info.plural = 0;
            info.labelVisibility = false;
        }
        
        m = val.match(/^([a-zA-Z0]*)([0-9]+(?:[a-zA-Z]*|[-,a-zA-Z]+))$/);
        //var m = val.match(/^([a-zA-Z]0*)([0-9]+(?:[a-zA-Z]*|[-,a-zA-Z]+))$/);
        if (m) {
            info.particle = m[1];
            info.value = m[2];
        } else {
            info.particle = "";
            info.value = val;
        }
        info.joiningSuffix = joiningSuffix.replace(/\s*-\s*/, "-");
        return info;
    };

    function fixupSubsections(elems) {
        // This catches things like p. 12a-c, recombining content to yield
        // numeric true despite the hyphen.
        for (var i=elems.length-2;i>-1;i-=2) {
            if (elems[i] === "-"
               && elems[i-1].match(/^(?:(?:[a-z]|[a-z][a-z]|[a-z][a-z][a-z]|[a-z][a-z][a-z][a-z])\.  *)*[0-9]+[,a-zA-Z]+$/)
               && elems[i+1].match(/^[,a-zA-Z]+$/)) {
                elems[i-1] = elems.slice(i-1,i+2).join("");
                elems = elems.slice(0,i).concat(elems.slice(i+2));
            }
        }
        return elems;
    }

    function parseString(str, defaultLabel) {
        defaultLabel = defaultLabel ? defaultLabel : "";
        
        str = normalizeFieldValue(str, defaultLabel);

        // Split chunks and collate delimiters.
        var elems = [];
        var m = str.match(/(,\s+|\s*\\*[-\u2013]+\s*|\s*&\s*)/g);
        var lst, j, jlen;
        if (m) {
            lst = str.split(/(?:,\s+|\s*\\*[-\u2013]+\s*|\s*&\s*)/);
            for (var i=0,ilen=lst.length-1; i<ilen; i++) {
                elems.push(lst[i]);
                elems.push(m[i]);
            }
            elems.push(lst[lst.length-1]);
            //print("ELEMS: "+elems);
            elems = fixupSubsections(elems);
            //print("  fixup: "+elems);
        } else {
            elems = [str];
        }
        // Split elements within each chunk build list of value objects.
        var values = [];
        var label = defaultLabel;
        var origLabel = "";
        for (i=0,ilen=elems.length;i<ilen;i += 2) {
            m = elems[i].match(/((?:^| )(?:[a-z]|[a-z][a-z]|[a-z][a-z][a-z]|[a-z][a-z][a-z][a-z])\. *)/g);
            if (m) {
                lst = elems[i].split(/(?:(?:^| )(?:[a-z]|[a-z][a-z]|[a-z][a-z][a-z]|[a-z][a-z][a-z][a-z])\. *)/);
                // ZZZ
                //print("m="+JSON.stringify(m));
                //print("lst="+JSON.stringify(lst));
                // Head off disaster by merging parsed labels on non-numeric values into content
                for (j=lst.length-1;j>0;j--) {
                    // ZZZ
                    //print(j);
                    if (lst[j-1] && (!lst[j].match(/^[0-9]+([-,:a-zA-Z]*)$/) || !lst[j-1].match(/^[0-9]+([-,:a-zA-Z]*)$/))) {
                        lst[j-1] = lst[j-1] + m[j-1] + lst[j];
                        lst = lst.slice(0,j).concat(lst.slice(j+1))
                        m = m.slice(0,j-1).concat(m.slice(j))
                        // ZZZ
                        //print("  MERGE");
                        //print("  m="+JSON.stringify(m));
                        //print("  lst="+JSON.stringify(lst));
                    }
                }
                // merge bad leading label into content
                if (m.length > 0 && i === 0) {
                    var slug = m[0].trim();
                    if (!CSL.STATUTE_SUBDIV_STRINGS[slug]
                        || !me.getTerm(CSL.STATUTE_SUBDIV_STRINGS[slug])
                        || (["locator", "number"].indexOf(variable) === -1 && CSL.STATUTE_SUBDIV_STRINGS[slug] !== variable)) {
                        m = m.slice(1);
                        lst[0] = lst[0] + " " + slug + " " + lst[1];
                        lst = lst.slice(0,1).concat(lst.slice(2))
                    }
                }

                for (j=0,jlen=lst.length; j<jlen; j++) {
                    if (lst[j] || j === (lst.length-1)) {
                        label = m[j-1] ? m[j-1] : label;
                        origLabel = j > 1 ? m[j-1] : "";
                        str = lst[j] ? lst[j].trim() : "";
                        if (j === (lst.length-1)) {
                            values.push(composeNumberInfo(origLabel, label, str, elems[i+1]));
                        } else {
                            values.push(composeNumberInfo(origLabel, label, str));
                        }
                    }
                }
            } else {
                values.push(composeNumberInfo(origLabel, label, elems[i], elems[i+1]));
            }
        }
        return values;
    }

    function setSpaces(values) {
        // Add space joins (is this really right?)
        for (var i=0,ilen=values.length-1;i<ilen;i++) {
            if (!values[i].joiningSuffix && values[i+1].label) {
                values[i].joiningSuffix = " ";
            }
        }
    }

    function fixNumericAndCount(values, i, currentLabelInfo) {
        var master = values[currentLabelInfo.pos];
        var val = values[i].value;
        var isEscapedHyphen = master.joiningSuffix === "\\-";
        if (val.particle && val.particle !== master.particle) {
            currentLabelInfo.collapsible = false;
        }
        var mVal = val.match(/^[0-9]+([-,:a-zA-Z]*)$/);
        var mCurrentLabel = master.value.match(/^[0-9]+([-,:a-zA-Z]*)$/);
        if (!val || !mVal || !mCurrentLabel || isEscapedHyphen) {
            currentLabelInfo.collapsible = false;
            if (!val || !mCurrentLabel) {
                currentLabelInfo.numeric = false;
            }
            if (isEscapedHyphen) {
                currentLabelInfo.count--;
            }
        }
        if ((mVal && mVal[1]) || (mCurrentLabel && mCurrentLabel[1])) {
            currentLabelInfo.collapsible = false;
        }
        var isCollapsible = currentLabelInfo.collapsible;
        if (!isCollapsible && i>0 && val.match(/^[ivxlcmIVXLCM]+$/) && values[i-1].value.match(/^[ivxlcmIVXLCM]+$/)) {
            // spoof collapsible for roman numerals
            isCollapsible = true;
        }
        for (var j=currentLabelInfo.pos,jlen=values.length; j<jlen; j++) {
            if (currentLabelInfo.label === values[j].label && currentLabelInfo.count > 1 && isCollapsible) {
                values[j].plural = 1;
            }
            values[j].numeric = currentLabelInfo.numeric;
            values[j].collapsible = currentLabelInfo.collapsible;
        }
        currentLabelInfo.label = values[i].label;
        currentLabelInfo.count = 1;
        currentLabelInfo.pos = i;
        currentLabelInfo.numeric = true;
        currentLabelInfo.collapsible = true;
    }

    function setPluralsAndNumerics(values) {

        // XXX This is broken.
        // XXX Some numerics in complex strings are being skipped.

        var currentLabelInfo = {
            label: null,
            count: 1,
            numeric: true,
            collapsible: true,
            pos: 0
        }
        for (var i=0,ilen=values.length;i<ilen;i++) {
            if (values[i].label) {
                if (values[i].label === currentLabelInfo.label) {
                    currentLabelInfo.count++;
                } else {
                    fixNumericAndCount(values, i, currentLabelInfo);
                    // Special problem.
                    // If there are braces, we mostly want to suppress
                    // the master label. Always? Or only on locator?

                    if (currentLabelInfo.pos === 0) {
                        if (variable === "locator" || variable === "number") {
                            // Actually, shouldn't we do this always?
                            if (!me.getTerm(CSL.STATUTE_SUBDIV_STRINGS[currentLabelInfo.label]) && currentLabelInfo.label.slice(0, 4) !== "var:") {
                                values[currentLabelInfo.pos].labelVisibility = true;
                            }
                        }
                        // If there is an explicit
                        // label embedded at the start of a field that
                        // does not match the context, it should be
                        // marked for rendering.
                        if (["locator", "number"].indexOf(variable) === -1) {
                            // XXXX Needs one more thing here.
                            // If there is no term, force visibility.
                            if (CSL.STATUTE_SUBDIV_STRINGS[currentLabelInfo.label] !== variable && currentLabelInfo.label.slice(0, 4) !== "var:") {
                                values[0].labelVisibility = true;
                            }
                        }
                    } else {
                        // Also, mark initial mid-field labels for
                        // rendering.
                        if (values[i-1].label !== values[i].label && currentLabelInfo.label.slice(0, 4) !== "var:") {
                            values[currentLabelInfo.pos].labelVisibility = true;
                        }
                    }
                    
                }
            }
        }
        fixNumericAndCount(values, values.length-1, currentLabelInfo);
        if (values.length && values[0].numeric && variable.slice(0, 10) === "number-of-") {
            if (parseInt(ItemObject[variable], 10) > 1) {
                values[0].plural = 1;
            }
        }
        for (i=0,ilen=values.length;i<ilen;i++) {
            if (!values[i].numeric) {
                var origLabel = values[i].origLabel ? values[i].origLabel : "";
                values[i].value = (origLabel + values[i].value).trim();
                if (values[i].label !== values[0].label) {
                    values[i].label = "";
                }
            }
        }
    }        

    function setStyling(values) {
        var masterNode = CSL.Util.cloneToken(node);
        var masterStyling = new CSL.Token();
        if (!me.tmp.just_looking) {
            for (var j=masterNode.decorations.length-1;j>-1;j--) {
                if (masterNode.decorations[j][0] === "@quotes") {
                    // Add to styling
                    masterStyling.decorations = masterStyling.decorations.concat(masterNode.decorations.slice(j, j+1));
                    // Remove from node
                    masterNode.decorations = masterNode.decorations.slice(0, j).concat(masterNode.decorations.slice(j+1))
                }
            }
            masterStyling.strings.prefix = masterNode.strings.prefix;
            masterNode.strings.prefix = "";
            masterStyling.strings.suffix = masterNode.strings.suffix;
            masterNode.strings.suffix = "";
        }
        var masterLabel = values.length ? values[0].label : null;
        if (values.length) {
            for (var i=0,ilen=values.length; i<ilen; i++) {
                var val = values[i];
                // Clone node, make styling parameters on each instance sane.
                var newnode = CSL.Util.cloneToken(masterNode);
                newnode.gender = node.gender;
                if (masterLabel === val.label) {
                    newnode.formatter = node.formatter;
                }
                if (val.numeric) {
                    newnode.successor_prefix = val.successor_prefix;
                }
                newnode.strings.suffix = newnode.strings.suffix + stripHyphenBackslash(val.joiningSuffix);
                val.styling = newnode;
            }
            if (!me.tmp.just_looking) {
                if (values[0].value.slice(0,1) === "\"" && values[values.length-1].value.slice(-1) === "\"") {
                    values[0].value = values[0].value.slice(1);
                    values[values.length-1].value = values[values.length-1].value.slice(0,-1);
                    masterStyling.decorations.push(["@quotes", true]);
                }
            }
        }
        return masterStyling;
    }

    function stripHyphenBackslash(joiningSuffix) {
        return joiningSuffix.replace("\\-", "-");
    }

    function fixupRangeDelimiter(variable, val, rangeDelimiter, isNumeric) {
        var isPage = checkPage(variable, val);
        var hasTerm = checkTerm(variable, val);
        if (hasTerm && rangeDelimiter === "-") {
            if (isNumeric) {
                if (isPage || ["locator", "issue", "volume", "edition", "number"].indexOf(variable) > -1) {
                    rangeDelimiter = me.getTerm("page-range-delimiter")
                    if (!rangeDelimiter) {
                        rangeDelimiter = "\u2013";
                    }
                }
                if (variable === "collection-number") {
                    rangeDelimiter = me.getTerm("year-range-delimiter");
                    if (!rangeDelimiter) {
                        rangeDelimiter = "\u2013";
                    }
                }
            }
        }
        //if (rangeDelimiter === "\\-") {
        //    rangeDelimiter = "-";
        //}
        return rangeDelimiter;
    }

    function checkPage(variable, val) {
        return variable === "page" 
            || (variable === "locator" && (["p."].indexOf(val.label) > -1));
    }
    
    function checkTerm(variable, val) {
        var ret = true;
        if (variable === "locator") {
            ret = !!me.getTerm(CSL.STATUTE_SUBDIV_STRINGS[val.label]);
        }
        return ret;
    }

    function manglePageNumbers(values, i, currentInfo) {
        if (i<1) return;
        if (currentInfo.count !== 2) {
            return;
        }
        if (values[i-1].particle !== values[i].particle) {
            return;
        }
        if (values[i-1].joiningSuffix !== "-") {
            currentInfo.count = 1;
            return;
        }
        if (!me.opt["page-range-format"] && parseInt(values[i-1].value, 10) > parseInt(values[i].value, 10)) {
            values[i-1].joiningSuffix = fixupRangeDelimiter(variable, values[i], values[i-1].joiningSuffix, true);
            return;
        }
        var val = values[i];

        var isPage = checkPage(variable, val);

        if (isPage) {
            var str = values[i-1].particle + values[i-1].value + " - " + values[i].particle + values[i].value;
            str = me.fun.page_mangler(str);
        } else {
            str = values[i-1].value + stripHyphenBackslash(values[i-1].joiningSuffix) + values[i].value;
        }
        var m = str.match(/^([a-zA-Z]?0*)([0-9]+)(\s*[^0-9]+\s*)([-,a-zA-Z]?0*)([0-9]+)$/);
        if (m) {
            var rangeDelimiter = m[3];
            rangeDelimiter = fixupRangeDelimiter(variable, val, rangeDelimiter, values[i].numeric);
            values[i-1].particle = m[1];
            values[i-1].value = m[2];
            values[i-1].joiningSuffix = rangeDelimiter;
            values[i].particle = m[4];
            values[i].value = m[5];
        }
        currentInfo.count = 0;
    }
    
    function fixRanges(values) {
        if (!node) return;
        if (["page", "page-first", "chapter-number", "collection-number", "edition", "issue", "number", "number-of-pages", "number-of-volumes", "volume", "locator"].indexOf(variable) === -1) return;

        var currentInfo = {
            count: 0,
            label: null,
            lastHadRangeDelimiter: false
        }

        for (var i=0,ilen=values.length; i<ilen; i++) {
            var val = values[i];
            if (!val.collapsible) {
                currentInfo.count = 0;
                currentInfo.label = null;
                var isNumeric = val.numeric;
                if (i<(values.length-1) && !isNumeric && val.value.match(/^[ivxlcmIVXLCM]+$/) && values[i+1].value.match(/^[ivxlcmIVXLCM]+$/)) {
                    // spoof numeric for roman numerals
                    isNumeric = true;
                }
                val.joiningSuffix = fixupRangeDelimiter(variable, val, val.joiningSuffix, isNumeric);
            } else if (currentInfo.label === val.label && val.joiningSuffix === "-") {
                // So if there is a hyphen here, and none previous, reset to 1
                currentInfo.count = 1;
            } else if (currentInfo.label === val.label && val.joiningSuffix !== "-") {
                // If there is NO hyphen here, count up
                currentInfo.count++;
                if (currentInfo.count === 2) {
                    manglePageNumbers(values, i, currentInfo);
                }
            } else if (currentInfo.label !== val.label) {
                // If the label doesn't match and count is 2, process
                currentInfo.label = val.label;
                currentInfo.count = 1;
            } else {
                // Otherwise label doesn't match and count is some other value, so reset to 1
                currentInfo.count = 1;
                currentInfo.label = val.label;
            }
        }
        // Finally clear, if needed
        if (currentInfo.count === 2) {
            manglePageNumbers(values, values.length-1, currentInfo);
        }
    }

    function setVariableParams(shadow_numbers, variable, values) {
        var obj = shadow_numbers[variable];
        if (values.length) {
            obj.numeric = values[0].numeric;
            obj.collapsible = values[0].collapsible;
            obj.plural = values[0].plural;
            obj.label = CSL.STATUTE_SUBDIV_STRINGS[values[0].label];
            if (variable === "number" && obj.label === "issue" && me.getTerm("number")) {
                obj.label = "number";
            }
        }
    }

    // Split out the labels and values.

    // short-circuit if object exists: if numeric, set styling, no other action
    if (node && this.tmp.shadow_numbers[variable] && this.tmp.shadow_numbers[variable].values.length) {
        var values = this.tmp.shadow_numbers[variable].values;
        fixRanges(values);
        //if (!this.tmp.shadow_numbers[variable].masterStyling && !this.tmp.just_looking) {
            this.tmp.shadow_numbers[variable].masterStyling = setStyling(values);
        //}
        return;
    }

    // info.styling = node;

    // This carries value, pluralization and numeric info for use in other contexts.
    // XXX We used to use one set of params for the entire variable value.
    // XXX Now params are set on individual objects, of which there may be several after parsing.
    if (!this.tmp.shadow_numbers[variable]) {
        this.tmp.shadow_numbers[variable] = {
            values:[]
        };
    }
    //this.tmp.shadow_numbers[variable].values = [];
    //this.tmp.shadow_numbers[variable].plural = 0;
    //this.tmp.shadow_numbers[variable].numeric = false;
    //this.tmp.shadow_numbers[variable].label = false;

    if (!ItemObject) {
        return;
    }

    // Possibly apply multilingual transform
    var languageRole = CSL.LangPrefsMap[variable];
    if (languageRole) {
        var localeType = this.opt["cite-lang-prefs"][languageRole][0];
        val = this.transform.getTextSubField(ItemObject, variable, "locale-"+localeType, true);
        val = val.name;
    } else {
        val = ItemObject[variable];
    }

    // XXX HOLDING THIS
    // Apply short form ONLY if first element tests is-numeric=false
    if (val && this.sys.getAbbreviation) {
        // RefMe bug report: print("XX D'oh! (3): "+num);
        // true as the fourth argument suppresses update of the UI

        // No need for this.
        //val = ("" + val).replace(/^\"/, "").replace(/\"$/, "");

        var jurisdiction = this.transform.loadAbbreviation(ItemObject.jurisdiction, "number", val);
        if (this.transform.abbrevs[jurisdiction].number) {
            if (this.transform.abbrevs[jurisdiction].number[val]) {
                val = this.transform.abbrevs[jurisdiction].number[val];
            } else {
                // Strings rendered via cs:number should not be added to the abbreviations
                // UI unless they test non-numeric. The test happens below.
                if ("undefined" !== typeof this.transform.abbrevs[jurisdiction].number[val]) {
                    delete this.transform.abbrevs[jurisdiction].number[val];
                }
            }
        }
    }

    //   {
    //     label: "sec.",
    //     labelForm: "plural",
    //     labelVisibility: true,
    //     value: 100,
    //     styling: [object],
    //     numeric: true
    //     joiningSuffix: " & ",
    //   },

    // Process only if there is a value.
    if ("undefined" !== typeof val && ("string" === typeof val || "number" === typeof val)) {

        if ("number" === typeof val) {
            val = "" + val;
        }
        var defaultLabel = CSL.STATUTE_SUBDIV_STRINGS_REVERSE[variable];

        if (!this.tmp.shadow_numbers.values) {
            values = parseString(val, defaultLabel);
            //print("parseString(): "+JSON.stringify(values, null, 2));
            
            setSpaces(values);
            //print("setSpaces(): "+JSON.stringify(values, null, 2));

            setPluralsAndNumerics(values);
            //print("setPluralsAndNumerics(): "+JSON.stringify(values, null, 2));

            this.tmp.shadow_numbers[variable].values = values;

        }

        if (node) {
            fixRanges(values);
            this.tmp.shadow_numbers[variable].masterStyling = setStyling(values)
            //print("setStyling(): "+JSON.stringify(values, null, 2));
        }

        setVariableParams(this.tmp.shadow_numbers, variable, values);
        //print("OK "+JSON.stringify(values, ["label", "origLabel", "labelSuffix", "particle", "collapsible", "value", "numeric", "joiningSuffix", "labelVisibility", "plural"], 2));
    }
};

CSL.Util.outputNumericField = function(state, varname, itemID) {

    state.output.openLevel(state.tmp.shadow_numbers[varname].masterStyling);
    var nums = state.tmp.shadow_numbers[varname].values;
    var masterLabel = nums.length ? nums[0].label : null;
    var labelForm = state.tmp.shadow_numbers[varname].labelForm;
    var embeddedLabelForm;
    if (labelForm) {
        embeddedLabelForm = labelForm
    } else {
        embeddedLabelForm = "short";
    }
    var labelDecorations = state.tmp.shadow_numbers[varname].labelDecorations;
    var lastLabelName = null;
    for (var i=0,ilen=nums.length;i<ilen;i++) {
        var num = nums[i];
        var label = "";
        if (num.label) {
            var labelName;
            if ('var:' === num.label.slice(0,4)) {
                labelName = num.label.slice(4);
            } else {
                labelName = CSL.STATUTE_SUBDIV_STRINGS[num.label];
            }
            if (labelName) {
                if (num.label === masterLabel) {
                    label = state.getTerm(labelName, labelForm, num.plural);
                } else {
                    label = state.getTerm(labelName, embeddedLabelForm, num.plural);
                }
            }
        }
        var labelPlaceholderPos = -1;
        if (label) {
            labelPlaceholderPos = label.indexOf("%s");
        }
        var numStyling = CSL.Util.cloneToken(num.styling);
        numStyling.formatter = num.styling.formatter;
        numStyling.type = num.styling.type;
        numStyling.num = num.styling.num;
        numStyling.gender = num.styling.gender;
        if (labelPlaceholderPos > 0 && labelPlaceholderPos < (label.length-2)) {
            numStyling.strings.prefix += label.slice(0,labelPlaceholderPos);
            numStyling.strings.suffix = label.slice(labelPlaceholderPos+2) + numStyling.strings.suffix;
        } else if (num.labelVisibility) {
            if (!label) {
                label = num.label;
                labelName = num.label;
            }
            if (labelPlaceholderPos > 0) {
                var prefixLabelStyling = new CSL.Token();
                prefixLabelStyling.decorations = labelDecorations;
                state.output.append(label.slice(0,labelPlaceholderPos), prefixLabelStyling);
            } else if (labelPlaceholderPos === (label.length-2) || labelPlaceholderPos === -1) {
                // And add a trailing delimiter.
                state.output.append(label+num.labelSuffix, "empty");
            }
        }
        if (num.collapsible) {
            var blob;
            if (num.value.match(/^[0-9]+$/)) {
                blob = new CSL.NumericBlob(num.particle, parseInt(num.value, 10), numStyling, itemID);
            } else {
                blob = new CSL.NumericBlob(num.particle, num.value, numStyling, itemID);
            }
            if ("undefined" === typeof blob.gender) {
                blob.gender = state.locale[state.opt.lang]["noun-genders"][varname];
            }
            state.output.append(blob, "literal");
        } else {
            state.output.append(num.particle + num.value, numStyling)
        }
        if (labelPlaceholderPos === 0 && labelPlaceholderPos < (label.length-2)) {
            // Only and always if this is the last entry of this label
            if (lastLabelName === null) {
                lastLabelName = labelName;
            }
            if (labelName !== lastLabelName || i === (nums.length-1)) {
                var suffixLabelStyling = new CSL.Token();
                suffixLabelStyling.decorations = labelDecorations;
                state.output.append(label.slice(labelPlaceholderPos+2), suffixLabelStyling);
            }
        }
        lastLabelName === labelName;
    }
    state.output.closeLevel();
}
