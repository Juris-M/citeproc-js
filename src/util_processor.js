
CSL.substituteOne = function (template) {
    return function (state, list) {
        if (!list) {
            return "";
        } else {
            // ("string" === typeof list)
            return template.replace("%%STRING%%", list);
        }
    };
};


/**
 * Two-tiered substitutions gadget.
 * <p>This is used for
 * options like (now defunct) "font-family", where the option value
 * cannot be determined until the attribute is processed.
 * Need for this function might be reviewed at some point ...</p>
 * @param {String} template A template containing
 * <code>%%STRING%%</code> and <code>%%PARAM%%</code>
 * placeholders.  See {@link CSL.Output.Formats.html} for
 * examples.
 */
CSL.substituteTwo = function (template) {
    return function (param) {
        var template2 = template.replace("%%PARAM%%", param);
        return function (state, list) {
            if (!list) {
                return "";
            } else {
                //("string" === typeof list){
                return template2.replace("%%STRING%%", list);
            }
        };
    };
};

/**
 * Generate string functions for designated output mode.
 * <p>Only "html" (the default) is supported at present.</p>
 * @param {String} mode Either "html" or "rtf", eventually.
 */
CSL.Mode = function (mode) {
    var decorations, params, param, func, val, args;
    decorations = {};
    params = CSL.Output.Formats[mode];
    for (param in params) {
        if ("@" !== param.slice(0, 1)) {
            decorations[param] = params[param];
            continue;
        }
        func = false;
        val = params[param];
        args = param.split('/');

        if (typeof val === "string" && val.indexOf("%%STRING%%") > -1)  {
            if (val.indexOf("%%PARAM%%") > -1) {
                func = CSL.substituteTwo(val);
            } else {
                func = CSL.substituteOne(val);
            }
        } else if (typeof val === "boolean" && !val) {
            func = CSL.Output.Formatters.passthrough;
        } else if (typeof val === "function") {
            func = val;
        } else {
            throw "CSL.Compiler: Bad " + mode + " config entry for " + param + ": " + val;
        }

        if (args.length === 1) {
            decorations[args[0]] = func;
        } else if (args.length === 2) {
            if (!decorations[args[0]]) {
                decorations[args[0]] = {};
            }
            decorations[args[0]][args[1]] = func;
        }
    }
    return decorations;
};


/**
 * Generate a separate list of formatting attributes.
 * <p>This generates a list of tuples containing attribute
 * information relevant to output formatting, in the order
 * fixed in the constant {@link CSL.FORMAT_KEY_SEQUENCE}.
 * This function is called during {@link CSL.Core.Build}.
 * Formatting hints are distilled to functions
 * later, in the second compilation pass ({@link CSL.Core.Configure}).</p>
 * @param {Object} state The state object returned by
 * {@link CSL.Engine}.
 * @param {Object} attributes The hash object containing
 * the attributes and values extracted from an XML node.
 */
CSL.setDecorations = function (state, attributes) {
    var ret, key, pos;
    // This applies a fixed processing sequence
    ret = [];
    for (pos in CSL.FORMAT_KEY_SEQUENCE) {
        key = CSL.FORMAT_KEY_SEQUENCE[pos];
        if (attributes[key]) {
            ret.push([key, attributes[key]]);
            delete attributes[key];
        }
    }
    return ret;
};

CSL.Doppeler = function(rexStr, stringMangler) {
    this.split = split;
    this.join = join;
    var matchRex = new RegExp("(" + rexStr + ")", "g");
    var splitRex = new RegExp(rexStr, "g");
    function split(str) {
        // Normalize markup
        if (stringMangler) {
            str = stringMangler(str);
        }
        var match = str.match(matchRex);
        if (!match) {
            return {
                tags: [],
                strings: [str]
            };
        }
        var split = str.split(splitRex);
        return {
            tags: match,
            strings: split,
            origStrings: split.slice()
        }
    }
    function join(obj) {
        var lst = obj.strings.slice(-1);
        for (var i=obj.tags.length-1; i>-1; i--) {
            lst.push(obj.tags[i]);
            lst.push(obj.strings[i]);
        }
        lst.reverse();
        return lst.join("");
    }
}

CSL.Engine.prototype.normalDecorIsOrphan = function (blob, params) {
    //print("params: "+JSON.stringify(params));
    if (params[1] === "normal") {
        var use_param = false;
        var all_the_decor;
        if (this.tmp.area === "citation") {
            all_the_decor = [this.citation.opt.layout_decorations].concat(blob.alldecor);
        } else {
            all_the_decor = blob.alldecor;
        }
        for (var k = all_the_decor.length - 1; k > -1; k += -1) {
            //print("  all decor: "+JSON.stringify(all_the_decor[k]));
            for (var n = all_the_decor[k].length - 1; n > -1; n += -1) {
                //print("  superior param"+n+": "+all_the_decor[k][n][0]);
                if (all_the_decor[k][n][0] === params[0]) {
                    //print("  HIT!");
                    if (all_the_decor[k][n][1] !== "normal") {
                        use_param = true;
                    }
                }
            }
        }
        if (!use_param) {
            return true;
        }
    }
    return false;
};


CSL.getJurisdictionNameAndSuppress = function(state, jurisdictionID, jurisdictionName) {
    // Jurisdiction suppression works by removing the registered
    // elements from the front of a (little-endian) human-readable
    // representation of the jurisdiction code.
    //
    // jurisdictionID is a jurisdiction code. getHumanForm(jurisdictionID)
    // fetches its human-readable counterpart. The respective
    // elements have the following form:
    //   vn                    Viet Nam|VN           (lone country code)
    //   vn:hung.yen           VN|Hưng Yên           (first-level subjurisdiction)
    //   vn:hung.yen:kim.dong  VN|Hưng Yên|Kim Động  (second-level subjurisdiction)
    // 
    // For compactness, the full country name is truncated in the human-readable
    // form of subjurisdictions. lone-country and first-level entries can be
    // distinguished in the machine-readable form, but require different
    // suppression operations in the human-readable form.
    //
    // The above applies to the headline entry. Variants are allowed,
    // so that a jurisdiction can be shown in native-language or in English
    // (say). Variants are hand-coded strings. If valid according to the
    // schema above, they are truncated by jurisdiction suppression, in
    // the same way. If NOT valid, they are returned verbatim.

    var ret = null;

    if (!jurisdictionName) {
        // If a variant, jurisdictionName is already defined.
        jurisdictionName = state.sys.getHumanForm(jurisdictionID);
    }
    if (!jurisdictionName) {
        // Protect against undefined jurisdiction. This should never happen.
        ret = jurisdictionID;
    } else {
        // Split name and code to lists.
        var code = jurisdictionID.split(":");
        var name = jurisdictionName.split("|");
        // Validate code and name pair.
        var valid = false;
        if (code.length === 1 && name.length === 2) {
            valid = true;
        } else if (code.length > 1 && name.length === code.length) {
            valid = true;
        }
        // If invalid, return human-readable string untouched.
        if (!valid) {
            ret = name.join("|");
        } else {
            // Get the mask, if any.
            var mask = 0;
            var stub;
            for (var i=0,ilen=code.length;i<ilen;i++) {
                stub = code.slice(0, i+1).join(":");
                if (state.opt.suppressedJurisdictions[stub]) {
                    mask = (i+1);
                }
            }
            // Apply mask to human-readable string.
            if (mask === 0) {
                if (code.length === 1) {
                    ret = name[0];
                } else {
                    ret = name.join("|");
                }
            } else if (mask === 1) {
                if (code.length === 1) {
                    ret = "";
                } else {
                    ret = name.slice(mask).join("|");
                }
            } else {
                // if mask > 1, always code.length > 1
                ret = name.slice(mask).join("|");
            }
        }
    }
    return ret;
}
