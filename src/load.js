/*global CSL: true */

/**
 * A Javascript implementation of the CSL citation formatting language.
 *
 * <p>A configured instance of the process is built in two stages,
 * using {@link CSL.Core.Build} and {@link CSL.Core.Configure}.
 * The former sets up hash-accessible locale data and imports the CSL format file
 * to be applied to the citations,
 * transforming it into a one-dimensional token list, and
 * registering functions and parameters on each token as appropriate.
 * The latter sets jump-point information
 * on tokens that constitute potential branch
 * points, in a single back-to-front scan of the token list.
 * This
 * yields a token list that can be executed front-to-back by
 * body methods available on the
 * {@link CSL.Engine} class.</p>
 *
 * <p>This top-level {@link CSL} object itself carries
 * constants that are needed during processing.</p>
 * @namespace A CSL citation formatter.
 */

// IE6 does not implement Array.indexOf().
// IE7 neither, according to rumour.


// Potential skip words:
// under; along; out; between; among; outside; inside; amid; amidst; against; toward; towards.
// See https://forums.zotero.org/discussion/30484/?Focus=159613#Comment_159613

'use strict';


var CSL = {

    PROCESSOR_VERSION: "1.4.61",

    error: function(str) { // default error function
        if ("undefined" === typeof Error) {
            throw new Error("citeproc-js error: " + str);
        } else {
            throw "citeproc-js error: " + str;
        }
    },
    debug: function(str) { // default debug function
        if ("undefined" === typeof console) {
            dump("CSL: " + str + "\n");
        } else {
            console.log("citeproc-js warning: " + str);
        }
    },

    toLocaleUpperCase(str) {
        var arr = this.tmp.lang_array;
        try {
            str = str.toLocaleUpperCase(arr);
        } catch (e) {
            str = str.toUpperCase();
        }
        return str;
    },

    toLocaleLowerCase(str) {
        var arr = this.tmp.lang_array;
        try {
            str = str.toLocaleLowerCase(arr);
        } catch (e) {
            str = str.toLowerCase();
        }
        return str;
    },

    LOCATOR_LABELS_REGEXP: new RegExp("^((vrs|sv|subpara|op|subch|add|amend|annot|app|art|bibliog|bk|ch|cl|col|cmt|dec|dept|div|ex|fig|fld|fol|n|hypo|illus|intro|l|no|p|pp|para|pt|pmbl|princ|pub|r|rn|sched|sec|ser|subdiv|subsec|supp|tbl|tit|vol)\\.)\\s+(.*)"),

    STATUTE_SUBDIV_PLAIN_REGEX: /(?:(?:^| )(?:vrs|sv|subpara|op|subch|add|amend|annot|app|art|bibliog|bk|ch|cl|col|cmt|dec|dept|div|ex|fig|fld|fol|n|hypo|illus|intro|l|no|p|pp|para|pt|pmbl|princ|pub|r|rn|sched|sec|ser|subdiv|subsec|supp|tbl|tit|vol)\. *)/,
    STATUTE_SUBDIV_PLAIN_REGEX_FRONT: /(?:^\s*[.,;]*\s*(?:vrs|sv|subpara|op|subch|add|amend|annot|app|art|bibliog|bk|ch|cl|col|cmt|dec|dept|div|ex|fig|fld|fol|n|hypo|illus|intro|l|no|p|pp|para|pt|pmbl|princ|pub|r|rn|sched|sec|ser|subdiv|subsec|supp|tbl|tit|vol)\. *)/,
 
    STATUTE_SUBDIV_STRINGS: {
        "vrs.": "verse",
		"sv.": "sub-verbo",
        "subpara.": "subparagraph",
        "op.": "opus",
        "subch.": "subchapter",
        "add.": "addendum",
        "amend.": "amendment",
        "annot.": "annotation",
        "app.": "appendix",
        "art.": "article",
        "bibliog.": "bibliography",
        "bk.": "book",
        "ch.": "chapter",
        "cl.": "clause",
        "col.": "column",
        "cmt.": "comment",
        "dec.": "decision",
        "dept.": "department",
        "ex.": "example",
        "fig.": "figure",
        "fld.": "field",
        "fol.": "folio",
        "n.": "note",
        "hypo.": "hypothetical",
        "illus.": "illustration",
        "intro.": "introduction",
        "l.": "line",
        "no.": "issue",
        "p.": "page",
        "pp.": "page",
        "para.": "paragraph",
        "pt.": "part",
        "pmbl.": "preamble",
        "princ.": "principle",
        "pub.": "publication",
        "r.": "rule",
        "rn.": "randnummer",
        "sched.": "schedule",
        "sec.": "section",
        "ser.": "series,",
        "subdiv.": "subdivision",
        "subsec.": "subsection",
        "supp.": "supplement",
        "tbl.": "table",
        "tit.": "title",
        "vol.": "volume"
    },
    STATUTE_SUBDIV_STRINGS_REVERSE: {
        "verse": "vrs.",
		"sub-verbo": "sv.",
        "sub verbo": "sv.",
        "subparagraph": "subpara.",
        "opus": "op.",
        "subchapter": "subch.",
        "addendum": "add.",
        "amendment": "amend.",
        "annotation": "annot.",
        "appendix": "app.",
        "article": "art.",
        "bibliography": "bibliog.",
        "book": "bk.",
        "chapter": "ch.",
        "clause": "cl.",
        "column": "col.",
        "comment": "cmt.",
        "decision": "dec.",
        "department": "dept.",
        "example": "ex.",
        "figure": "fig.",
        "field": "fld.",
        "folio": "fol.",
        "note": "n.",
        "hypothetical": "hypo.",
        "illustration": "illus.",
        "introduction": "intro.",
        "line": "l.",
        "issue": "no.",
        "page": "p.",
        "paragraph": "para.",
        "part": "pt.",
        "preamble": "pmbl.",
        "principle": "princ.",
        "publication": "pub.",
        "rule": "r.",
        "randnummer": "rn.",
        "schedule": "sched.",
        "section": "sec.",
        "series,": "ser.",
        "subdivision": "subdiv.",
        "subsection": "subsec.",
        "supplement": "supp.",
        "table": "tbl.",
        "title": "tit.",
        "volume": "vol."
    },

    LOCATOR_LABELS_MAP: {
        "vrs": "verse",
		"sv": "sub-verbo",
        "subpara": "subparagraph",
        "op": "opus",
        "subch": "subchapter",
        "add": "addendum",
        "amend": "amendment",
        "annot": "annotation",
        "app": "appendix",
        "art": "article",
        "bibliog": "bibliography",
        "bk": "book",
        "ch": "chapter",
        "cl": "clause",
        "col": "column",
        "cmt": "comment",
        "dec": "decision",
        "dept": "department",
        "ex": "example",
        "fig": "figure",
        "fld": "field",
        "fol": "folio",
        "n": "note",
        "hypo": "hypothetical",
        "illus": "illustration",
        "intro": "introduction",
        "l": "line",
        "no": "issue",
        "p": "page",
        "pp": "page",
        "para": "paragraph",
        "pt": "part",
        "pmbl": "preamble",
        "princ": "principle",
        "pub": "publication",
        "r": "rule",
        "rn": "randnummer",
        "sched": "schedule",
        "sec": "section",
        "ser": "series,",
        "subdiv": "subdivision",
        "subsec": "subsection",
        "supp": "supplement",
        "tbl": "table",
        "tit": "title",
        "vol": "volume"
    },
    MODULE_MACROS: {
        "juris-pretitle": true,
        "juris-title": true,
        "juris-pretitle-short": true,
        "juris-title-short": true,
        "juris-main": true,
        "juris-main-short": true,
        "juris-tail": true,
        "juris-tail-short": true,
        "juris-locator": true
    },
    MODULE_TYPES: {
        "legal_case": true,
        "legislation": true,
        "bill": true,
        "hearing": true,
        "gazette": true,
        "report": true,
        "regulation": true,
        "standard": true,
        "patent": true,
        "locator": true
    },
    checkNestedBrace: function(state) {
        if (state.opt.xclass === "note") {
            this.depth = 0;
            this.update = function(str) {
                
                // Receives affix string, returns with flipped parens.
                
                var str = str ? str : "";
                var lst = str.split(/([\(\)])/);
                for (var i=1,ilen=lst.length;i<ilen;i += 2) {
                    if (lst[i] === "(") {
                        if (1 === (this.depth % 2)) {
                            lst[i] = "[";
                        }
                        this.depth += 1;
                    } else if (lst[i] === ")") {
                        if (0 === (this.depth % 2)) {
                            lst[i] = "]";
                        }
                        this.depth -= 1;
                    }
                }
                var ret = lst.join("");
                return ret;
            };
        } else {
            this.update = function(str) {
                return str;
            };
        }
    },

    MULTI_FIELDS: ["event", "publisher", "publisher-place", "event-place", "title", "container-title", "collection-title", "authority","genre","title-short","medium","country","jurisdiction","archive","archive-place"],

    LangPrefsMap: {
        "title":"titles",
        "title-short":"titles",
        "event":"titles",
        "genre":"titles",
        "medium":"titles",
        "container-title":"journals",
        "collection-title":"titles",
        "archive":"journals",
        "publisher":"publishers",
        "authority":"publishers",
        "publisher-place": "places",
        "event-place": "places",
        "archive-place": "places",
        "jurisdiction": "places",
        "number": "places",
        "edition":"places",
        "issue":"places",
        "volume":"places"
    },

    AbbreviationSegments: function () {
        this["container-title"] = {};
        this["collection-title"] = {};
        this["institution-entire"] = {};
        this["institution-part"] = {};
        this.nickname = {};
        this.number = {};
        this.title = {};
        this.place = {};
        this.hereinafter = {};
        this.classic = {};
        this["container-phrase"] = {};
        this["title-phrase"] = {};
    },

    getAbbrevsDomain: function (state, country, lang) {
		var domain = null;
        if (state.opt.availableAbbrevDomains && country && country !== "default") {
	        var globalDomainPreference = state.locale[state.opt.lang].opts["jurisdiction-preference"];
		    var itemDomainPreference = null;
		    if (state.locale[lang]) {
			    itemDomainPreference = state.locale[lang].opts["jurisdiction-preference"];
		    }
		    if (itemDomainPreference) {
			    for (var j=itemDomainPreference.length-1; j > -1; j--) {
				    if (state.opt.availableAbbrevDomains[country].indexOf(itemDomainPreference[j]) > -1) {
					    domain = itemDomainPreference[j];
					    break;
				    }
			    }
		    }
		    if (!domain && globalDomainPreference) {
			    for (var j=globalDomainPreference.length-1; j > -1; j--) {
				    if (state.opt.availableAbbrevDomains[country].indexOf(globalDomainPreference[j]) > -1) {
					    domain = globalDomainPreference[j];
					    break;
				    }
			    }
		    }
        }
        return domain;
    },
    
    FIELD_CATEGORY_REMAP: {
        "title": "title",
        "container-title": "container-title",
        "collection-title": "collection-title",
        "country": "place",
        "number": "number",
        "place": "place",
        "archive": "container-title",
        "title-short": "title",
        "genre": "title",
        "event": "title",
        "medium": "title",
		"archive-place": "place",
		"publisher-place": "place",
		"event-place": "place",
		"jurisdiction": "place",
		"language-name": "place",
		"language-name-original": "place",
        "call-number": "number",
        "chapter-number": "number",
        "collection-number": "number",
        "edition": "number",
        "page": "number",
        "issue": "number",
        "locator": "number",
        "locator-extra": "number",
        "number-of-pages": "number",
        "number-of-volumes": "number",
        "volume": "number",
        "citation-number": "number",
        "publisher": "institution-part"
    },
    
    parseLocator: function(item) {
        if (this.opt.development_extensions.locator_date_and_revision) {
            // Break out locator elements if necessary
            if (item.locator) {
                item.locator = "" + item.locator;
                var idx = item.locator.indexOf("|");
                if (idx > -1) {
                    var raw_locator = item.locator;
                    item.locator = raw_locator.slice(0, idx);
                    raw_locator = raw_locator.slice(idx + 1);
                    var m = raw_locator.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}).*/);
                    if (m) {
                        item["locator-date"] = this.fun.dateparser.parseDateToObject(m[1]);
                        raw_locator = raw_locator.slice(m[1].length);
                    }
                    item["locator-extra"] = raw_locator.replace(/^\s+/, "").replace(/\s+$/, "");
                }
            }
        }
        if (item.locator) {
            item.locator = ("" + item.locator).replace(/\s+$/, '');
        }
        return item;
    },

    normalizeLocaleStr: function(str) {
        if (!str) {
            return;
        }
        var lst = str.split('-');
        lst[0] = lst[0].toLowerCase();
        if (lst[1]) {
            lst[1] = lst[1].toUpperCase();
        }
        return lst.join("-");
    },

    parseNoteFieldHacks: function(Item, validFieldsForType, allowDateOverride) {
        if ("string" !== typeof Item.note) {
            return;
        }
        var elems = [];
        var lines = Item.note.split('\n');
        // Normalize entries
        for (var i=0, ilen=lines.length; i<ilen; i++) {
            var line = lines[i];
            var elems = [];
            var m = line.match(CSL.NOTE_FIELDS_REGEXP);
            if (m) {
                var splt = line.split(CSL.NOTE_FIELDS_REGEXP);
                for (var j=0,jlen=(splt.length-1);j<jlen;j++) {
                    elems.push(splt[j]);
                    elems.push(m[j]);
                }
                elems.push(splt[splt.length-1]);
                for (var j=1,jlen=elems.length;j<jlen;j += 2) {
                    // Abort conversions if preceded by unparseable text
                    if (elems[j-1].trim() && (i>0 || j>1) && !elems[j-1].match(CSL.NOTE_FIELD_REGEXP)) {
                        break;
                    } else {
                        elems[j] = '\n' + elems[j].slice(2,-1).trim() + '\n';
                    }
                }
                lines[i] = elems.join('');
            }
        }
        // Resplit
        lines = lines.join('\n').split('\n');
        var offset = 0;
        var names = {};
        for (var i=0,ilen=lines.length;i<ilen;i++) {
            var line = lines[i];
            var mm = line.match(CSL.NOTE_FIELD_REGEXP);
            if (!line.trim()) {
                continue;
            } else if (!mm) {
                if (i === 0) {
                    continue;
                } else {
                    offset = i;
                    break;
                }
            }
            var key = mm[1];
            var val = mm[2].replace(/^\s+/, "").replace(/\s+$/, "");
            if (key === "type") {
                Item.type = val;
                lines[i] = "";
            } else if (CSL.DATE_VARIABLES.indexOf(key.replace(/^alt-/, "")) > -1) {
                if (!Item[key] || allowDateOverride) {
                    Item[key] = CSL.DateParser.parseDateToArray(val);
                    if (!validFieldsForType || (validFieldsForType[key] && this.isDateString(val))) {
                        lines[i] = "";
                    }
                }
            } else if (!Item[key]) {
                if (CSL.NAME_VARIABLES.indexOf(key.replace(/^alt-/, "")) > -1) {
                    if (!names[key]) {
                        names[key] = [];
                    }
                    var lst = val.split(/\s*\|\|\s*/);
                    if (lst.length === 1) {
                        names[key].push({literal:lst[0]});
                    } else if (lst.length === 2) {
                        var name = {family:lst[0],given:lst[1]};
                        CSL.parseParticles(name);
                        names[key].push(name);
                    }
                } else {
                    Item[key] = val;
                }
                if (!validFieldsForType || validFieldsForType[key]) {
                    lines[i] = "";
                }
            }
        }
        for (var key in names) {
            Item[key] = names[key];
        }
        // Final cleanup for validCslFields only: eliminate blank lines, add blank line to text
        if (validFieldsForType) {
            if (lines[offset].trim()) {
                lines[offset] = '\n' + lines[offset];
            }
            for (var i=offset-1;i>-1;i--) {
                if (!lines[i].trim()) {
                    lines = lines.slice(0, i).concat(lines.slice(i + 1));
                }
            }
        }
        Item.note = lines.join("\n").trim();
    },

    checkPrefixSpaceAppend: function (state, prefix) {
        if (!prefix) {
            prefix = "";
        }
        var sp = "";
        // We need the raw string, without decorations
        // of any kind. Markup scheme is known, though, so
        // markup can be safely stripped at string level.
        //
        // U+201d = right double quotation mark
        // U+2019 = right single quotation mark
        // U+00bb = right double angle bracket (guillemet)
        // U+202f = non-breaking thin space
        // U+00a0 = non-breaking space
        var test_prefix = prefix.replace(/<[^>]+>/g, "").replace(/["'\u201d\u2019\u00bb\u202f\u00a0 ]+$/g,"");
        var test_char = test_prefix.slice(-1);
        if (test_prefix.match(CSL.ENDSWITH_ROMANESQUE_REGEXP)) {
            sp = " ";
        } else if (CSL.TERMINAL_PUNCTUATION.slice(0,-1).indexOf(test_char) > -1) {
            sp = " ";
        } else if (test_char.match(/[\)\],0-9]/)) {
            sp = " ";
        }
        // Protect against double spaces, which would trigger an extra,
        // explicit, non-breaking space.
        var prefix = (prefix + sp).replace(/\s+/g, " ");
        return prefix;
    },

    checkIgnorePredecessor: function(state, prefix) {
        var ignorePredecessor = false;
        var test_prefix = prefix.replace(/<[^>]+>/g, "").replace(/["'\u201d\u2019\u00bb\u202f\u00a0 ]+$/g,"");
        var test_char = test_prefix.slice(-1);
        if (CSL.TERMINAL_PUNCTUATION.slice(0,-1).indexOf(test_char) > -1 && prefix.trim().indexOf(" ") > -1) {
            state.tmp.term_predecessor = false;
            return true;
        }
        return false;
    },

    checkSuffixSpacePrepend: function(state, suffix) {
        if (!suffix) {
            return "";
        }
        if (suffix.match(CSL.STARTSWITH_ROMANESQUE_REGEXP) || ['[','('].indexOf(suffix.slice(0,1)) > -1) {
            suffix = " " + suffix;
        }
        return suffix;
    },
    
    GENDERS: ["masculine", "feminine"],
    
    ERROR_NO_RENDERED_FORM: 1,

    PREVIEW: "Just for laughs.",
    ASSUME_ALL_ITEMS_REGISTERED: 2,

    START: 0,
    END: 1,
    SINGLETON: 2,

    SEEN: 6,
    SUCCESSOR: 3,
    SUCCESSOR_OF_SUCCESSOR: 4,
    SUPPRESS: 5,

    SINGULAR: 0,
    PLURAL: 1,

    LITERAL: true,

    BEFORE: 1,
    AFTER: 2,

    DESCENDING: 1,
    ASCENDING: 2,

    PRIMARY: 1,
    SECONDARY: 2,
    
    POSITION_FIRST: 0,
    POSITION_SUBSEQUENT: 1,
    POSITION_IBID: 2,
    POSITION_IBID_WITH_LOCATOR: 3,
    POSITION_CONTAINER_SUBSEQUENT: 4,

    POSITION_MAP: {
        "0": 0,
        "4": 1,
        "1": 2,
        "2": 3,
        "3": 4
    },
    
    POSITION_TEST_VARS: ["position", "first-reference-note-number", "near-note"],

    AREAS: ["citation", "citation_sort", "bibliography", "bibliography_sort", "intext"],

    CITE_FIELDS: ["first-reference-note-number", "first-container-reference-note-number", "locator", "locator-extra"],

    SWAPPING_PUNCTUATION: [".", "!", "?", ":", ","],
    TERMINAL_PUNCTUATION: [":", ".", ";", "!", "?", " "],

    // update modes
    NONE: 0,
    NUMERIC: 1,
    POSITION: 2,
    TRIGRAPH: 3,

    DATE_PARTS: ["year", "month", "day"],
    DATE_PARTS_ALL: ["year", "month", "day", "season"],
    DATE_PARTS_INTERNAL: ["year", "month", "day", "year_end", "month_end", "day_end"],

    NAME_PARTS: ["non-dropping-particle", "family", "given", "dropping-particle", "suffix", "literal"],

    DISAMBIGUATE_OPTIONS: [
        "disambiguate-add-names",
        "disambiguate-add-givenname",
        "disambiguate-add-year-suffix"
    ],

    GIVENNAME_DISAMBIGUATION_RULES: [
        "all-names",
        "all-names-with-initials",
        "primary-name",
        "primary-name-with-initials",
        "by-cite"
    ],

    NAME_ATTRIBUTES: [
        "and",
        "delimiter-precedes-last",
        "delimiter-precedes-et-al",
        "initialize-with",
        "initialize",
        "name-as-sort-order",
        "sort-separator",
        "et-al-min",
        "et-al-use-first",
        "et-al-subsequent-min",
        "et-al-subsequent-use-first",
        "form",
        "prefix",
        "suffix",
        "delimiter"
    ],

    LOOSE: 0,
    STRICT: 1,
    TOLERANT: 2,

    PREFIX_PUNCTUATION: /[.;:]\s*$/,
    SUFFIX_PUNCTUATION: /^\s*[.;:,\(\)]/,

    NUMBER_REGEXP: /(?:^\d+|\d+$)/,
    //
    // \u0400-\u042f are cyrillic and extended cyrillic capitals
    // this is not fully smart yet.  can't do what this was trying to do
    // with regexps, actually; we want to identify strings with a leading
    // capital letter, and any subsequent capital letters.  Have to compare
    // locale caps version with existing version, character by character.
    // hard stuff, but if it breaks, that's what to do.
    // \u0600-\u06ff is Arabic/Persian
    // \u200c-\u200e and \u202a-\u202e are special spaces and left-right 
    // control characters



    NAME_INITIAL_REGEXP: /^([A-Z\u0e01-\u0e5b\u00c0-\u017f\u0400-\u042f\u0590-\u05d4\u05d6-\u05ff\u0600-\u06ff\u0370\u0372\u0376\u0386\u0388-\u03ab\u03e2\u03e4\u03e6\u03e8\u03ea\u03ec\u03ee\u03f4\u03f7\u03fd-\u03ff])([a-zA-Z\u0e01-\u0e5b\u00c0-\u017f\u0400-\u052f\u0600-\u06ff\u0370-\u03ff\u1f00-\u1fff]*|)(\.)*/,
    ROMANESQUE_REGEXP: /[-0-9a-zA-Z\u0e01-\u0e5b\u00c0-\u017f\u0370-\u03ff\u0400-\u052f\u0590-\u05d4\u05d6-\u05ff\u1f00-\u1fff\u0600-\u06ff\u200c\u200d\u200e\u0218\u0219\u021a\u021b\u202a-\u202e]/,
    ROMANESQUE_NOT_REGEXP: /[^a-zA-Z\u0e01-\u0e5b\u00c0-\u017f\u0370-\u03ff\u0400-\u052f\u0590-\u05d4\u05d6-\u05ff\u1f00-\u1fff\u0600-\u06ff\u200c\u200d\u200e\u0218\u0219\u021a\u021b\u202a-\u202e]/g,
    STARTSWITH_ROMANESQUE_REGEXP: /^[&a-zA-Z\u0e01-\u0e5b\u00c0-\u017f\u0370-\u03ff\u0400-\u052f\u0590-\u05d4\u05d6-\u05ff\u1f00-\u1fff\u0600-\u06ff\u200c\u200d\u200e\u0218\u0219\u021a\u021b\u202a-\u202e]/,
    ENDSWITH_ROMANESQUE_REGEXP: /[.;:&a-zA-Z\u0e01-\u0e5b\u00c0-\u017f\u0370-\u03ff\u0400-\u052f\u0590-\u05d4\u05d6-\u05ff\u1f00-\u1fff\u0600-\u06ff\u200c\u200d\u200e\u0218\u0219\u021a\u021b\u202a-\u202e]$/,
    ALL_ROMANESQUE_REGEXP: /^[a-zA-Z\u0e01-\u0e5b\u00c0-\u017f\u0370-\u03ff\u0400-\u052f\u0590-\u05d4\u05d6-\u05ff\u1f00-\u1fff\u0600-\u06ff\u200c\u200d\u200e\u0218\u0219\u021a\u021b\u202a-\u202e]+$/,

    VIETNAMESE_SPECIALS: /[\u00c0-\u00c3\u00c8-\u00ca\u00cc\u00cd\u00d2-\u00d5\u00d9\u00da\u00dd\u00e0-\u00e3\u00e8-\u00ea\u00ec\u00ed\u00f2-\u00f5\u00f9\u00fa\u00fd\u0101\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01a0\u01a1\u01af\u01b0\u1ea0-\u1ef9]/,

    VIETNAMESE_NAMES: /^(?:(?:[.AaBbCcDdEeGgHhIiKkLlMmNnOoPpQqRrSsTtUuVvXxYy \u00c0-\u00c3\u00c8-\u00ca\u00cc\u00cd\u00d2-\u00d5\u00d9\u00da\u00dd\u00e0-\u00e3\u00e8-\u00ea\u00ec\u00ed\u00f2-\u00f5\u00f9\u00fa\u00fd\u0101\u0103\u0110\u0111\u0128\u0129\u0168\u0169\u01a0\u01a1\u01af\u01b0\u1ea0-\u1ef9]{2,6})(\s+|$))+$/,

    NOTE_FIELDS_REGEXP: /\{:(?:[\-_a-z]+|[A-Z]+):[^\}]+\}/g,
    NOTE_FIELD_REGEXP: /^([\-_a-z]+|[A-Z]+):\s*([^\}]+)$/,

	PARTICLE_GIVEN_REGEXP: /^([^ ]+(?:\u02bb |\u2019 | |\' ) *)(.+)$/,
	PARTICLE_FAMILY_REGEXP: /^([^ ]+(?:\-|\u02bb|\u2019| |\') *)(.+)$/,

    DISPLAY_CLASSES: ["block", "left-margin", "right-inline", "indent"],

    NAME_VARIABLES: [
        "author",
        "chair",
        "collection-editor",
        "compiler",
        "composer",
        "container-author",
        "contributor",
        "curator",
        "director",
        "editor",
        "editor-translator", 
        "editorial-director",
        "executive-producer",
        "guest",
        "host",
        "illustrator",
        "interviewer",
        "narrator", 
        "organizer",
        "original-author",
        "performer",
        "producer",
        "recipient",
        "reviewed-author",
        "script-writer",
        "series-creator",
        "translator",
        "commenter"
    ],
    CREATORS: [
        "author",
        "chair",
        "collection-editor",
        "compiler",
        "composer",
        "container-author",
        "contributor",
        "curator",
        "director",
        "editor",
        "editor-translator", 
        "editorial-director",
        "executive-producer",
        "guest",
        "host",
        "illustrator",
        "interviewer",
        "narrator", 
        "organizer",
        "original-author",
        "performer",
        "producer",
        "recipient",
        "reviewed-author",
        "script-writer",
        "series-creator",
        "translator",
        "commenter"
    ],
    NUMERIC_VARIABLES: [
        "call-number",
        "chapter-number",
        "collection-number",
        "division",
        "edition",
        "page",
        "issue",
        "locator",
        "locator-extra",
        "number",
        "number-of-pages",
        "number-of-volumes",
        "part-number",
        "printing-number",
        "section",
        "supplement-number",
        "version",
        "volume",
        "supplement", // maybe deprecated this? supplement-number should serve this purpose in standard CSL.
        "citation-number"
    ],
    //var x = new Array();
    //x = x.concat(["title","container-title","issued","page"]);
    //x = x.concat(["locator","collection-number","original-date"]);
    //x = x.concat(["reporting-date","decision-date","filing-date"]);
    //x = x.concat(["revision-date"]);
    //NUMERIC_VARIABLES = x.slice();
    DATE_VARIABLES: [
        "locator-date", 
        "issued", 
        "event-date", 
        "accessed", 
        "original-date",
        "publication-date",
        "available-date",
        "submitted",
        "alt-issued",
        "alt-event"
    ],
    VARIABLES_WITH_SHORT_FORM: [
        "title",
        "container-title"
    ],
    TITLE_FIELD_SPLITS: function(seg) {
        var keys = ["title", "short", "main", "sub", "subjoin"];
        var ret = {};
        for (var i=0,ilen=keys.length;i<ilen;i++) {
            ret[keys[i]] = seg + "title" + (keys[i] === "title" ? "" : "-" + keys[i]);
        }
        return ret;
    },
    
    demoteNoiseWords: function (state, fld, drop_or_demote) {
        var SKIP_WORDS = state.locale[state.opt.lang].opts["leading-noise-words"];
        if (fld && drop_or_demote) {
            fld = fld.split(/\s+/);
            fld.reverse();
            var toEnd = [];
            for (var j  = fld.length - 1; j > -1; j += -1) {
                if (SKIP_WORDS.indexOf(fld[j].toLowerCase()) > -1) {
                    toEnd.push(fld.pop());
                } else {
                    break;
                }
            }
            fld.reverse();
            var start = fld.join(" ");
            var end = toEnd.join(" ");
            if ("drop" === drop_or_demote || !end) {
                fld = start;
            } else if ("demote" === drop_or_demote) {
                fld = [start, end].join(", ");
            }
        }
        return fld;
    },

    extractTitleAndSubtitle: function (Item, narrowSpaceLocale) {
        var narrowSpace = narrowSpaceLocale ? "\u202f" : "";
        // XXX In this function, split on split-char, but prefer exact match
        // XXX of subtitle to a split-char in title if found.
        var segments = [""];
        if (this.opt.development_extensions.split_container_title) {
            segments.push("container-");
        }
        for (var i=0,ilen=segments.length;i<ilen;i++) {
            var seg = segments[i];
            var title = CSL.TITLE_FIELD_SPLITS(seg);
            var langs = [false];
            if (Item.multi) {
                for (var lang in Item.multi._keys[title.short]) {
                    langs.push(lang);
                }
            }
            for (var j=0,jlen=langs.length;j<jlen;j++) {
                var lang = langs[j];
                var vals = {};
                if (lang) {
                    if (Item.multi._keys[title.title]) {
                        vals[title.title] = Item.multi._keys[title.title][lang];
                    }
                    if (Item.multi._keys[title["short"]]) {
                        vals[title["short"]] = Item.multi._keys[title["short"]][lang];
                    }
                } else {
                    vals[title.title] = Item[title.title];
                    vals[title["short"]] = Item[title["short"]];
                }
                vals[title.main] = vals[title.title];
                vals[title.sub] = false;
                var shortTitle = vals[title["short"]];
                if (vals[title.title]) {
                    // Rules
                    // TITLE_SPLIT eliminates split-points of period-space preceded by a capital letter.
                    // If short title exists and matches exactly to a split-point, use that split-point only.
                    // Otherwise if there is just one split-point, use that as main/sub split.
                    // Otherwise use all split-points ... which is handled in titleCaseSentenceOrNormal, not here.
                    if (shortTitle && shortTitle.toLowerCase() === vals[title.title].toLowerCase()) {
                        vals[title.main] = vals[title.title];
                        vals[title.subjoin] = "";
                        vals[title.sub] = "";
                    } else if (shortTitle) {
                        // check for valid match to shortTitle
                        var tail = vals[title.title].slice(shortTitle.replace(/[\?\!]+$/, "").length);
                        var top = vals[title.title].replace(tail.replace(/^[\?\!]+/, ""), "").trim();
                        var m = CSL.TITLE_SPLIT_REGEXP.matchfirst.exec(tail);
                        if (m && top.toLowerCase() === shortTitle.toLowerCase()) {
                            vals[title.main] = top;
                            vals[title.subjoin] = m[1].replace(/[\?\!]+(\s*)$/, "$1");
                            vals[title.sub] = tail.replace(CSL.TITLE_SPLIT_REGEXP.matchfirst, "");
                            if (this.opt.development_extensions.force_short_title_casing_alignment) {
                                vals[title["short"]] = vals[title.main];
                            }
                        } else {
                            var splitTitle = CSL.TITLE_SPLIT(vals[title.title]);
                            if (splitTitle.length == 3) {
                                vals[title.main] = splitTitle[0];
                                vals[title.subjoin] = splitTitle[1];
                                vals[title.sub] = splitTitle[2];
                            } else {
                                vals[title.main] = vals[title.title];
                                vals[title.subjoin] = "";
                                vals[title.sub] = "";
                            }
                        }
                    } else {
                        var splitTitle = CSL.TITLE_SPLIT(vals[title.title]);
                        if (splitTitle.length == 3) {
                            vals[title.main] = splitTitle[0];
                            vals[title.subjoin] = splitTitle[1];
                            vals[title.sub] = splitTitle[2];
                            if (this.opt.development_extensions.implicit_short_title && Item.type !== "legal_case") {
                                if (!Item[title.short] && !vals[title.main].match(/^[\-\.[0-9]+$/)) {
                                    var punct = vals[title.subjoin].trim();
                                    if (["?", "!"].indexOf(punct) === -1) {
                                        punct = "";
                                    }
                                    vals[title.short] = vals[title.main] + punct;
                                }
                            }
                        } else {
                            vals[title.main] = vals[title.title];
                            vals[title.subjoin] = "";
                            vals[title.sub] = "";
                        }
                    }
                    if (vals[title.subjoin]) {
                        if (vals[title.subjoin].match(/([\?\!])/)) {
                            var m = vals[title.subjoin].match(/(\s*)$/)
                            vals[title.main] = vals[title.main] + narrowSpace +vals[title.subjoin].trim();
                            vals[title.subjoin] = m[1];
                        }
                    }
                }
                if (vals[title.subjoin]) {
                    if (vals[title.subjoin].indexOf(":") > -1) {
                        vals[title.subjoin] = narrowSpace + ": ";
                    }
                    if (vals[title.subjoin].indexOf("-") > -1 || vals[title.subjoin].indexOf("—") > -1) {
                        vals[title.subjoin] = "—";
                    }
                }
                if (lang) {
                    for (var key in vals) {
                        if (!Item.multi._keys[key]) {
                            Item.multi._keys[key] = {};
                        }
                        Item.multi._keys[key][lang] = vals[key];
                    }
                } else {
                    for (var key in vals) {
                        Item[key] = vals[key];
                    }
                }
            }
        }
    },

    titlecaseSentenceOrNormal: function(state, Item, seg, lang, sentenceCase) {
        // Hold on here.
        // What is seg here?
        // It's ... either "" or "container-". Which is ugly, but works.
        // But this ALWAYS returns the full title, never short.
        // So sentence-casing cannot be applied to short.
        // Goes unnoticed because forced sentence-casing almost never appears in styles.
        var title = CSL.TITLE_FIELD_SPLITS(seg);
        var vals = {};
        if (lang && Item.multi) {
            if (Item.multi._keys[title.title]) {
                vals[title.title] = Item.multi._keys[title.title][lang];
            }
            if (Item.multi._keys[title.main]) {
                vals[title.main] = Item.multi._keys[title.main][lang];
            }
            if (Item.multi._keys[title.sub]) {
                vals[title.sub] = Item.multi._keys[title.sub][lang];
            }
            if (Item.multi._keys[title.subjoin]) {
                vals[title.subjoin] = Item.multi._keys[title.subjoin][lang];
            }
        } else {
            vals[title.title] = Item[title.title];
            vals[title.main] = Item[title.main];
            vals[title.sub] = Item[title.sub];
            vals[title.subjoin] = Item[title.subjoin];
        }
        if (vals[title.main] && vals[title.sub]) {
            var mainTitle = vals[title.main];
            var subJoin = vals[title.subjoin];
            var subTitle = vals[title.sub];
            if (sentenceCase) {
                mainTitle = CSL.Output.Formatters.sentence(state, mainTitle);
                subTitle = CSL.Output.Formatters.sentence(state, subTitle);
            } else if (state.opt.development_extensions.uppercase_subtitles) {
                subTitle = CSL.Output.Formatters["capitalize-first"](state, subTitle);
            }
            return [mainTitle, subJoin, subTitle].join("");
        } else if (vals[title.title]) {
            if (sentenceCase) {
                return CSL.Output.Formatters.sentence(state, vals[title.title]);
            } else if (state.opt.development_extensions.uppercase_subtitles) {
                // Split and apply everywhere.
                var splits = CSL.TITLE_SPLIT(vals[title.title]);
                for (var i=0,ilen=splits.length; i<ilen; i += 2) {
                    splits[i] = CSL.Output.Formatters["capitalize-first"](state, splits[i]);
                }
                for (var i=1, ilen=splits.length-1; i < ilen; i += 2) {
                    var m = splits[i].match(/([:\?\!] )/);
                    if (m) {
                        var narrowSpace = state.opt["default-locale"][0].slice(0, 2).toLowerCase() === "fr" ? "\u202f" : "";
                        splits[i] = narrowSpace + m[1];
                    }
                    if (splits[i].indexOf("-") > -1 || splits[i].indexOf("—") > -1) {
                        splits[i] = "—";
                    }
                }
                vals[title.title] = splits.join("");
                return vals[title.title];
            } else {
                return vals[title.title];
            }
        } else {
            return "";
        }
    },

    getSafeEscape: function(state) {
        if (["bibliography", "citation"].indexOf(state.tmp.area) > -1) {
            // Callback to apply thin space hack
            // Callback to force LTR/RTL on parens and braces
            // XXX Is this really necessary?
            var callbacks = [];
            if (state.opt.development_extensions.thin_non_breaking_space_html_hack && state.opt.mode === "html") {
                callbacks.push(function (txt) {
                    return txt.replace(/\u202f/g, '<span style="white-space:nowrap">&thinsp;</span>');
                });
            }
            if (callbacks.length) {
                return function (txt) {
                    for (var i = 0, ilen = callbacks.length; i < ilen; i += 1) {
                        txt = callbacks[i](txt);
                    }
                    return CSL.Output.Formats[state.opt.mode].text_escape(txt);
                };
            } else {
                return CSL.Output.Formats[state.opt.mode].text_escape;
            }
        } else {
            return function (txt) { return txt; };
        }
    },

    SKIP_WORDS: ["about","above","across","afore","after","against","al", "along","alongside","amid","amidst","among","amongst","anenst","apropos","apud","around","as","aside","astride","at","athwart","atop","barring","before","behind","below","beneath","beside","besides","between","beyond","but","by","circa","despite","down","during","et", "except","for","forenenst","from","given","in","inside","into","lest","like","modulo","near","next","notwithstanding","of","off","on","onto","out","over","per","plus","pro","qua","sans","since","than","through"," thru","throughout","thruout","till","to","toward","towards","under","underneath","until","unto","up","upon","versus","vs.","v.","vs","v","via","vis-à-vis","with","within","without","according to","ahead of","apart from","as for","as of","as per","as regards","aside from","back to","because of","close to","due to","except for","far from","inside of","instead of","near to","next to","on to","out from","out of","outside of","prior to","pursuant to","rather than","regardless of","such as","that of","up to","where as","or", "yet", "so", "for", "and", "nor", "a", "an", "the", "de", "d'", "von", "van", "c", "ca"],

    FORMAT_KEY_SEQUENCE: [
        "@strip-periods",
        "@font-style",
        "@font-variant",
        "@font-weight",
        "@text-decoration",
        "@vertical-align",
        "@quotes"
    ],

    INSTITUTION_KEYS: [
        "font-style",
        "font-variant",
        "font-weight",
        "text-decoration",
        "text-case"
    ],

    SUFFIX_CHARS: "a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z",
    ROMAN_NUMERALS: [
        [ "", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix" ],
        [ "", "x", "xx", "xxx", "xl", "l", "lx", "lxx", "lxxx", "xc" ],
        [ "", "c", "cc", "ccc", "cd", "d", "dc", "dcc", "dccc", "cm" ],
        [ "", "m", "mm", "mmm", "mmmm", "mmmmm"]
    ],

    LANGS: {
        "af-ZA":"Afrikaans",
        "ar":"Arabic",
        "bg-BG":"Bulgarian",
        "ca-AD":"Catalan",
        "cs-CZ":"Czech",
        "da-DK":"Danish",
        "de-AT":"Austrian",
        "de-CH":"German (CH)",
        "de-DE":"German (DE)",
        "el-GR":"Greek",
        "en-GB":"English (GB)",
        "en-US":"English (US)",
        "es-ES":"Spanish",
        "et-EE":"Estonian",
        "eu":"European",
        "fa-IR":"Persian",
        "fi-FI":"Finnish",
        "fr-CA":"French (CA)",
        "fr-FR":"French (FR)",
        "he-IL":"Hebrew",
        "hr-HR":"Croatian",
        "hu-HU":"Hungarian",
        "is-IS":"Icelandic",
        "it-IT":"Italian",
        "ja-JP":"Japanese",
        "km-KH":"Khmer",
        "ko-KR":"Korean",
        "lt-LT":"Lithuanian",
        "lv-LV":"Latvian",
        "mn-MN":"Mongolian",
        "nb-NO":"Norwegian (Bokmål)",
        "nl-NL":"Dutch",
        "nn-NO":"Norwegian (Nynorsk)",
        "pl-PL":"Polish",
        "pt-BR":"Portuguese (BR)",
        "pt-PT":"Portuguese (PT)",
        "ro-RO":"Romanian",
        "ru-RU":"Russian",
        "sk-SK":"Slovak",
        "sl-SI":"Slovenian",
        "sr-RS":"Serbian",
        "sv-SE":"Swedish",
        "th-TH":"Thai",
        "tr-TR":"Turkish",
        "uk-UA":"Ukrainian",
        "vi-VN":"Vietnamese",
        "zh-CN":"Chinese (CN)",
        "zh-TW":"Chinese (TW)"
    },

    LANG_BASES: {
        af: "af_ZA",
        ar: "ar",
        bg: "bg_BG",
        ca: "ca_AD",
        cs: "cs_CZ",
        da: "da_DK",
        de: "de_DE",
        el: "el_GR",
        en: "en_US",
        es: "es_ES",
        et: "et_EE",
        eu: "eu",
        fa: "fa_IR",
        fi: "fi_FI",
        fr: "fr_FR",
        he: "he_IL",
        hr: "hr-HR",
        hu: "hu_HU",
        is: "is_IS",
        it: "it_IT",
        ja: "ja_JP",
        km: "km_KH",
        ko: "ko_KR",
        lt: "lt_LT",
        lv: "lv-LV",
        mn: "mn_MN",
        nb: "nb_NO",
        nl: "nl_NL",
        nn: "nn-NO",
        pl: "pl_PL",
        pt: "pt_PT",
        ro: "ro_RO",
        ru: "ru_RU",
        sk: "sk_SK",
        sl: "sl_SI",
        sr: "sr_RS",
        sv: "sv_SE",
        th: "th_TH",
        tr: "tr_TR",
        uk: "uk_UA",
        vi: "vi_VN",
        zh: "zh_CN"
    },

    SUPERSCRIPTS: {
        "\u00AA": "\u0061",
        "\u00B2": "\u0032",
        "\u00B3": "\u0033",
        "\u00B9": "\u0031",
        "\u00BA": "\u006F",
        "\u02B0": "\u0068",
        "\u02B1": "\u0266",
        "\u02B2": "\u006A",
        "\u02B3": "\u0072",
        "\u02B4": "\u0279",
        "\u02B5": "\u027B",
        "\u02B6": "\u0281",
        "\u02B7": "\u0077",
        "\u02B8": "\u0079",
        "\u02E0": "\u0263",
        "\u02E1": "\u006C",
        "\u02E2": "\u0073",
        "\u02E3": "\u0078",
        "\u02E4": "\u0295",
        "\u1D2C": "\u0041",
        "\u1D2D": "\u00C6",
        "\u1D2E": "\u0042",
        "\u1D30": "\u0044",
        "\u1D31": "\u0045",
        "\u1D32": "\u018E",
        "\u1D33": "\u0047",
        "\u1D34": "\u0048",
        "\u1D35": "\u0049",
        "\u1D36": "\u004A",
        "\u1D37": "\u004B",
        "\u1D38": "\u004C",
        "\u1D39": "\u004D",
        "\u1D3A": "\u004E",
        "\u1D3C": "\u004F",
        "\u1D3D": "\u0222",
        "\u1D3E": "\u0050",
        "\u1D3F": "\u0052",
        "\u1D40": "\u0054",
        "\u1D41": "\u0055",
        "\u1D42": "\u0057",
        "\u1D43": "\u0061",
        "\u1D44": "\u0250",
        "\u1D45": "\u0251",
        "\u1D46": "\u1D02",
        "\u1D47": "\u0062",
        "\u1D48": "\u0064",
        "\u1D49": "\u0065",
        "\u1D4A": "\u0259",
        "\u1D4B": "\u025B",
        "\u1D4C": "\u025C",
        "\u1D4D": "\u0067",
        "\u1D4F": "\u006B",
        "\u1D50": "\u006D",
        "\u1D51": "\u014B",
        "\u1D52": "\u006F",
        "\u1D53": "\u0254",
        "\u1D54": "\u1D16",
        "\u1D55": "\u1D17",
        "\u1D56": "\u0070",
        "\u1D57": "\u0074",
        "\u1D58": "\u0075",
        "\u1D59": "\u1D1D",
        "\u1D5A": "\u026F",
        "\u1D5B": "\u0076",
        "\u1D5C": "\u1D25",
        "\u1D5D": "\u03B2",
        "\u1D5E": "\u03B3",
        "\u1D5F": "\u03B4",
        "\u1D60": "\u03C6",
        "\u1D61": "\u03C7",
        "\u2070": "\u0030",
        "\u2071": "\u0069",
        "\u2074": "\u0034",
        "\u2075": "\u0035",
        "\u2076": "\u0036",
        "\u2077": "\u0037",
        "\u2078": "\u0038",
        "\u2079": "\u0039",
        "\u207A": "\u002B",
        "\u207B": "\u2212",
        "\u207C": "\u003D",
        "\u207D": "\u0028",
        "\u207E": "\u0029",
        "\u207F": "\u006E",
        "\u2120": "\u0053\u004D",
        "\u2122": "\u0054\u004D",
        "\u3192": "\u4E00",
        "\u3193": "\u4E8C",
        "\u3194": "\u4E09",
        "\u3195": "\u56DB",
        "\u3196": "\u4E0A",
        "\u3197": "\u4E2D",
        "\u3198": "\u4E0B",
        "\u3199": "\u7532",
        "\u319A": "\u4E59",
        "\u319B": "\u4E19",
        "\u319C": "\u4E01",
        "\u319D": "\u5929",
        "\u319E": "\u5730",
        "\u319F": "\u4EBA",
        "\u02C0": "\u0294",
        "\u02C1": "\u0295",
        "\u06E5": "\u0648",
        "\u06E6": "\u064A"
    },
    SUPERSCRIPTS_REGEXP: new RegExp("[\u00AA\u00B2\u00B3\u00B9\u00BA\u02B0\u02B1\u02B2\u02B3\u02B4\u02B5\u02B6\u02B7\u02B8\u02E0\u02E1\u02E2\u02E3\u02E4\u1D2C\u1D2D\u1D2E\u1D30\u1D31\u1D32\u1D33\u1D34\u1D35\u1D36\u1D37\u1D38\u1D39\u1D3A\u1D3C\u1D3D\u1D3E\u1D3F\u1D40\u1D41\u1D42\u1D43\u1D44\u1D45\u1D46\u1D47\u1D48\u1D49\u1D4A\u1D4B\u1D4C\u1D4D\u1D4F\u1D50\u1D51\u1D52\u1D53\u1D54\u1D55\u1D56\u1D57\u1D58\u1D59\u1D5A\u1D5B\u1D5C\u1D5D\u1D5E\u1D5F\u1D60\u1D61\u2070\u2071\u2074\u2075\u2076\u2077\u2078\u2079\u207A\u207B\u207C\u207D\u207E\u207F\u2120\u2122\u3192\u3193\u3194\u3195\u3196\u3197\u3198\u3199\u319A\u319B\u319C\u319D\u319E\u319F\u02C0\u02C1\u06E5\u06E6]", "g"),

    // I think we need to have separate args for prefix and term,
    // since they have different effects between comma-safe and comma-safe-numbers-only.
    // Either that, or -- oh, we could just bang the two together for the test where
    // necessary.
    
    UPDATE_GROUP_CONTEXT_CONDITION: function (state, str, valueTerm, token, value) {
        if (!state.opt.use_context_condition) return;
        var flags = state.tmp.group_context.tip;
        if (flags.condition) {
            if (!flags.condition.termtxt) {
                flags.condition.termtxt = str;
                flags.condition.valueTerm = valueTerm;
            }
            if (!flags.value_seen && flags.condition.test === "comma-safe-numbers-only") {
                if (value) {
                    flags.value_seen = true;
                    if (!value.match(/^[0-9]/)) {
                        state.tmp.just_did_number = false;
                    }
                }
            }
        } else {
            // If not inside a conditional group, raise numeric flag
            // if and only if the current term string ends in a number.
            if (token && token.decorations.filter(o => o[0] === "@vertical-align").length > 0) {
                state.tmp.just_did_number = false;
            } else if (token && token.strings.suffix) {
                state.tmp.just_did_number = false;
            } else if (str) {
                if (str.match(/[0-9]$/)) {
                    state.tmp.just_did_number = true;
                } else {
                    state.tmp.just_did_number = false;
                }
            }
        }
    },

    EVALUATE_GROUP_CONDITION: function(state, flags) {
        if (!state.opt.use_context_condition) return;
        var testres;
        var numbersOnly = flags.condition.test === "comma-safe-numbers-only";
        if (flags.condition.test === "empty-label") {
            testres = !flags.condition.termtxt;
        } else if (flags.condition.test === "empty-label-no-decor") {
            testres = !flags.condition.termtxt || flags.condition.termtxt.indexOf("%s") > -1;
        } else if (["comma-safe", "comma-safe-numbers-only"].indexOf(flags.condition.test) > -1) {
            var locale_term = flags.condition.termtxt;
            var termStartAlpha = false;
            if (flags.condition.termtxt) {
                termStartAlpha = flags.condition.termtxt.slice(0,1).match(CSL.ALL_ROMANESQUE_REGEXP);
            }
            var num = state.tmp.just_did_number;
            if (num) {
                if (flags.condition.valueTerm) {
                    testres = numbersOnly ? false : true;
                } else if (!locale_term) {
                    testres = true;
                } else if (termStartAlpha) {
                    testres = numbersOnly ? false : true;
                } else if (["always", "after-number"].indexOf(state.opt.require_comma_on_symbol) > -1) {
                    testres = true;
                } else {
                    testres = false;
                }
            } else {
                if (flags.condition.valueTerm) {
                    testres = false;
                } else if (!locale_term) {
                    testres = false;
                } else if (termStartAlpha) {
                    testres = numbersOnly ? false : true;
                } else if (state.opt.require_comma_on_symbol === "always") {
                    testres = true;
                } else {
                    testres = false;
                }
            }
        }
        if (testres) {
            var force_suppress = false;
        } else {
            var force_suppress = true;
        }
        if (flags.condition.not) {
            force_suppress = !force_suppress;
        }
        return force_suppress;
    },
    
    SYS_OPTIONS: [
        "prioritize_disambiguate_condition",
        "csl_reverse_lookup_support",
        "main_title_from_short_title",
        "uppercase_subtitles",
        "force_short_title_casing_alignment",
        "implicit_short_title",
        "split_container_title"
    ],

    TITLE_SPLIT_REGEXP: (function() {
        var splits = [
            "\\.\\s+",
            "\\!\\s+",
            "\\?\\s+",
            "\\s*::*\\s+",
            "\\s*—\\s*",
            "\\s+\\-\\s+",
            "\\s*\\-\\-\\-*\\s*"
        ]
        return {
            match: new RegExp("(" + splits.join("|") + ")", "g"),
            matchfirst: new RegExp("^(" + splits.join("|") + ")"),
            split: new RegExp("(?:" + splits.join("|") + ")")
        }
    })(),

    TITLE_SPLIT: function(str) {
        if (!str) {
            return str;
        }
        var m = str.match(CSL.TITLE_SPLIT_REGEXP.match);
        var lst = str.split(CSL.TITLE_SPLIT_REGEXP.split);
        for (var i=lst.length-2; i>-1; i--) {
            lst[i] = lst[i].trim();
            if (lst[i] && lst[i].slice(-1).toLowerCase() !== lst[i].slice(-1)) {
                // recombine
                lst[i] = lst[i] + m[i] + lst[i+1];
                lst = lst.slice(0, i+1).concat(lst.slice(i+2))
            } else {
                // merge
                lst = lst.slice(0, i+1).concat([m[i]]).concat(lst.slice(i+1))
            }
        }
        return lst;
    },
    
    GET_COURT_CLASS: function(state, Item, sortKey){
        // Get authority as a string
        var cls = "";
        var authority = null;
        var country = Item.jurisdiction ? Item.jurisdiction.split(":")[0] : null;
        // inStyle versus in module
        var classType = "court_condition_classes";
        if (sortKey) {
            classType = "court_key_classes";
        }
        if (country && Item.authority) {
            if ("string" === typeof Item.authority) {
                authority = Item.authority;
            } else {
                if (Item.authority[0] && Item.authority[0].literal) {
                    authority = Item.authority[0].literal;
                }
            }
        }
        if (authority) {
            if (this.lang && state.locale[this.lang].opts[classType] && state.locale[this.lang].opts[classType][country] && state.locale[this.lang].opts[classType][country][authority]) {
                cls = state.locale[this.lang].opts[classType][country][authority];
            } else if (state.locale[state.opt["default-locale"][0]].opts[classType] && state.locale[state.opt["default-locale"][0]].opts[classType][country] && state.locale[state.opt["default-locale"][0]].opts[classType][country][authority]) {
                cls = state.locale[state.opt["default-locale"][0]].opts[classType][country][authority]
            }
        }
        return cls;
    },

    SET_COURT_CLASSES: function(state, lang, myxml, dataObj) {
        var nodes = myxml.getNodesByName(dataObj, 'court-class');
        for (var pos = 0, len = myxml.numberofnodes(nodes); pos < len; pos += 1) {
            var courtclass = nodes[pos];
            var attributes = myxml.attributes(courtclass);
            var cls = attributes["@name"];
            var country = attributes["@country"];
            var courts = attributes["@courts"];
            
            // Okay, this is a hack.
            // If state.registry IS NOT yet defined, this is an in-style declaration.
            // If state.registry IS defined, this is an in-module declaration.
            var classType = "court_key_classes";
            if (state.registry) {
                classType = "court_condition_classes";
            }
            
            if (cls && country && courts) {
                courts = courts.trim().split(/\s+/);
                if (!state.locale[lang].opts[classType]) {
                    state.locale[lang].opts[classType] = {};
                }
                if (!state.locale[lang].opts[classType][country]) {
                    state.locale[lang].opts[classType][country] = {};
                }
                for (var i=0,ilen=courts.length;i<ilen;i++) {
                    state.locale[lang].opts[classType][country][courts[i]] = cls;
                }
            }
        }
    },

    INIT_JURISDICTION_MACROS: function (state, Item, item, macroName) {
        if (Item["best-jurisdiction"]) {
            return true;
        }
        if (!state.sys.retrieveStyleModule || !CSL.MODULE_MACROS[macroName] || !Item.jurisdiction) {
            return false;
        }
        var jurisdictionList = state.getJurisdictionList(Item.jurisdiction);
        // Set up a list of jurisdictions here, we will reuse it
        if (!state.opt.jurisdictions_seen[jurisdictionList[0]]) {
            var res = state.retrieveAllStyleModules(jurisdictionList);
            // Okay. We have code for each of the novel modules in the
            // hierarchy. Load them all into the processor.
            for (var jurisdiction in res) {
                var fallback = state.loadStyleModule(jurisdiction, res[jurisdiction]);
                if (fallback) {
                    if (!res[fallback]) {
                        Object.assign(res, state.retrieveAllStyleModules([fallback]));
                        state.loadStyleModule(fallback, res[fallback], true);
                    }
                }
            }
        }
        if (state.opt.parallel.enable) {
            if (!state.parallel) {
                state.parallel = new CSL.Parallel(state);
            }
        }
        // Identify the best jurisdiction for the item and return true, otherwise return false
        for (var i=0,ilen=jurisdictionList.length;i<ilen;i++) {
            var jurisdiction = jurisdictionList[i];
            if (item) {
                if (state.juris[jurisdiction] && !item["best-jurisdiction"] && state.juris[jurisdiction].types.locator) {
                    Item["best-jurisdiction"] = jurisdiction;
                }
            }
            if(state.juris[jurisdiction] && state.juris[jurisdiction].types[Item.type]) {
                Item["best-jurisdiction"] = jurisdiction;
                return true;
            }
        }
        return false;
    }
};
