/* global DATE_PARTS_ALL: true */

CSL.DateParser = new function () {

    /*
     * Fixed values
     */

    // jse imperial years
    var epochPairs = [
        ["\u660E\u6CBB", 1867],
        ["\u5927\u6B63", 1911],
        ["\u662D\u548C", 1925],
        ["\u5E73\u6210", 1988]
    ];

    // years by jse imperial epoch
    var epochYearByName = {};
    var val
    for (var i=0,ilen=epochPairs.length; i<ilen; i++) {
        var key = epochPairs[i][0];
        val = epochPairs[i][1];
        epochYearByName[key] = val;
    }
    
    var epochMatchStrings = [];
    for (i=0,ilen=epochPairs.length; i<ilen; i++) {
        val = epochPairs[i][0];
        epochMatchStrings.push(val);
    }
    var epochMatchString = epochMatchStrings.join("|");

    // regular expression to trap year name and year
    // (splitter and matcher, to cope with ancient JS implementations)
    var epochSplitter = new RegExp("(?:" + epochMatchString + ")(?:[0-9]+)");
    var epochMatcher = new RegExp("(?:" + epochMatchString + ")(?:[0-9]+)", "g");

    // regular expression for month or day kanji label
    var kanjiMonthDay = /(\u6708|\u5E74)/g;

    // regular expression for year kanji label
    var kanjiYear = /\u65E5/g;

    // regular expression for double-width Japanese range marker
    var kanjiRange = /\u301c/g;

    // parsing regexps for normalized strings
    //   raw materials
    var yearLast = "(?:[?0-9]{1,2}%%NUMD%%){0,2}[?0-9]{4}(?![0-9])";
    var yearFirst = "[?0-9]{4}(?:%%NUMD%%[?0-9]{1,2}){0,2}(?![0-9])";
    var numberVal = "[?0-9]{1,3}";
    var rangeSeparator = "[%%DATED%%]";
    var fuzzyChar = "[?~]";
    var chars = "[^\-\/\~\?0-9]+";
    var rexString = "(" + yearFirst + "|" + yearLast + "|" + numberVal + "|" + rangeSeparator + "|" + fuzzyChar + "|" + chars + ")";
    //   composed regexps
    var rexDash = new RegExp(rexString.replace(/%%NUMD%%/g, "-").replace(/%%DATED%%/g, "-"));
    var rexDashSlash = new RegExp(rexString.replace(/%%NUMD%%/g, "-").replace(/%%DATED%%/g, "\/"));
    var rexSlashDash = new RegExp(rexString.replace(/%%NUMD%%/g, "\/").replace(/%%DATED%%/g, "-"));

    /*
     * Mutable values
     */

    // months
    var monthString = "january february march april may june july august september october november december spring summer fall winter spring summer";
    this.monthStrings = monthString.split(" ");

    /*
     * Configuration functions
     */

    this.setOrderDayMonth = function() {
        // preferred ordering for numeric dates
        this.monthGuess = 1;
        this.dayGuess = 0;
    };

    this.setOrderMonthDay = function() {
        // preferred ordering for numeric dates
        this.monthGuess = 0;
        this.dayGuess = 1;
    };

    this.resetDateParserMonths = function() {
        // Function to reset months to default.
        this.monthSets = [];
        for (var i=0,ilen=this.monthStrings.length; i<ilen; i++) {
            this.monthSets.push([this.monthStrings[i]]);
        }
        this.monthAbbrevs = [];
        for (i=0,ilen=this.monthSets.length; i<ilen; i++) {
            this.monthAbbrevs.push([]);
            for (var j=0,jlen=this.monthSets[i].length; j<jlen; j++) {
                this.monthAbbrevs[i].push(this.monthSets[i][0].slice(0, 3));
            }
        }
        this.monthRexes = [];
        for (i=0,ilen=this.monthAbbrevs.length; i<ilen; i++) {
            this.monthRexes.push(new RegExp("(?:" + this.monthAbbrevs[i].join("|") + ")"));
        }
    };

    this.addDateParserMonths = function(lst) {
        // Extend list of months with an additional set of month abbreviations,
        // extending strings as required to resolve ambiguities.

        // Normalize string to list
        if ("string" === typeof lst) {
            lst = lst.split(/\s+/);
        }

        // Check that there are twelve (or sixteen) to add
        if (lst.length !== 12 && lst.length !== 16) {
            CSL.debug("month [+season] list of "+lst.length+", expected 12 or 16. Ignoring.");
            return;
        }

        // For each new month string ...
        for (var i=0,ilen=lst.length; i<ilen; i++) {
            var abbrevLength = null;
            var skip = false;
            var insert = 3;
            var extendedSets = {};
            var k, klen;
            for (var j=0,jlen=this.monthAbbrevs.length; j<jlen; j++) {
                extendedSets[j] = {};
                if (j === i) {
                    // Mark for skipping if same as an existing abbreviation of same month
                    for (k=0,klen=this.monthAbbrevs[i].length; k<klen; k++) {
                        if (this.monthAbbrevs[i][k] === lst[i].slice(0, this.monthAbbrevs[i][k].length)) {
                            skip = true;
                            break;
                        }
                    }
                } else {
                    // Mark for extending if same as existing abbreviation of any expression of another month
                    for (k=0,klen=this.monthAbbrevs[j].length; k<klen; k++) {
                        abbrevLength = this.monthAbbrevs[j][k].length;
                        if (this.monthAbbrevs[j][k] === lst[i].slice(0, abbrevLength)) {
                            while (this.monthSets[j][k].slice(0, abbrevLength) === lst[i].slice(0, abbrevLength)) {
                                // Abort when full length is hit, otherwise extend
                                if (abbrevLength > lst[i].length || abbrevLength > this.monthSets[j][k].length) {
                                    CSL.debug("unable to disambiguate month string in date parser: "+lst[i]);
                                    break;
                                } else {
                                    // Mark both new entry and existing abbrev for extension
                                    abbrevLength += 1;
                                }
                            }
                            insert = abbrevLength;
                            extendedSets[j][k] = abbrevLength;
                        }
                    }
                }
                for (var jKey in extendedSets) {
                    for (var kKey in extendedSets[jKey]) {
                        abbrevLength = extendedSets[jKey][kKey];
                        jKey = parseInt(jKey, 10);
                        kKey = parseInt(kKey, 10);
                        this.monthAbbrevs[jKey][kKey] = this.monthSets[jKey][kKey].slice(0, abbrevLength);
                    }
                }
            }
            // Insert here
            if (!skip) {
                this.monthSets[i].push(lst[i]);
                this.monthAbbrevs[i].push(lst[i].slice(0, insert));
            }
        }

        // Compose
        this.monthRexes = [];
        this.monthRexStrs = [];
        for (i=0,ilen=this.monthAbbrevs.length; i<ilen; i++) {
            this.monthRexes.push(new RegExp("^(?:" + this.monthAbbrevs[i].join("|") + ")"));
            this.monthRexStrs.push("^(?:" + this.monthAbbrevs[i].join("|") + ")");
        }
        if (this.monthAbbrevs.length === 18) {
            for (i=12,ilen=14; i<ilen; i++) {
                this.monthRexes[i+4] = new RegExp("^(?:" + this.monthAbbrevs[i].join("|") + ")");
                this.monthRexStrs[i+4] = "^(?:" + this.monthAbbrevs[i].join("|") + ")";
            }
        }
    };

    /*
     * Conversion functions
     */

    this.convertDateObjectToArray = function (thedate) {
        // Converts object in place and returns object
        thedate["date-parts"] = [];
        thedate["date-parts"].push([]);
        var slicelen = 0;
        for (var i=0,ilen=3; i<ilen; i++) {
            var part = ["year", "month", "day"][i];
            if (!thedate[part]) {
                break;
            }
            slicelen += 1;
            thedate["date-parts"][0].push(thedate[part]);
            delete thedate[part];
        }
        thedate["date-parts"].push([]);
        for (i=0, ilen=slicelen; i<ilen; i++) {
            part = ["year_end", "month_end", "day_end"][i];
            if (!thedate[part]) {
                break;
            }
            thedate["date-parts"][1].push(thedate[part]);
            delete thedate[part];
        }
        if (thedate["date-parts"][0].length !== thedate["date-parts"][1].length) {
            thedate["date-parts"].pop();
        }
        return thedate;
    };

    // XXXX String output is currently unable to represent ranges
    this.convertDateObjectToString = function(thedate) {
        // Returns string
        var ret = [];
        for (var i = 0, ilen = 3; i < ilen; i += 1) {
            if (thedate[DATE_PARTS_ALL[i]]) {
                ret.push(thedate[DATE_PARTS_ALL[i]]);
            } else {
                break;
            }
        }
        return ret.join("-");
    }

    /*
     * Utility function
     */

    this._parseNumericDate = function (ret, delim, suff, txt) {
        if (!suff) suff = "";
        var lst = txt.split(delim);
        
        for (var i=0, ilen=lst.length; i<ilen; i++) {
            if (lst[i].length === 4) {
                ret[("year" + suff)] = lst[i].replace(/^0*/, "");
                if (!i) {
                    lst = lst.slice(1);
                } else {
                    lst = lst.slice(0, i);
                }
                break;
            }
        }
        for (i=0,ilen=lst.length; i<ilen; i++) {
            lst[i] = parseInt(lst[i], 10);
        }
        if (lst.length === 1 || (lst.length === 2 && !lst[1])) {
            ret[("month" + suff)] = "" + lst[0];
        } else if (lst.length === 2) {
            if (lst[this.monthGuess] > 12) {
                ret[("month" + suff)] = "" + lst[this.dayGuess];
                ret[("day" + suff)] = "" + lst[this.monthGuess];
            } else {
                ret[("month" + suff)] = "" + lst[this.monthGuess];
                ret[("day" + suff)] = "" + lst[this.dayGuess];
            }
        }
    };

    /*
     * Parsing functions
     */

    this.parseDateToObject = function (txt) {
        //
        // Normalize the format and the year if it's a Japanese date
        //
        var orig = txt;
        var slashPos = -1;
        var dashPos = -1;
        var yearIsNegative = false;
        var lst;
        if (txt) {
            // If string leads with a minus sign, strip and memo it.
            if (txt.slice(0, 1) === "-") {
                yearIsNegative = true;
                txt = txt.slice(1);
            }
            
            // If string is a number of 1 to 3 characters only, treat as year.
            if (txt.match(/^[0-9]{1,3}$/)) {
                while (txt.length < 4) {
                    txt = "0" + txt;
                }
            }
            
            // Normalize to string
            txt = "" + txt;
            // Remove things that look like times
            txt = txt.replace(/\s*[0-9]{2}:[0-9]{2}(?::[0-9]+)/,"");
            var m = txt.match(kanjiMonthDay);
            if (m) {
                txt = txt.replace(/\s+/g, "");
                txt = txt.replace(kanjiYear, "");
                txt = txt.replace(kanjiMonthDay, "-");
                txt = txt.replace(kanjiRange, "/");
                txt = txt.replace(/\-\//g, "/");
                txt = txt.replace(/-$/g,"");

                // Tortuous workaround for IE6
                var slst = txt.split(epochSplitter);
                lst = [];
                var mm = txt.match(epochMatcher);
                if (mm) {
                    var mmx = [];
                    for (var i=0,ilen=mm.length; i<ilen; i++) {
                        mmx = mmx.concat(mm[i].match(/([^0-9]+)([0-9]+)/).slice(1));
                    }
                    for (i=0,ilen=slst.length; i<ilen; i++) {
                        lst.push(slst[i]);
                        // FIXME: Multiple undefined variables being used
                        // if (i !== (len - 1)) {
                        //     var mmpos = (pos * 2);
                        //     lst.push(mmx[mmpos]);
                        //     lst.push(mmx[mmpos + 1]);
                        // }
                    }
                } else {
                    lst = slst;
                }
                // workaround duly applied, this now works
                // FIXME: use of undefined variable
                // for (i=1,ilen=lst.length; i<ilen; i+=3) {
                //     lst[i + 1] = jiy[lst[i]] + parseInt(lst[i + 1], 10);
                //     lst[i] = "";
                // }
                txt = lst.join("");
                txt = txt.replace(/\s*-\s*$/, "").replace(/\s*-\s*\//, "/");
                //
                // normalize date and identify delimiters
                //
                txt = txt.replace(/\.\s*$/, "");

                // not sure what this is meant to do
                txt = txt.replace(/\.(?! )/, "");

                slashPos = txt.indexOf("/");
                dashPos = txt.indexOf("-");
            }
        }
        // drop punctuation from a.d., b.c.
        txt = txt.replace(/([A-Za-z])\./g, "$1");

        var number = "";
        var note = "";
        var thedate = {};
        var rangeDelim;
        var dateDelim;
        if (txt.slice(0, 1) === "\"" && txt.slice(-1) === "\"") {
            thedate.literal = txt.slice(1, -1);
            return thedate;
        }
        if (slashPos > -1 && dashPos > -1) {
            var slashCount = txt.split("/");
            if (slashCount.length > 3) {
                rangeDelim = "-";
                txt = txt.replace(/\_/g, "-");
                dateDelim = "/";
                lst = txt.split(rexSlashDash);
            } else {
                rangeDelim = "/";
                txt = txt.replace(/\_/g, "/");
                dateDelim = "-";
                lst = txt.split(rexDashSlash);
            }
        } else {
            txt = txt.replace(/\//g, "-");
            txt = txt.replace(/\_/g, "-");
            rangeDelim = "-";
            dateDelim = "-";
            lst = txt.split(rexDash);
        }
        var ret = [];
        for (i=0,ilen=lst.length; i<ilen; i++) {
            m = lst[i].match(/^\s*([\-\/]|[^\-\/\~\?0-9]+|[\-~?0-9]+)\s*$/);
            if (m) {
                ret.push(m[1]);
            }
        }
        //
        // Phase 2
        //
        var delimPos = ret.indexOf(rangeDelim);
        var delims = [];
        var isRange = false;
        if (delimPos > -1) {
            delims.push([0, delimPos]);
            delims.push([(delimPos + 1), ret.length]);
            isRange = true;
        } else {
            delims.push([0, ret.length]);
        }
        //
        // For each side of a range divide ...
        //
        var suff = "";
        
        for (i=0,ilen=delims.length; i<ilen; i++) {
            var delim = delims[i];
            //
            // Process each element ...
            //
            var date = ret.slice(delim[0], delim[1]);
            outer: 
            for (var j=0,jlen=date.length; j<jlen; j++) {
                var element = date[j];
                //
                // If it's a numeric date, process it.
                //
                if (element.indexOf(dateDelim) > -1) {
                    this._parseNumericDate(thedate, dateDelim, suff, element);
                    continue;
                }
                //
                // If it's an obvious year, record it.
                //
                if (element.match(/[0-9]{4}/)) {
                    thedate[("year" + suff)] = element.replace(/^0*/, "");
                    continue;
                }
                //
                // If it's a month, record it.
                //
                for (var k=0,klen=this.monthRexes.length; k<klen; k++) {
                    if (element.toLocaleLowerCase().match(this.monthRexes[k])) {
                        thedate[("month" + suff)] = "" + (parseInt(k, 10) + 1);
                        continue outer;
                    }
                }
                //
                // If it's a number, make a note of it
                //
                if (element.match(/^[0-9]+$/)) {
                    number = element;
                }
                //
                // If it's a BC or AD marker, make a year of
                // any note.  Separate, reverse the sign of the year
                // if it's BC.
                //
                if (element.toLocaleLowerCase().match(/^bc/) && number) {
                    thedate[("year" + suff)] = "" + (number * -1);
                    number = "";
                    continue;
                }
                if (element.toLocaleLowerCase().match(/^ad/) && number) {
                    thedate[("year" + suff)] = "" + number;
                    number = "";
                    continue;
                }
                //
                // If it's a fuzzy marker, record it.
                //
                if (element === "~" || element === "?" || element === "c" || element.match(/^cir/)) {
                    thedate.circa = "" + 1;
                    continue;
                }
                //
                // If it's cruft, make a note of it
                //
                if (element.toLocaleLowerCase().match(/(?:mic|tri|hil|eas)/) && !thedate[("season" + suff)]) {
                    note = element;
                    continue;
                }
            }
            //
            // If at the end of the string there's still a note
            // hanging around, make a day of it.
            //
            if (number) {
                thedate[("day" + suff)] = number;
                number = "";
            }
            //
            // If at the end of the string there's cruft lying
            // around, and the season field is empty, put the
            // cruft there.
            //
            if (note && !thedate[("season" + suff)]) {
                thedate[("season" + suff)] = note;
                note = "";
            }
            suff = "_end";
        }
        //
        // update any missing elements on each side of the divide
        // from the other
        //
        if (isRange) {
            for (j=0,jlen=CSL.DATE_PARTS_ALL.length; j<jlen; j++) {
                var item = CSL.DATE_PARTS_ALL[j];
                if (thedate[item] && !thedate[(item + "_end")]) {
                    thedate[(item + "_end")] = thedate[item];
                } else if (!thedate[item] && thedate[(item + "_end")]) {
                    thedate[item] = thedate[(item + "_end")];
                }
            }
        }
        //
        // If there's no year, or if there only a year and a day, it's a failure; pass through the literal
        //
        if (!thedate.year || (thedate.year && thedate.day && !thedate.month)) {
            thedate = { "literal": orig };
        }
        var parts = ["year", "month", "day", "year_end", "month_end", "day_end"];
        for (i=0,ilen=parts.length; i<ilen; i++) {
            var part = parts[i];
            if ("string" === typeof thedate[part] && thedate[part].match(/^[0-9]+$/)) {
                thedate[part] = parseInt(thedate[part], 10);
            }
            
        }
        if (yearIsNegative && Object.keys(thedate).indexOf("year") > -1) {
            thedate.year = (thedate.year * -1);
        }
        return thedate;
    };

    this.parseDateToArray = function(txt) {
        return this.convertDateObjectToArray(this.parseDateToObject(txt));            
    }

    this.parseDateToString = function(txt) {
        return this.convertDateObjectToString(this.parseDateToObject(txt));
    }
    
    this.parse = function(txt) {
        return this.parseDateToObject(txt);
    }
    
    /*

     * Setup
     */

    this.setOrderMonthDay();
    this.resetDateParserMonths();
};
