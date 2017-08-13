
/**
 * Helper functions for constructing sort keys.
 * @namespace Sort key utilities
 */
CSL.Util.Sort = {};

/**
 * Strip prepositions from a string
 * <p>Used when generating sort keys.</p>
 */
CSL.Util.Sort.strip_prepositions = function (str) {
    var m;
    if ("string" === typeof str) {
        m = str.toLocaleLowerCase();
        m = str.match(/^((a|an|the)\s+)/);
    }
    if (m) {
        str = str.substr(m[1].length);
    }
    return str;
};
