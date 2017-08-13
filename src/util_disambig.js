
CSL.ambigConfigDiff = function(a, b) {
    var pos, len, ppos, llen;
    // return of true means the ambig configs differ
    if (a.names.length !== b.names.length) {
        //print("   (1)");
        return 1;
    } else {
        for (pos = 0, len = a.names.length; pos < len; pos += 1) {
            if (a.names[pos] !== b.names[pos]) {
        //print("   (2) "+a.names[pos]+" "+b.names[pos]);
                return 1;
            } else {
                for (ppos = 0, llen = a.givens[pos]; ppos < llen; ppos += 1) {
                    if (a.givens[pos][ppos] !== b.givens[pos][ppos]) {
        //print("   (3): "+a.givens[pos][ppos]+" "+b.givens[pos][ppos]+" "+pos+"/"+ppos+" "+b.givens[pos]);
                        return 1;
                    }
                }
            }
        }
    }
    if (a.disambiguate != b.disambiguate) {
        //print("   (4) "+a.disambiguate+" "+b.disambiguate);
        return 1;
    }
    if (a.year_suffix !== b.year_suffix) {
        //print("   (5) "+a.year_suffix+" "+b.year_suffix);
        return 1;
    }
    return 0;
};

CSL.cloneAmbigConfig = function (config, oldconfig) {
    var i, ilen, j, jlen, param;
    var ret = {};
    ret.names = [];
    ret.givens = [];
    ret.year_suffix = false;
    ret.disambiguate = false;
    for (i = 0, ilen = config.names.length; i < ilen; i += 1) {
        param = config.names[i];
        // Fixes update bug affecting plugins, without impacting
        // efficiency with update of large numbers of year-suffixed
        // items.
        ret.names[i] = param;
    }
    for (i  = 0, ilen = config.givens.length; i < ilen; i += 1) {
        param = [];
        for (j = 0, jlen = config.givens[i].length; j < jlen; j += 1) {
            // condition at line 312 of disambiguate.js protects against negative
            // values of j
            param.push(config.givens[i][j]);
        }
        ret.givens.push(param);
    }
    // XXXX Is this necessary at all?
    if (oldconfig) {
        ret.year_suffix = oldconfig.year_suffix;
        ret.disambiguate = oldconfig.disambiguate;
    } else {
        ret.year_suffix = config.year_suffix;
        ret.disambiguate = config.disambiguate;
    }
    return ret;
};

/**
 * Return current base configuration for disambiguation
 */
CSL.getAmbigConfig = function () {
    var config, ret;
    config = this.tmp.disambig_request;
    if (!config) {
        config = this.tmp.disambig_settings;
    }
    ret = CSL.cloneAmbigConfig(config);
    return ret;
};

/**
 * Return max values for disambiguation
 */
CSL.getMaxVals = function () {
    return this.tmp.names_max.mystack.slice();
};

/**
 * Return min value for disambiguation
 */
CSL.getMinVal = function () {
    return this.tmp["et-al-min"];
};
