
/**
 * Date mangling functions.
 * @namespace Date construction utilities
 */
CSL.Util.Dates = {};

/**
 * Year manglers
 * <p>short, long</p>
 */
CSL.Util.Dates.year = {};

/**
 * Convert year to long form
 * <p>This just passes the number back as a string.</p>
 */
CSL.Util.Dates.year["long"] = function (state, num) {
    if (!num) {
        if ("boolean" === typeof num) {
            num = "";
        } else {
            num = 0;
        }
    }
    return num.toString();
};

/**
 * Crudely convert to Japanese Imperial form.
 * <p>Returns the result as a string.</p>
 */
CSL.Util.Dates.year.imperial = function (state, num, end) {
    var year;
    if (!num) {
        if ("boolean" === typeof num) {
            num = "";
        } else {
            num = 0;
        }
    }
    end = end ? "_end" : "";
    var month = state.tmp.date_object["month" + end];
    month = month ? ""+month : "1";
    while (month.length < 2) {
        month = "0" + month;
    }
    var day = state.tmp.date_object["day" + end];
    day = day ? ""+day : "1";
    while (day.length < 2) {
        day = "0" + day;
    }
    var date = parseInt(num + month + day, 10);
    var label;
    var offset;
    if (date >= 18680908 && date < 19120730) {
        label = '\u660e\u6cbb';
        offset = 1867;
    } else if (date >= 19120730 && date < 19261225) {
        label = '\u5927\u6b63';
        offset = 1911;
    } else if (date >= 19261225 && date < 19890108) {
        label = '\u662d\u548c';
        offset = 1925;
    } else if (date >= 19890108) {
        label = '\u5e73\u6210';
        offset = 1988;
    }
    if (label && offset) {
        if (!state.transform.abbrevs['default']['number'][label]) {
            state.transform.loadAbbreviation('default', "number", label);
        }
        if (state.transform.abbrevs['default']['number'][label]) {
            label = state.transform.abbrevs['default']['number'][label];
        };
        year = label + (num - offset);
    }
    return year;
};

/**
 * Convert year to short form
 * <p>Just crops any 4-digit year to the last two digits.</p>
 */
CSL.Util.Dates.year["short"] = function (state, num) {
    num = num.toString();
    if (num && num.length === 4) {
        return num.substr(2);
    }
};


/**
 * Convert year to short form
 * <p>Just crops any 4-digit year to the last two digits.</p>
 */
CSL.Util.Dates.year.numeric = function (state, num) {
    var m, pre;
    num = "" + num;
    m = num.match(/([0-9]*)$/);
    if (m) {
        pre = num.slice(0, m[1].length * -1);
        num = m[1];
    } else {
        pre = num;
        num = "";
    }
    while (num.length < 4) {
        num = "0" + num;
    }
    return (pre + num);
};


/*
 * MONTH manglers
 * normalize
 * long, short, numeric, numeric-leading-zeros
 */
CSL.Util.Dates.normalizeMonth = function (num, useSeason) {
    var ret;
    if (!num) {
        num = 0;
    }
    num = "" + num;
    if (!num.match(/^[0-9]+$/)) {
        num = 0;
    }
    num = parseInt(num, 10);
    if (useSeason) {
        var res = {stub: "month-", num: num};
        if (res.num < 1 || res.num > 20) {
            res.num = 0;
        } else if (res.num > 16) {
            res.stub = "season-";
            res.num = res.num - 16;
        } else if (res.num > 12) {
            res.stub = "season-";
            res.num = res.num - 12;
        }
        ret = res;
    } else {
        if (num < 1 || num > 12) {
            num = 0;
        }
        ret = num;
    }
    return ret;
}

CSL.Util.Dates.month = {};

/**
 * Convert month to numeric form
 * <p>This just passes the number back as a string.</p>
 */
CSL.Util.Dates.month.numeric = function (state, num) {
    num = CSL.Util.Dates.normalizeMonth(num);
    if (!num) {
        num = "";
    }
    return num;
};

/**
 * Convert month to numeric-leading-zeros form
 * <p>This just passes the number back as string padded with zeros.</p>
 */
CSL.Util.Dates.month["numeric-leading-zeros"] = function (state, num) {
    num = CSL.Util.Dates.normalizeMonth(num);
    if (!num) {
        num = "";
    } else {
        num = "" + num;
        while (num.length < 2) {
            num = "0" + num;
        }
    }
    return num;
};

/**
 * Convert month to long form
 * <p>This passes back the month of the locale in long form.</p>
 */

// Gender is not currently used. Is it needed?

CSL.Util.Dates.month["long"] = function (state, num, gender, forceDefaultLocale) {
    var res = CSL.Util.Dates.normalizeMonth(num, true);
    num = res.num;
    if (!num) {
        num = "";
    } else {
        num = "" + num;
        while (num.length < 2) {
            num = "0" + num;
        }
        num = state.getTerm(res.stub + num, "long", 0, 0, false, forceDefaultLocale);
    }
    return num;
};

/**
 * Convert month to long form
 * <p>This passes back the month of the locale in short form.</p>
 */

// See above.

CSL.Util.Dates.month["short"] = function (state, num, gender, forceDefaultLocale) {
    var res = CSL.Util.Dates.normalizeMonth(num, true);
    num = res.num;
    if (!num) {
        num = "";
    } else {
        num = "" + num;
        while (num.length < 2) {
            num = "0" + num;
        }
        num = state.getTerm(res.stub + num, "short", 0, 0, false, forceDefaultLocale);
    }
    return num;
};

/*
 * DAY manglers
 * numeric, numeric-leading-zeros, ordinal
 */
CSL.Util.Dates.day = {};

/**
 * Convert day to numeric form
 * <p>This just passes the number back as a string.</p>
 */
CSL.Util.Dates.day.numeric = function (state, num) {
    return num.toString();
};

CSL.Util.Dates.day["long"] = CSL.Util.Dates.day.numeric;

/**
 * Convert day to numeric-leading-zeros form
 * <p>This just passes the number back as a string padded with zeros.</p>
 */
CSL.Util.Dates.day["numeric-leading-zeros"] = function (state, num) {
    if (!num) {
        num = 0;
    }
    num = num.toString();
    while (num.length < 2) {
        num = "0" + num;
    }
    return num.toString();
};

/**
 * Convert day to ordinal form
 * <p>This will one day pass back the number as a string with the
 * ordinal suffix appropriate to the locale.  For the present,
 * it just does what is most of the time right for English.</p>
 */
CSL.Util.Dates.day.ordinal = function (state, num, gender) {
    return state.fun.ordinalizer.format(num, gender);
};
