/*global CSL: true */

CSL.Engine = function (sys, style, lang, forceLang) {
    var attrs, langspec;
    this.processor_version = CSL.PROCESSOR_VERSION;
    this.csl_version = "1.0";
    this.sys = sys;
    
    if (typeof Object.assign != 'function') {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, "assign", {
            value: function assign(target) { // .length of function is 2
                'use strict';
                if (target == null) { // TypeError if undefined or null
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                var to = Object(target);

                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];

                    if (nextSource != null) { // Skip over if undefined or null
                        for (var nextKey in nextSource) {
                            // Avoid bugs when hasOwnProperty is shadowed
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                return to;
            },
            writable: true,
            configurable: true
        });
    }

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
    this.intext = new CSL.Engine.InText();

    this.output = new CSL.Output.Queue(this);

    //this.render = new CSL.Render(this);
    //
    // This latter queue is used for formatting date chunks
    // before they are folded back into the main queue.
    //
    this.dateput = new CSL.Output.Queue(this);

    this.cslXml = CSL.setupXml(style);

    for (var i in CSL.SYS_OPTIONS) {
        var option = CSL.SYS_OPTIONS[i];
        if ("boolean" === typeof this.sys[option]) {
            this.opt.development_extensions[option] = this.sys[option];
        }
        
    }
    if (this.opt.development_extensions.uppercase_subtitles || this.opt.development_extensions.implicit_short_title) {
        this.opt.development_extensions.main_title_from_short_title = true;
    }
    if (this.opt.development_extensions.csl_reverse_lookup_support) {
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
    // Preprocessing ops for the XML input
    this.cslXml.addMissingNameNodes(this.cslXml.dataObj);
    this.cslXml.addInstitutionNodes(this.cslXml.dataObj);
    this.cslXml.insertPublisherAndPlace(this.cslXml.dataObj);
    this.cslXml.flagDateMacros(this.cslXml.dataObj);
    attrs = this.cslXml.attributes(this.cslXml.dataObj);
    if ("undefined" === typeof attrs["@sort-separator"]) {
        this.cslXml.setAttribute(this.cslXml.dataObj, "sort-separator", ", ");
    }
    // This setting does the right thing and seems not to be side-effects
    this.opt["initialize-with-hyphen"] = true;

    // Locale resolution
    //
    // (1) Get three locale strings 
    //     -- default-locale (stripped)
    //     -- processor-locale
    //     -- en_US
    
    this.setStyleAttributes();

    this.opt.xclass = this.cslXml.getAttributeValue(this.cslXml.dataObj, "class");
    this.opt["class"] = this.opt.xclass;
    this.opt.styleID = this.cslXml.getStyleId(this.cslXml.dataObj);
    this.opt.styleName = this.cslXml.getStyleId(this.cslXml.dataObj, true);

    if (this.opt.version.slice(0,4) === "1.1m") {
        this.opt.development_extensions.consolidate_legal_items = true;
        this.opt.development_extensions.consolidate_container_items = true;
        this.opt.development_extensions.main_title_from_short_title = true;
        this.opt.development_extensions.expect_and_symbol_form = true;
        this.opt.development_extensions.require_explicit_legal_case_title_short = true;
        this.opt.development_extensions.force_jurisdiction = true;
        this.opt.development_extensions.force_title_abbrev_fallback = true;
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
        var lst = lst.slice();
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
    var area_nodes = this.cslXml.getNodesByName(this.cslXml.dataObj, this.build.area);
    this.buildTokenLists(area_nodes, this[this.build.area].tokens);

    this.build.area = "intext";
    var area_nodes = this.cslXml.getNodesByName(this.cslXml.dataObj, this.build.area);
    this.buildTokenLists(area_nodes, this[this.build.area].tokens);

    if (this.opt.parallel.enable) {
        this.parallel = new CSL.Parallel(this);
    }

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

// Walker for preparsed XML input
CSL.makeBuilder = function (me, target) {
    var var_stack = [];
    var node_stack = [];
    function runStart (node) {
        node_stack.push(node);
        CSL.XmlToToken.call(node, me, CSL.START, target, var_stack);
    }
    function runEnd () {
        var node = node_stack.pop();
        CSL.XmlToToken.call(node, me, CSL.END, target, var_stack);
    }
    function runSingle (node) {
        CSL.XmlToToken.call(node, me, CSL.SINGLETON, target, var_stack);
    }
    function buildStyle (nodes, parent, node_stack) {
        if (!node_stack) {
            node_stack = [];
        }
        if (!nodes) {
            nodes = [];
        }
        if ("undefined" === typeof nodes.length) {
            nodes = [nodes];
        }
        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            if (me.cslXml.nodename(node) === null) {
                continue;
            }
            if (parent && me.cslXml.nodename(node) === "date") {
                CSL.Util.fixDateNode.call(me, parent, i, node);
                node = me.cslXml.children(parent)[i];
            }
            if (me.cslXml.numberofnodes(me.cslXml.children(node))) {
                runStart(node);
                buildStyle(me.cslXml.children(node), node, node_stack);
                runEnd();
            } else {
                runSingle(node);
            }
        }
    }
    return buildStyle;
};


CSL.Engine.prototype.buildTokenLists = function (area_nodes, target) {
    if (!this.cslXml.getNodeValue(area_nodes)) {
        return;
    }
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
    var dummy, attributes, attrname;
    // Protect against DOM engines that deliver a top-level document
    // (needed for createElement) that does not contain our top-level node.
    // 
    // The string coercion on this.cslXml.tagName addresses a bizarre
    // condition on the top-level node in jsdom running under node.js, in which:
    //   (1) typeof this.cslXml.tagName === "undefined"; and
    //   (2) !this.cslXml.tagName === false
    // Coerced, it becomes an empty string.
    var dummy = {};
    dummy.name = this.cslXml.nodename(this.cslXml.dataObj);
    attributes = this.cslXml.attributes(this.cslXml.dataObj);
    for (attrname in attributes) {
        if (attributes.hasOwnProperty(attrname)) {
            if (CSL.Attributes[attrname]) {
                CSL.Attributes[attrname].call(dummy, this, attributes[attrname]);
            } else {
                CSL.debug("warning: undefined attribute \"" + attrname + "\" in style");
            }
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
    // XXXXX Not so good if mode is neither strict nor tolerant ...
    if (typeof ret === "undefined") {
        if (mode === CSL.STRICT) {
            CSL.error("Error in getTerm: term \"" + term + "\" does not exist.");
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
            CSL.error("Error in getField: term \"" + term + "\" does not exist.");
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
    //for each (var area in ["citation", "citation_sort", "bibliography","bibliography_sort"]) {
    len = CSL.AREAS.length;
    for (pos = 0; pos < len; pos += 1) {
        //var ret = [];
        area = CSL.AREAS[pos];
        var tokens = this[area].tokens;
        this.configureTokenList(tokens);
    }
    this.version = CSL.version;
    return this.state;
};

CSL.Engine.prototype.configureTokenList = function (tokens) {
    var dateparts_master, token, dateparts, part, ppos, pppos, llen, lllen;
    dateparts_master = ["year", "month", "day"];
    llen = tokens.length - 1;
    for (ppos = llen; ppos > -1; ppos += -1) {
        token = tokens[ppos];
        //token.pos = ppos;
        //ret.push(token);
        if ("date" === token.name && CSL.END === token.tokentype) {
            dateparts = [];
        }
        if ("date-part" === token.name && token.strings.name) {
            lllen = dateparts_master.length;
            for (pppos = 0; pppos < lllen; pppos += 1) {
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
};

CSL.Engine.prototype.refetchItems = function (ids) {
    var ret = [];
    for (var i = 0, ilen = ids.length; i < ilen; i += 1) {
        ret.push(this.refetchItem("" + ids[i]));
    }
    return ret;
};

CSL.ITERATION = 0;

// Wrapper for sys.retrieveItem supplied by calling application.
// Adds experimental fields embedded in the note field for
// style development trial and testing purposes.
CSL.Engine.prototype.retrieveItem = function (id) {
    var Item, m, i;

    if (!this.tmp.loadedItemIDs[id]) {
        this.tmp.loadedItemIDs[id] = true;
    } else {
        return this.registry.refhash[id];
    }

    if (this.opt.development_extensions.normalize_lang_keys_to_lowercase &&
        "boolean" === typeof this.opt.development_extensions.normalize_lang_keys_to_lowercase) {
        // This is a hack. Should properly be configured by a processor method after build.
        for (var i=0,ilen=this.opt["default-locale"].length; i<ilen; i+=1) {
            this.opt["default-locale"][i] = this.opt["default-locale"][i].toLowerCase();
        }
        for (var i=0,ilen=this.opt["locale-translit"].length; i<ilen; i+=1) {
            this.opt["locale-translit"][i] = this.opt["locale-translit"][i].toLowerCase();
        }
        for (var i=0,ilen=this.opt["locale-translat"].length; i<ilen; i+=1) {
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
                for (var field in Item.multi._keys) {
                    for (var key in Item.multi._keys[field]) {
                        if (key !== key.toLowerCase()) {
                            Item.multi._keys[field][key.toLowerCase()] = Item.multi._keys[field][key];
                            delete Item.multi._keys[field][key];
                        }
                    }
                }
            }
            if (Item.multi.main) {
                for (var field in Item.multi.main) {
                    Item.multi.main[field] = Item.multi.main[field].toLowerCase();
                }
            }
        }
        for (var i=0, ilen=CSL.NAME_VARIABLES.length; i>ilen; i+=1) {
            var ctype = CSL.NAME_VARIABLES[i];
            if (Item[ctype] && Item[ctype].multi) {
                for (var j=0, jlen=Item[ctype].length; j<jlen; j+=1) {
                    var creator = Item[ctype][j];
                    if (creator.multi) {
                        if (creator.multi._key) {
                            for (var key in creator.multi._key) {
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

    // Normalize language field into "language" and "language-original"
    if (Item.language && Item.language.match(/[><]/)) {
        // Attempt to split field in two
        var m = Item.language.match(/(.*?)([<>])(.*)/);
        if (m[2] === "<") {
            Item["language-name"] = m[1];
            Item["language-name-original"] = m[3];
        } else {
            Item["language-name"] = m[3];
            Item["language-name-original"] = m[1];
        }
        if (this.opt.multi_layout) {
            if (Item["language-name-original"]) {
                Item.language = Item["language-name-original"];
            }
        } else {
            if (Item["language-name"]) {
                Item.language = Item["language-name"];
            }
        }
    }

    if (Item.page) {
        Item["page-first"] = Item.page;
        var num = "" + Item.page;
        var m = num.split(/\s*(?:&|, |-|\u2013)\s*/);
        if (m[0].slice(-1) !== "\\") {
            Item["page-first"] = m[0];
        }
    }
    // Optional development extensions
    if (this.opt.development_extensions.field_hack && Item.note) {
        // false is for validFieldsForType (all conforming entries scrubbed when false)
        CSL.parseNoteFieldHacks(Item, false, this.opt.development_extensions.allow_field_hack_date_override);
    }
    // not including locator-date
    for (var key in Item) {
        if (CSL.DATE_VARIABLES.indexOf(key.replace(/^alt-/, "")) > -1) {
            var dateobj = Item[key];
            if (dateobj) {
                // raw date parsing is harmless, but can be disabled if desired
                if (this.opt.development_extensions.raw_date_parsing) {
                    if (dateobj.raw && (!dateobj["date-parts"] || dateobj["date-parts"].length === 0)) {
                        dateobj = this.fun.dateparser.parseDateToObject(dateobj.raw);
                    }
                }
                Item[key] = this.dateParseArray(dateobj);
            }
        }
    }
    if (this.opt.development_extensions.consolidate_legal_items) {
        if (Item.type && ["bill","gazette","legislation","regulation","treaty"].indexOf(Item.type) > -1) {
            var varname;
            var elements = ["type", "title", "jurisdiction", "genre", "volume", "container-title"];
            var legislation_id = [];
            for (var i = 0, ilen = elements.length; i < ilen; i += 1) {
                varname = elements[i];
				if (Item[varname]) {
					legislation_id.push(Item[varname]);
				}
			}
            elements = ["original-date", "issued"];
			for (var i = 0, ilen=elements.length; i < ilen; i += 1) {
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
    if (this.bibliography.opt.track_container_items) {
        if (this.bibliography.opt.track_container_items.indexOf(Item.type) > -1) {
            var varname;
            var elements = ["type", "container-title", "publisher", "edition"];
            var container_id = [];
            for (var i = 0, ilen = elements.length; i < ilen; i += 1) {
                varname = elements[i];
				if (Item[varname]) {
					container_id.push(Item[varname]);
				}
			}
			Item.container_id = container_id.join("::");
        }
    }
    // For authority to name shape in legal styles
    if (this.opt.development_extensions.force_jurisdiction) {
        if ("string" === typeof Item.authority) {
            Item.authority = [
                {
                    literal: Item.authority,
                    multi: {
                        _key: {}
                    }
                }
            ];
            if (Item.multi && Item.multi._keys && Item.multi._keys.authority) {
                Item.authority[0].multi._key = {};
                for (var key in Item.multi._keys.authority) {
                    Item.authority[0].multi._key[key] = {
                        literal: Item.multi._keys.authority[key]
                    };
                }
            }
        }
    }
    // Add getAbbreviation() call for title-short and container-title-short
    if (!Item["title-short"]) {
        Item["title-short"] = Item.shortTitle;
    }
    // Add support for main_title_from_short_title
    if (this.opt.development_extensions.main_title_from_short_title) {
        var narrowSpaceLocale = this.opt["default-locale"][0].slice(0, 2).toLowerCase() === "fr";
        CSL.extractTitleAndSubtitle.call(this, Item, narrowSpaceLocale);
    }
    var isLegalType = ["bill","legal_case","legislation","gazette","regulation"].indexOf(Item.type) > -1;
    if (this.opt.development_extensions.force_jurisdiction && isLegalType) {
        if (!Item.jurisdiction) {
            Item.jurisdiction = "us";
        }
    }
    var normalizedKey;
    if (!isLegalType && Item.title && this.sys.getAbbreviation) {
        var noHints = false;
        if (!Item.jurisdiction) {
            noHints = true;
        }
        if (this.sys.normalizeAbbrevsKey) {
             normalizedKey = this.sys.normalizeAbbrevsKey("title", Item.title);
        } else {
            normalizedKey = Item.title;
        }
        var jurisdiction = this.transform.loadAbbreviation(Item.jurisdiction, "title", normalizedKey, Item.language);
        if (this.transform.abbrevs[jurisdiction].title) {
            if (this.transform.abbrevs[jurisdiction].title[normalizedKey]) {
                Item["title-short"] = this.transform.abbrevs[jurisdiction].title[normalizedKey];
            }
        }
    }
    if (!Item["container-title-short"]) {
        Item["container-title-short"] = Item.journalAbbreviation;
    }
    if (Item["container-title"] && this.sys.getAbbreviation) {
        if (this.sys.normalizeAbbrevsKey) {
            normalizedKey = this.sys.normalizeAbbrevsKey(Item["container-title"]);
        } else {
            normalizedKey = Item["container-title"];
        }
        var jurisdiction = this.transform.loadAbbreviation(Item.jurisdiction, "container-title", normalizedKey, Item.language);
        if (this.transform.abbrevs[jurisdiction]["container-title"]) {
            if (this.transform.abbrevs[jurisdiction]["container-title"][normalizedKey]) {
                Item["container-title-short"] = this.transform.abbrevs[jurisdiction]["container-title"][normalizedKey];
            }
        }
    }
    if (Item.jurisdiction) {
        Item.country = Item.jurisdiction.split(":")[0];
    }
    if (this.registry.refhash[id]) {
        if (JSON.stringify(this.registry.refhash[id]) != JSON.stringify(Item)) {
            for (var key in this.registry.refhash[id]) {
                delete this.registry.refhash[id][key];
            }
            this.tmp.taintedItemIDs[Item.id] = true;
            Object.assign(this.registry.refhash[id], Item);
        }
    } else {
        this.registry.refhash[id] = Item;
    }
    return this.registry.refhash[id];
};

CSL.Engine.prototype.refetchItem = function (id) {
    return this.registry.refhash[id];
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
