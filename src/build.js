
CSL.Engine = function (sys, style, lang, forceLang) {
    var attrs, langspec;
    this.processor_version = CSL.PROCESSOR_VERSION;
    this.csl_version = "1.0";
    this.sys = sys;
    // XXX This may be excess code. Given the normalization performed on
    // XXX the output queue before variableWrapper() is run, a single
    // XXX space should be the most cruft that we ever see before a variable.
    if (sys.variableWrapper) {
        CSL.VARIABLE_WRAPPER_PREPUNCT_REX = new RegExp('^([' + [" "].concat(CSL.SWAPPING_PUNCTUATION).join("") + ']*)(.*)');
    }
    // XXXX This should be restored -- temporarily suspended for testing of JSON style support.
    if (CSL.retrieveStyleModule) {
        this.sys.retrieveStyleModule = CSL.retrieveStyleModule;
    }
    if (CSL.getAbbreviation) {
        this.sys.getAbbreviation = CSL.getAbbreviation;
    }
    if (this.sys.stringCompare) {
        CSL.stringCompare = this.sys.stringCompare;
    }
    this.sys.AbbreviationSegments = CSL.AbbreviationSegments;
    this.parallel = new CSL.Parallel(this);
    //this.parallel.use_parallels = true;

    this.transform = new CSL.Transform(this);
    // true or false
    this.setParseNames = function (val) {
        this.opt['parse-names'] = val;
    };
    
    this.opt = new CSL.Engine.Opt();
    this.tmp = new CSL.Engine.Tmp();
    this.build = new CSL.Engine.Build();
    this.fun = new CSL.Engine.Fun(this);

    this.configure = new CSL.Engine.Configure();
    // Build citation before citation_sort in order to pick up
    // state.opt.update_mode, needed it determine whether
    // a grouped sort should be performed.
    this.citation_sort = new CSL.Engine.CitationSort();
    this.bibliography_sort = new CSL.Engine.BibliographySort();
    this.citation = new CSL.Engine.Citation(this);
    this.bibliography = new CSL.Engine.Bibliography();

    this.output = new CSL.Output.Queue(this);

    //this.render = new CSL.Render(this);
    //
    // This latter queue is used for formatting date chunks
    // before they are folded back into the main queue.
    //
    this.dateput = new CSL.Output.Queue(this);

    this.cslXml = CSL.setupXml(style);

    if (this.opt.development_extensions.csl_reverse_lookup_support || this.sys.csl_reverse_lookup_support) {
        this.build.cslNodeId = 0;
        this.setCslNodeIds = function(myxml, nodename) {
            var children = this.cslXml.children(myxml);
            this.cslXml.setAttribute(myxml, 'cslid', this.build.cslNodeId);
            this.opt.nodenames.push(nodename);
            this.build.cslNodeId += 1;
            for (var i = 0, ilen = this.cslXml.numberofnodes(children); i < ilen; i += 1) {
                nodename = this.cslXml.nodename(children[i]);
                if (nodename) {
                    this.setCslNodeIds(children[i], nodename);
                }
            }
        };
        this.setCslNodeIds(this.cslXml.dataObj, "style");
    }
    this.cslXml.addMissingNameNodes(this.cslXml.dataObj);
    this.cslXml.addInstitutionNodes(this.cslXml.dataObj);
    this.cslXml.insertPublisherAndPlace(this.cslXml.dataObj);
    this.cslXml.flagDateMacros(this.cslXml.dataObj);
    //
    // Note for posterity: tried manipulating the XML here to insert
    // a list of the upcoming date-part names.  The object is apparently
    // read-only.  Don't know why, can't find any reference to this
    // problem on the Net (other than casual mentions that it works,
    // which it doesn't, at least in Rhino).  Turning to add this info
    // in the compile phase, in the flattened version of the style,
    // which should be simpler anyway.
    //

    attrs = this.cslXml.attributes(this.cslXml.dataObj);
    if ("undefined" === typeof attrs["@sort-separator"]) {
        this.cslXml.setAttribute(this.cslXml.dataObj, "sort-separator", ", ");
    }

    //if ("undefined" === typeof attrs["@name-delimiter"]) {
    //    this.sys.xml.setAttribute(this.cslXml, "name-delimiter", ", ");
    //}

    this.opt["initialize-with-hyphen"] = true;

    //
    // implicit default, "en"
    //
    // We need to take this in layered functions.  This function goes
    // once, right here, with the lang argument.  It calls a function
    // that resolves the lang argument into a full two-part language
    // entry.  It calls a function that (1) checks to see if
    // the two-part target language is available on the CSL.locale
    // branch, and (2) if not, sets from ultimate default, then (3) from
    // single-term language (if available), then (4) from two-term language.
    // It does this all twice, once for locale files, then for locales inside
    // the style file.
    //
    // So functions needed are ... ?
    //
    // setLocale(rawLang) [top-level]
    //   localeResolve(rawLang)
    //   [function below is not run for external locales
    //   if two-part lang exists in CSL.locale; it is always
    //   run for in-CSL locale data, if it exists.]
    //   localeSetFromXml(lang,localeHandler)
    //
    // (getHandler arg is a function with two methods, one to
    // get XML from disk file, or from CSL, and another to store
    // locale data on CSL.locale or on state.locale, depending
    // on its source.)
    //
    // (note that getLocale must fail gracefully
    // if no locale of the exact lang in the first
    // arg is available.)
    //
    // (note that this will require that the hard-coded locale
    // be recorded on CSL.locale, and that ephemeral locale
    // overlay data bet recorded on state.locale, and that
    // getTerm implement overlay behavior.)
    //

    // Refactored locale resolution
    //
    // (1) Get three locale strings 
    //     -- default-locale (stripped)
    //     -- processor-locale
    //     -- en_US
    
    this.setStyleAttributes();

    this.opt.xclass = this.cslXml.getAttributeValue(this.cslXml.dataObj, "class");
    this.opt["class"] = this.opt.xclass;
    this.opt.styleID = this.cslXml.getStyleId(this.cslXml.dataObj);
    if (CSL.setSuppressedJurisdictions) {
        CSL.setSuppressedJurisdictions(this.opt.styleID, this.opt.suppressedJurisdictions);
    }
    this.opt.styleName = this.cslXml.getStyleId(this.cslXml.dataObj, true);

    if (this.opt.version.slice(0,4) === "1.1m") {
        this.opt.development_extensions.static_statute_locator = true;
        this.opt.development_extensions.handle_parallel_articles = true;
        this.opt.development_extensions.main_title_from_short_title = true;
        this.opt.development_extensions.rtl_support = true;
        this.opt.development_extensions.expect_and_symbol_form = true;
        this.opt.development_extensions.require_explicit_legal_case_title_short = true;
        this.opt.development_extensions.force_jurisdiction = true;
    }
    // We seem to have two language specs flying around:
    //   this.opt["default-locale"], and this.opt.lang
    // Keeping them aligned for safety's sake, pending
    // eventual cleanup.
    if (lang) {
        lang = lang.replace("_", "-");
        lang = CSL.normalizeLocaleStr(lang);
    }
    if (this.opt["default-locale"][0]) {
        this.opt["default-locale"][0] = this.opt["default-locale"][0].replace("_", "-");
        this.opt["default-locale"][0] = CSL.normalizeLocaleStr(this.opt["default-locale"][0]);
    }
    if (lang && forceLang) {
        this.opt["default-locale"] = [lang];
    }
    if (lang && !forceLang && this.opt["default-locale"][0]) {
        lang = this.opt["default-locale"][0];
    }
    if (this.opt["default-locale"].length === 0) {
        if (!lang) {
            lang = "en-US";
        }
        this.opt["default-locale"].push("en-US");
    }
    if (!lang) {
        lang = this.opt["default-locale"][0];
    }
    langspec = CSL.localeResolve(lang);
    this.opt.lang = langspec.best;
    this.opt["default-locale"][0] = langspec.best;
    this.locale = {};
    if (!this.opt["default-locale-sort"]) {
        this.opt["default-locale-sort"] = this.opt["default-locale"][0];
    }
    // Test processor against JS engine locale mess to find a field separator that works
    if ('dale|'.localeCompare('daleb', this.opt["default-locale-sort"]) > -1) {
        this.opt.sort_sep = "@";
    } else {
        this.opt.sort_sep = "|";
    }
    this.localeConfigure(langspec);

    // Build skip-word regexp
    function makeRegExp(lst) {
        lst = lst.slice();
        var ret = new RegExp( "(?:(?:[?!:]*\\s+|-|^)(?:" + lst.join("|") + ")(?=[!?:]*\\s+|-|$))", "g");
        return ret;
    }
    this.locale[this.opt.lang].opts["skip-words-regexp"] = makeRegExp(this.locale[this.opt.lang].opts["skip-words"]);

    this.output.adjust = new CSL.Output.Queue.adjust(this.getOpt('punctuation-in-quote'));

    this.registry = new CSL.Registry(this);

    // XXX For modular jurisdiction support, parameterize buildTokenLists().
    // XXX Feed as arguments:
    // XXX * actual node to be walked (cslXml)
    // XXX * actual target array

    this.macros = {};

    this.build.area = "citation";
    var area_nodes = this.cslXml.getNodesByName(this.cslXml.dataObj, this.build.area);
    this.buildTokenLists(area_nodes, this[this.build.area].tokens);

    this.build.area = "bibliography";
    area_nodes = this.cslXml.getNodesByName(this.cslXml.dataObj, this.build.area);
    this.buildTokenLists(area_nodes, this[this.build.area].tokens);

    this.juris = {};

    this.configureTokenLists();

    this.disambiguate = new CSL.Disambiguation(this);

    this.splice_delimiter = false;

    //
    // date parser
    //
    this.fun.dateparser = CSL.DateParser;
    //
    // flip-flopper for inline markup
    //
    this.fun.flipflopper = new CSL.Util.FlipFlopper(this);
    //
    // utility functions for quotes
    //
    this.setCloseQuotesArray();
    //
    // configure ordinal numbers generator
    //
    this.fun.ordinalizer.init(this);
    //
    // configure long ordinal numbers generator
    //
    this.fun.long_ordinalizer.init(this);
    //
    // set up page mangler
    //
    this.fun.page_mangler = CSL.Util.PageRangeMangler.getFunction(this, "page");
    this.fun.year_mangler = CSL.Util.PageRangeMangler.getFunction(this, "year");

    this.setOutputFormat("html");
};

CSL.Engine.prototype.setCloseQuotesArray = function () {
    var ret;
    ret = [];
    ret.push(this.getTerm("close-quote"));
    ret.push(this.getTerm("close-inner-quote"));
    ret.push('"');
    ret.push("'");
    this.opt.close_quotes_array = ret;
};

CSL.makeBuilder = function (me, target) {
    function enterFunc (node) {
        CSL.XmlToToken.call(node, me, CSL.START, target);
    };
    function leaveFunc (node) {
        CSL.XmlToToken.call(node, me, CSL.END, target);
    };
    function singletonFunc (node) {
        CSL.XmlToToken.call(node, me, CSL.SINGLETON, target);
    };
    function buildStyle (node) {
        var origparent;
        if (me.cslXml.numberofnodes(me.cslXml.children(node))) {
            origparent = node;
            enterFunc(origparent);
            for (var i=0;i<me.cslXml.numberofnodes(me.cslXml.children(origparent));i+=1) {
                node = me.cslXml.children(origparent)[i];
                if (me.cslXml.nodename(node) === null) {
                    continue;
                }
                if (me.cslXml.nodename(node) === "date") {
                    CSL.Util.fixDateNode.call(me, origparent, i, node)
                    node = me.cslXml.children(origparent)[i];
                }
                buildStyle(node, enterFunc, leaveFunc, singletonFunc);
            }
            leaveFunc(origparent);
        } else {
            singletonFunc(node);
        }
    }
    return buildStyle;
};


CSL.Engine.prototype.buildTokenLists = function (area_nodes, target) {
    if (!this.cslXml.getNodeValue(area_nodes)) return;
    var builder = CSL.makeBuilder(this, target);
    var mynode;
    if ("undefined" === typeof area_nodes.length) {
        mynode = area_nodes;
    } else {
        mynode = area_nodes[0];
    }
    builder(mynode);
};


CSL.Engine.prototype.setStyleAttributes = function () {
    // Protect against DOM engines that deliver a top-level document
    // (needed for createElement) that does not contain our top-level node.
    // 
    // The string coercion on this.cslXml.tagName addresses a bizarre
    // condition on the top-level node in jsdom running under node.js, in which:
    //   (1) typeof this.cslXml.tagName === "undefined"; and
    //   (2) !this.cslXml.tagName === false
    // Coerced, it becomes an empty string.
    

    // Some releases of citeproc-node call the top-level node "cslstyle":
    //   https://bitbucket.org/fbennett/citeproc-js/issue/165/citeproc-now-failing-to-run-on-nodejs


    // XXXXX
    // This was all VERY WRONG.
    // We can't call DOM functions outside of the parsing instance!!!
    // May need to come back here if commenting this out breaks things,
    // and it could be tough slog to get it fixed.
    // XXXXX

    var dummy = {}, attributes, attrname;;

    //var cslXml = this.cslXml;
	//var tagName = this.cslXml.tagName ? ("" + this.cslXml.tagName).toLowerCase() : "";
    //if (tagName !== 'style' && tagName !== 'cslstyle') {
    //    if (this.cslXml.getElementsByTagName) {
    //        var cslXml = this.cslXml.getElementsByTagName('style')[0];
    //    }
    //}
    //dummy.name = this.sys.xml.nodename(cslXml);
    dummy.name = this.cslXml.nodename(this.cslXml.dataObj);
    attributes = this.cslXml.attributes(this.cslXml.dataObj);
    for (attrname in attributes) {
        if (attributes.hasOwnProperty(attrname)) {
            // attr = attributes[key];
            CSL.Attributes[attrname].call(dummy, this, attributes[attrname]);
        }
    }
};

CSL.Engine.prototype.getTerm = function (term, form, plural, gender, mode, forceDefaultLocale) {
    if (term && term.match(/[A-Z]/) && term === term.toUpperCase()) {
        CSL.debug("Warning: term key is in uppercase form: "+term);
        term = term.toLowerCase();
    }
    var lang;
    if (forceDefaultLocale) {
        lang = this.opt["default-locale"][0];
    } else {
        lang = this.opt.lang;
    }
    var ret = CSL.Engine.getField(CSL.LOOSE, this.locale[lang].terms, term, form, plural, gender);
    // XXXXX Temporary, until locale term is deployed in CSL.
    if (!ret && term === "range-delimiter") {
        ret = "\u2013";
    }
    // XXXXX Not so good: can be neither strict nor tolerant
    if (typeof ret === "undefined") {
        if (mode === CSL.STRICT) {
            throw "Error in getTerm: term \"" + term + "\" does not exist.";
        } else if (mode === CSL.TOLERANT) {
            ret = "";
        }
    }
    if (ret) {
        this.tmp.cite_renders_content = true;
    }
    return ret;
};

CSL.Engine.prototype.getDate = function (form, forceDefaultLocale) {
    var lang;
    if (forceDefaultLocale) {
        lang = this.opt["default-locale"];
    } else {
        lang = this.opt.lang;
    }
    if (this.locale[lang].dates[form]) {
        return this.locale[lang].dates[form];
    } else {
        return false;
    }
};

CSL.Engine.prototype.getOpt = function (arg) {
    if ("undefined" !== typeof this.locale[this.opt.lang].opts[arg]) {
        return this.locale[this.opt.lang].opts[arg];
    } else {
        return false;
    }
};



CSL.Engine.prototype.getVariable = function (Item, varname, form, plural) {
    return CSL.Engine.getField(CSL.LOOSE, Item, varname, form, plural);
};

CSL.Engine.prototype.getDateNum = function (ItemField, partname) {
    if ("undefined" === typeof ItemField) {
        return 0;
    } else {
        return ItemField[partname];
    }
};

CSL.Engine.getField = function (mode, hash, term, form, plural, gender) {
    var ret, forms, f, pos, len, hashterm;
    ret = "";
    if ("undefined" === typeof hash[term]) {
        if (mode === CSL.STRICT) {
            throw "Error in getField: term \"" + term + "\" does not exist.";
        } else {
            return undefined;
        }
    }
    if (gender && hash[term][gender]) {
        hashterm = hash[term][gender];
    } else {
        hashterm = hash[term];
    }
    forms = [];
    if (form === "symbol") {
        forms = ["symbol", "short"];
    } else if (form === "verb-short") {
        forms = ["verb-short", "verb"];
    } else if (form !== "long") {
        forms = [form];
    }
    forms = forms.concat(["long"]);
    len = forms.length;
    for (pos = 0; pos < len; pos += 1) {
        f = forms[pos];
        if ("string" === typeof hashterm || "number" === typeof hashterm) {
            ret = hashterm;
        } else if ("undefined" !== typeof hashterm[f]) {
            if ("string" === typeof hashterm[f] || "number" === typeof hashterm[f]) {
                ret = hashterm[f];
            } else {
                if ("number" === typeof plural) {
                    ret = hashterm[f][plural];
                } else {
                    ret = hashterm[f][0];
                }
            }
            break;
        }
    }
    return ret;
};

CSL.Engine.prototype.configureTokenLists = function () {
    var area, pos, len;
    len = CSL.AREAS.length;
    for (pos = 0; pos < len; pos += 1) {
        area = CSL.AREAS[pos];
        var tokens = this[area].tokens;
        this.configureTokenList(tokens);
    }
    this.version = CSL.version;
    return this.state;
};

CSL.Engine.prototype.configureTokenList = function (tokens) {
    var dateparts_master, token, dateparts, part, ppos, pppos, len, llen;
    dateparts_master = ["year", "month", "day"];
    len = tokens.length - 1;
    for (ppos = len; ppos > -1; ppos += -1) {
        token = tokens[ppos];
        //token.pos = ppos;
        //ret.push(token);
        if ("date" === token.name && CSL.END === token.tokentype) {
            dateparts = [];
        }
        if ("date-part" === token.name && token.strings.name) {
            llen = dateparts_master.length;
            for (pppos = 0; pppos < llen; pppos += 1) {
                part = dateparts_master[pppos];
                if (part === token.strings.name) {
                    dateparts.push(token.strings.name);
                }
            }
        }
        if ("date" === token.name && CSL.START === token.tokentype) {
            dateparts.reverse();
            token.dateparts = dateparts;
        }
        token.next = (ppos + 1);
        if (token.name && CSL.Node[token.name].configure) {
            CSL.Node[token.name].configure.call(token, this, ppos);
        }
    }
}

CSL.Engine.prototype.retrieveItems = function (ids) {
    var ret = [];
    for (var i = 0, ilen = ids.length; i < ilen; i += 1) {
        ret.push(this.retrieveItem("" + ids[i]));
    }
    return ret;
};

CSL.ITERATION = 0;

// Wrapper for sys.retrieveItem supplied by calling application.
// Adds experimental fields embedded in the note field for
// style development trial and testing purposes.
CSL.Engine.prototype.retrieveItem = function (id) {
    var Item, m, i, ilen, field, key, jurisdiction;

    if (!this.tmp.loadedItemIDs[id]) {
        this.tmp.loadedItemIDs[id] = true;
    } else {
        return this.registry.refhash[id];
    }

    if (this.opt.development_extensions.normalize_lang_keys_to_lowercase &&
        "boolean" === typeof this.opt.development_extensions.normalize_lang_keys_to_lowercase) {
        // This is a hack. Should properly be configured by a processor method after build.
        for (i=0,ilen=this.opt["default-locale"].length; i<ilen; i+=1) {
            this.opt["default-locale"][i] = this.opt["default-locale"][i].toLowerCase();
        }
        for (i=0,ilen=this.opt["locale-translit"].length; i<ilen; i+=1) {
            this.opt["locale-translit"][i] = this.opt["locale-translit"][i].toLowerCase();
        }
        for (i=0,ilen=this.opt["locale-translat"].length; i<ilen; i+=1) {
            this.opt["locale-translat"][i] = this.opt["locale-translat"][i].toLowerCase();
        }
        this.opt.development_extensions.normalize_lang_keys_to_lowercase = 100;
    }

    //Zotero.debug("XXX === ITERATION " + CSL.ITERATION + " "+ id +" ===");
    CSL.ITERATION += 1;

    Item = JSON.parse(JSON.stringify(this.sys.retrieveItem("" + id)));

    // Optionally normalize keys to lowercase()
    if (this.opt.development_extensions.normalize_lang_keys_to_lowercase) {
        if (Item.multi) {
            if (Item.multi._keys) {
                for (field in Item.multi._keys) {
                    for (key in Item.multi._keys[field]) {
                        if (key !== key.toLowerCase()) {
                            Item.multi._keys[field][key.toLowerCase()] = Item.multi._keys[field][key];
                            delete Item.multi._keys[field][key];
                        }
                    }
                }
            }
            if (Item.multi.main) {
                for (field in Item.multi.main) {
                    Item.multi.main[field] = Item.multi.main[field].toLowerCase();
                }
            }
        }
        for (i=0, ilen=CSL.CREATORS.length; i>ilen; i+=1) {
            var ctype = CSL.CREATORS[i];
            if (Item[ctype] && Item[ctype].multi) {
                for (var j=0, jlen=Item[ctype].length; j<jlen; j+=1) {
                    var creator = Item[ctype][j];
                    if (creator.multi) {
                        if (creator.multi._key) {
                            for (key in creator.multi._key) {
                                if (key !== key.toLowerCase()) {
                                    creator.multi._key[key.toLowerCase()] = creator.multi._key[key];
                                    delete creator.multi._key[key];
                                }
                            }
                        }
                        if (creator.multi.main) {
                            creator.multi.main = creator.multi.main.toLowerCase();
                        }
                    }
                }
            }
        }
    }
    // Mandatory data rescue
    // LEX HACK
    //if (Item.type === "bill" && Item.number && !Item.volume && Item.page) {
    //    Item.volume = Item.number;
    //    Item.number = undefined;
    //}

    // Remap language field value
    if (this.sys.getLanguageName && Item.language) {
		// Split language field into "language" and "language-original"
		if (Item.language) {
            // Force lowercase always
            Item.language = Item.language.toLowerCase();
			// Attempt to split field in two
			var lst = Item.language.split("<");
            if (lst.length > 0) {
                var languageName = this.sys.getLanguageName(lst[0]);
                if (languageName) {
                    Item["language-name"] = languageName;
                }
            }
			if (lst.length === 2) {
				var originalLanguage = this.sys.getLanguageName(lst[1]);
				if (originalLanguage) {
					Item["language-name-original"] = originalLanguage;
				}
			}
		}
		
    }

    if (Item.page) {
        Item["page-first"] = Item.page;
        var num = "" + Item.page;
        m = num.split(/\s*(?:&|, |-|\u2013)\s*/);
        if (m[0].slice(-1) !== "\\") {
            Item["page-first"] = m[0];
        }
    }
    // Optional development extensions
    if (this.opt.development_extensions.field_hack && Item.note) {
        //Zotero.debug("XXX   (1): "+Item.note);
        // false is for validFieldsForType (all conforming entries scrubbed when false)
        CSL.parseNoteFieldHacks(Item, false, this.opt.development_extensions.allow_field_hack_date_override);
    }
    // not including locator-date
    for (i = 1, ilen = CSL.DATE_VARIABLES.length; i < ilen; i += 1) {
        var dateobj = Item[CSL.DATE_VARIABLES[i]];
        if (dateobj) {
            // raw date parsing is harmless, but can be disabled if desired
            if (this.opt.development_extensions.raw_date_parsing) {
                if (dateobj.raw) {
                    dateobj = this.fun.dateparser.parseDateToObject(dateobj.raw);
                }
            }
            Item[CSL.DATE_VARIABLES[i]] = this.dateParseArray(dateobj);
        }
    }
    if (this.opt.development_extensions.static_statute_locator) {
        if (Item.type && ["bill","gazette","legislation","regulation","treaty"].indexOf(Item.type) > -1) {
            
            var varname;
            var elements = ["type", "title", "jurisdiction", "genre", "volume", "container-title"];
            var legislation_id = [];
            for (i = 0, ilen = elements.length; i < ilen; i += 1) {
                varname = elements[i];
				if (Item[varname]) {
					legislation_id.push(Item[varname]);
				}
			}
            elements = ["original-date", "issued"];
			for (i = 0, elements.length; i < ilen; i += 1) {
                varname = elements[i];
				if (Item[varname] && Item[varname].year) {
					var value = Item[varname].year;
					legislation_id.push(value);
					break;
				}
			}
			Item.legislation_id = legislation_id.join("::");
        }
    }
    // For authority to name shape in legal styles
    if (this.opt.development_extensions.force_jurisdiction) {
        if ("string" === typeof Item.authority) {
            Item.authority = [
                {
                    literal: Item.authority
                }
            ]
        }
    }
    // Add getAbbreviation() call for title-short and container-title-short
    if (!Item["title-short"]) {
        Item["title-short"] = Item.shortTitle;
    }
    // Add support for main_title_from_short_title
    if (this.opt.development_extensions.main_title_from_short_title) {
        CSL.extractTitleAndSubtitle(Item);
    }
    var isLegalType = ["bill","legal_case","legislation","gazette","regulation"].indexOf(Item.type) > -1;
    if (this.opt.development_extensions.force_jurisdiction && isLegalType) {
        if (!Item.jurisdiction) {
            Item.jurisdiction = "us";
        }
    }
    if (!isLegalType && Item.title && this.sys.getAbbreviation) {
        jurisdiction = this.transform.loadAbbreviation(Item.jurisdiction, "title", Item.title, Item.type, true);
        if (this.transform.abbrevs[jurisdiction].title) {
            if (this.transform.abbrevs[jurisdiction].title[Item.title]) {
                Item["title-short"] = this.transform.abbrevs[jurisdiction].title[Item.title];
            }
        }
    }
    if (!Item["container-title-short"]) {
        Item["container-title-short"] = Item.journalAbbreviation;
    }
    if (Item["container-title"] && this.sys.getAbbreviation) {
        jurisdiction = this.transform.loadAbbreviation(Item.jurisdiction, "container-title", Item["container-title"]);
        if (this.transform.abbrevs[jurisdiction]["container-title"]) {
            if (this.transform.abbrevs[jurisdiction]["container-title"][Item["container-title"]]) {
                Item["container-title-short"] = this.transform.abbrevs[jurisdiction]["container-title"][Item["container-title"]];
            }
        }
    }
    this.registry.refhash[id] = Item;
    return Item;
};

// Executed during style build
CSL.Engine.prototype.setOpt = function (token, name, value) {
    if (token.name === "style" || token.name === "cslstyle") {
        this.opt.inheritedAttributes[name] = value;
        this.citation.opt.inheritedAttributes[name] = value;
        this.bibliography.opt.inheritedAttributes[name] = value;
    } else if (["citation", "bibliography"].indexOf(token.name) > -1) {
        this[token.name].opt.inheritedAttributes[name] = value;
    } else {
        token.strings[name] = value;
    }
};

// Executed at runtime, since macros can occur in the context of citation or bibliography
CSL.Engine.prototype.inheritOpt = function (token, attrname, parentname, defaultValue) {
    if ("undefined" !== typeof token.strings[attrname]) {
        return token.strings[attrname];
    } else {
        var parentValue = this[this.tmp.root].opt.inheritedAttributes[parentname ? parentname : attrname];
        if ("undefined" !== typeof parentValue) {
            return parentValue;
        } else {
            return defaultValue;
        }
    }
};
