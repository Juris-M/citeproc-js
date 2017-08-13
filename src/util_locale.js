
CSL.localeResolve = function (langstr, defaultLocale) {
    var ret, langlst;
    if (!defaultLocale) {
        defaultLocale = "en-US";
    }
    if (!langstr) {
        langstr = defaultLocale;
    }
    ret = {};
    langlst = langstr.split(/[\-_]/);
    ret.base = CSL.LANG_BASES[langlst[0]];
    if ("undefined" === typeof ret.base) {
        return {base:defaultLocale, best:langstr, bare:langlst[0]};
    }
    if (langlst.length === 1) {
        ret.generic = true;
    }
    if (langlst.length === 1 || langlst[1] === "x") {
        ret.best = ret.base.replace("_", "-");
    } else {
        ret.best = langlst.slice(0, 2).join("-");
    }
    ret.base = ret.base.replace("_", "-");
    ret.bare = langlst[0];
    return ret;
};

// Use call to invoke this.
CSL.Engine.prototype.localeConfigure = function (langspec, beShy) {
    var localexml;
    if (beShy && this.locale[langspec.best]) {
        return;
    }
    localexml = CSL.setupXml(this.sys.retrieveLocale("en-US"));
    this.localeSet(localexml, "en-US", langspec.best);
    if (langspec.best !== "en-US") {
        if (langspec.base !== langspec.best) {
            localexml = CSL.setupXml(this.sys.retrieveLocale(langspec.base));
            this.localeSet(localexml, langspec.base, langspec.best);
        }
        localexml = CSL.setupXml(this.sys.retrieveLocale(langspec.best));
        this.localeSet(localexml, langspec.best, langspec.best);        
    }
    this.localeSet(this.cslXml, "", langspec.best);
    this.localeSet(this.cslXml, langspec.bare, langspec.best);
    if (langspec.base !== langspec.best) {
        this.localeSet(this.cslXml, langspec.base, langspec.best);
    }
    this.localeSet(this.cslXml, langspec.best, langspec.best);
    if ("undefined" === typeof this.locale[langspec.best].terms["page-range-delimiter"]) {
        if (["fr", "pt"].indexOf(langspec.best.slice(0, 2).toLowerCase()) > -1) {
            this.locale[langspec.best].terms["page-range-delimiter"] = "-";
        } else {
            this.locale[langspec.best].terms["page-range-delimiter"] = "\u2013";
        }
    }
    if ("undefined" === typeof this.locale[langspec.best].terms["year-range-delimiter"]) {
        this.locale[langspec.best].terms["year-range-delimiter"] = "\u2013";
    }
    if ("undefined" === typeof this.locale[langspec.best].terms["citation-range-delimiter"]) {
        this.locale[langspec.best].terms["citation-range-delimiter"] = "\u2013";
    }
    if (this.opt.development_extensions.normalize_lang_keys_to_lowercase) {
        var localeLists = ["default-locale","locale-sort","locale-translit","locale-translat"];
        for (var i=0,ilen=localeLists.length;i<ilen;i+=1) {
            for (var j=0,jlen=this.opt[localeLists[i]].length;j<jlen;j+=1) {
                this.opt[localeLists[i]][j] = this.opt[localeLists[i]][j].toLowerCase();
            }
        }
        this.opt.lang = this.opt.lang.toLowerCase();
    }
};
    
//
// XXXXX: Got it.  The locales objects need to be reorganized,
// with a top-level local specifier, and terms, opts, dates
// below.
//
CSL.Engine.prototype.localeSet = function (myxml, lang_in, lang_out) {
    var blob, locale, nodes, attributes, pos, term, form, termname, styleopts, date, attrname, len, genderform, target, i, ilen;
    lang_in = lang_in.replace("_", "-");
    lang_out = lang_out.replace("_", "-");

    if (this.opt.development_extensions.normalize_lang_keys_to_lowercase) {
        lang_in = lang_in.toLowerCase();
        lang_out = lang_out.toLowerCase();
    }

    if (!this.locale[lang_out]) {
        this.locale[lang_out] = {};
        this.locale[lang_out].terms = {};
        this.locale[lang_out].opts = {};
        // Set default skip words. Can be overridden in locale by attribute on style-options node.
        this.locale[lang_out].opts["skip-words"] = CSL.SKIP_WORDS;
        // Initialise leading noise word to false. Actual assignment is below. Empty by default, can be overridden in locale by attribute on style-options node.
        if (!this.locale[lang_out].opts["leading-noise-words"]) {
            this.locale[lang_out].opts["leading-noise-words"] = [];
        }
        this.locale[lang_out].dates = {};
        // For ordinals
        this.locale[lang_out].ord = {'1.0.1':false,keys:{}};
        this.locale[lang_out]["noun-genders"] = {};
    }

    //
    // Xml: Test if node is "locale" (nb: ns declarations need to be invoked
    // on every access to the xml object; bundle this with the functions
    //
    locale = myxml.makeXml();
    if (myxml.nodeNameIs(myxml.dataObj, 'locale')) {
        locale = myxml.dataObj;
    } else {
        //
        // Xml: get a list of all "locale" nodes
        //
        nodes = myxml.getNodesByName(myxml.dataObj, "locale");
        for (pos = 0, len = myxml.numberofnodes(nodes); pos < len; pos += 1) {
            blob = nodes[pos];
            //
            // Xml: get locale xml:lang
            //
            if (myxml.getAttributeValue(blob, 'lang', 'xml') === lang_in) {
                locale = blob;
                break;
            }
        }
    }
    //
    // Xml: get a list of any cs:type nodes within locale
    //
    nodes = myxml.getNodesByName(locale, 'type');
    for (i = 0, ilen = myxml.numberofnodes(nodes); i < ilen; i += 1) {
        var typenode = nodes[i];
        var type = myxml.getAttributeValue(typenode, 'name');
        var gender = myxml.getAttributeValue(typenode, 'gender');
        this.opt.gender[type] = gender;
    }
    //
    // Xml: get a list of term nodes within locale
    //

    // If we are setting CSL 1.0.1 ordinals inside a style, wipe the
    // slate clean and start over.
    var hasCslOrdinals101 = myxml.getNodesByName(locale, 'term', 'ordinal').length;
    if (hasCslOrdinals101) {
        for (var key in this.locale[lang_out].ord.keys) {
            delete this.locale[lang_out].terms[key];
        }
        this.locale[lang_out].ord = {"1.0.1":false,keys:{}};
    }

    nodes = myxml.getNodesByName(locale, 'term');
    // Collect ordinals info as for 1.0.1, but save only if 1.0.1 toggle triggers
    var ordinals101 = {"last-digit":{},"last-two-digits":{},"whole-number":{}};
    var ordinals101_toggle = false;
    var genderized_terms = {};
    for (pos = 0, len = myxml.numberofnodes(nodes); pos < len; pos += 1) {
        term = nodes[pos];
        //
        // Xml: get string value of attribute
        //
        termname = myxml.getAttributeValue(term, 'name');
        if (termname === "sub verbo") {
            termname = "sub-verbo";
        }
        if (termname.slice(0,7) === "ordinal") {
            if (termname === "ordinal") {
                ordinals101_toggle = true;
            } else {
                var match = myxml.getAttributeValue(term, 'match');
                var termstub = termname.slice(8);
                genderform = myxml.getAttributeValue(term, 'gender-form');
                if (!genderform) {
                    genderform = "neuter";
                }
                if (!match) {
                    match = "last-two-digits";
                    if (termstub.slice(0,1) === "0") {
                        match = "last-digit";
                    }
                }
                if (termstub.slice(0,1) === "0") {
                    termstub = termstub.slice(1);
                }
                if (!ordinals101[match][termstub]) {
                    ordinals101[match][termstub] = {};
                }
                ordinals101[match][termstub][genderform] = termname;
            }
            this.locale[lang_out].ord.keys[termname] = true;
        }
        if ("undefined" === typeof this.locale[lang_out].terms[termname]) {
            this.locale[lang_out].terms[termname] = {};
        }
        form = "long";
        genderform = false;
        //
        // Xml: get string value of form attribute, if any
        //
        if (myxml.getAttributeValue(term, 'form')) {
            form = myxml.getAttributeValue(term, 'form');
        }
        //
        // Xml: get string value of gender attribute, if any
        // 
        if (myxml.getAttributeValue(term, 'gender-form')) {
            genderform = myxml.getAttributeValue(term, 'gender-form');
        }
        //
        // Xml: set global gender assignment for variable associated
        // with term name
        // 
        if (myxml.getAttributeValue(term, 'gender')) {
            this.locale[lang_out]["noun-genders"][termname] = myxml.getAttributeValue(term, 'gender');
        }
        // Work on main segment or gender-specific sub-segment as appropriate
        if (genderform) {
            this.locale[lang_out].terms[termname][genderform] = {};
            this.locale[lang_out].terms[termname][genderform][form] = [];
            target = this.locale[lang_out].terms[termname][genderform];
            genderized_terms[termname] = true;
        } else {
            this.locale[lang_out].terms[termname][form] = [];
            target = this.locale[lang_out].terms[termname];
        }
        //
        // Xml: test of existence of node
        //
        if (myxml.numberofnodes(myxml.getNodesByName(term, 'multiple'))) {
            //
            // Xml: get string value of attribute, plus
            // Xml: get string value of node content
            //
            target[form][0] = myxml.getNodeValue(term, 'single');
            if (target[form][0].indexOf("%s") > -1) {
                this.opt.hasPlaceholderTerm = true;
            }
            //
            // Xml: get string value of attribute, plus
            // Xml: get string value of node content
            //
            target[form][1] = myxml.getNodeValue(term, 'multiple');
            if (target[form][1].indexOf("%s") > -1) {
                this.opt.hasPlaceholderTerm = true;
            }
        } else {
            //
            // Xml: get string value of attribute, plus
            // Xml: get string value of node content
            //
            target[form] = myxml.getNodeValue(term);
            if (target[form].indexOf("%s") > -1) {
                this.opt.hasPlaceholderTerm = true;
            }
        }
    }
    // If locale had a CSL 1.0.1-style ordinal definition, install the logic object
    // and iterate over gendered terms, filling in default values for use by getTerm.
    if (ordinals101_toggle) {
        for (var ikey in genderized_terms) {
            var gender_segments = {};
            var form_segments = 0;
            for (var jkey in this.locale[lang_out].terms[ikey]) {
                if (["masculine","feminine"].indexOf(jkey) > -1) {
                    gender_segments[jkey] = this.locale[lang_out].terms[ikey][jkey];
                } else {
                    form_segments += 1;
                }
            }
            if (!form_segments) {
                if (gender_segments.feminine) {
                    // Link each feminine form segment to default
                    // (no need to filter, these will not have gender segments mixed in)
                    for (jkey in gender_segments.feminine) {
                        this.locale[lang_out].terms[ikey][jkey] = gender_segments.feminine[jkey];
                    }
                } else if (gender_segments.masculine) {
                    // Otherwise link each masculine form segment to default 
                    for (jkey in gender_segments.masculine) {
                        this.locale[lang_out].terms[ikey][jkey] = gender_segments.masculine[jkey];
                    }
                }
            }
        }
        this.locale[lang_out].ord['1.0.1'] = ordinals101;
    }

    // Iterate over main segments, and fill in any holes in gender-specific data
    // sub-segments
    for (termname in this.locale[lang_out].terms) {
        for (i = 0, ilen = 2; i < ilen; i += 1) {
            genderform = CSL.GENDERS[i];
            if (this.locale[lang_out].terms[termname][genderform]) {
                for (form in this.locale[lang_out].terms[termname]) {
                    if (!this.locale[lang_out].terms[termname][genderform][form]) {
                        this.locale[lang_out].terms[termname][genderform][form] = this.locale[lang_out].terms[termname][form];
                    }
                }
            }
        }
    }
    //
    // Xml: get list of nodes by node type
    //
    nodes = myxml.getNodesByName(locale, 'style-options');
    for (pos = 0, len = myxml.numberofnodes(nodes); pos < len; pos += 1) {
        styleopts = nodes[pos];
        //
        // Xml: get list of attributes on a node
        //
        attributes = myxml.attributes(styleopts);
        for (attrname in attributes) {
            if (attributes.hasOwnProperty(attrname)) {
                if (attrname === "@punctuation-in-quote" || attrname === "@limit-day-ordinals-to-day-1") {
                    if (attributes[attrname] === "true") {
                        // trim off leading @
                        this.locale[lang_out].opts[attrname.slice(1)] = true;
                    } else {
                        // trim off leading @
                        this.locale[lang_out].opts[attrname.slice(1)] = false;
                    }
                } else if (attrname === "@jurisdiction-preference") {
                    var jurisdiction_preference = attributes[attrname].split(/\s*,\s*/);
                    this.locale[lang_out].opts[attrname.slice(1)] = jurisdiction_preference;
                } else if (attrname === "@skip-words") {
                    var skip_words = attributes[attrname].split(/\s*,\s*/);
                    this.locale[lang_out].opts[attrname.slice(1)] = skip_words;
                } else if (attrname === "@leading-noise-words") {
                    var val = attributes[attrname].split(/\s*,\s*/);
                    this.locale[lang_out].opts["leading-noise-words"] = val;
                } else if (attrname === "@name-as-sort-order") {
                    // Fallback is okay here.
                    this.locale[lang_out].opts["name-as-sort-order"] = {};
                    var lst = attributes[attrname].split(/\s+/);
                    for (i=0,ilen=lst.length;i<ilen;i+=1) {
                        this.locale[lang_out].opts["name-as-sort-order"][lst[i]] = true;
                    }
                } else if (attrname === "@name-as-reverse-order") {
                    // Fallback is okay here.
                    this.locale[lang_out].opts["name-as-reverse-order"] = {};
                    lst = attributes[attrname].split(/\s+/);
                    for (i=0,ilen=lst.length;i<ilen;i+=1) {
                        this.locale[lang_out].opts["name-as-reverse-order"][lst[i]] = true;
                    }
                } else if (attrname === "@name-never-short") {
                    // Here too.
                    this.locale[lang_out].opts["name-never-short"] = {};
                    lst = attributes[attrname].split(/\s+/);
                    for (i=0,ilen=lst.length;i<ilen;i+=1) {
                        this.locale[lang_out].opts["name-never-short"][lst[i]] = true;
                    }
                }
            }
        }
    }
    //
    // Xml: get list of nodes by type
    //
    nodes = myxml.getNodesByName(locale, 'date');
    for (pos = 0, len = myxml.numberofnodes(nodes); pos < len; pos += 1) {
        date = nodes[pos];
        //
        // Xml: get string value of attribute
        //
        this.locale[lang_out].dates[myxml.getAttributeValue(date, "form")] = date;
    }
};

