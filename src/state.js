/*global CSL: true */

CSL.Engine.Opt = function () {
    this.parallel = {
        enable: false,
    },
    this.has_disambiguate = false;
    this.mode = "html";
    this.dates = {};
    this.jurisdictions_seen = {};
    this.suppressedJurisdictions = {};
    this.inheritedAttributes = {};
    this["locale-sort"] = [];
    this["locale-translit"] = [];
    this["locale-translat"] = [];
    this.citeAffixes = {
        persons:{
            "locale-orig":{
                prefix:"",
                suffix:""
            },
            "locale-translit":{
                prefix:"",
                suffix:""
            },
            "locale-translat":{
                prefix:"",
                suffix:""
            }
        },
        institutions:{
            "locale-orig":{
                prefix:"",
                suffix:""
            },
            "locale-translit":{
                prefix:"",
                suffix:""
            },
            "locale-translat":{
                prefix:"",
                suffix:""
            }
        },
        titles:{
            "locale-orig":{
                prefix:"",
                suffix:""
            },
            "locale-translit":{
                prefix:"",
                suffix:""
            },
            "locale-translat":{
                prefix:"",
                suffix:""
            }
        },
        journals:{
            "locale-orig":{
                prefix:"",
                suffix:""
            },
            "locale-translit":{
                prefix:"",
                suffix:""
            },
            "locale-translat":{
                prefix:"",
                suffix:""
            }
        },
        publishers:{
            "locale-orig":{
                prefix:"",
                suffix:""
            },
            "locale-translit":{
                prefix:"",
                suffix:""
            },
            "locale-translat":{
                prefix:"",
                suffix:""
            }
        },
        places:{
            "locale-orig":{
                prefix:"",
                suffix:""
            },
            "locale-translit":{
                prefix:"",
                suffix:""
            },
            "locale-translat":{
                prefix:"",
                suffix:""
            }
        }
    };
    this["default-locale"] = [];
    this.update_mode = CSL.NONE;
    this.bib_mode = CSL.NONE;
    this.sort_citations = false;
    /*
     * Default values.
     * The various et-al values are set globally,
     * and the appropriate value is set by the names start
     * tag at runtime, depending on whether the Item is a
     * first or a subsequent reference.
     */
    this["et-al-min"] = 0;
    this["et-al-use-first"] = 1;
    this["et-al-use-last"] = false;
    this["et-al-subsequent-min"] = false;
    this["et-al-subsequent-use-first"] = false;

    this["demote-non-dropping-particle"] = "display-and-sort";
    // default of true, because none of our consuming
    // applications so far store the various prefixes and 
    // suffixes we support in separate fields.
    this["parse-names"] = true;
    // this["auto-vietnamese-names"] = true;
    
    /*
    Support Japanese katakana
    default "legacy-order": always セイメイ
    activate "normal-order": メイ、セイ and セイ・メイ 
    */
    this["katakana-display"] = "normal-order";

    this.citation_number_slug = false;
    this.trigraph = "Aaaa00:AaAa00:AaAA00:AAAA00";

    this.nodenames = [];

    this.gender = {};
    this['cite-lang-prefs'] = {
        persons:['orig'],
        institutions:['orig'],
        titles:['orig'],
        journals:['orig'],
        publishers:['orig'],
        places:['orig'],
        number:['orig']
    };

    this.has_layout_locale = false;
    this.disable_duplicate_year_suppression = [];
    this.use_context_condition = false;

    this.jurisdiction_fallbacks = {};

    this.development_extensions = {};
    this.development_extensions.field_hack = true;
    this.development_extensions.allow_field_hack_date_override = true;
    this.development_extensions.locator_date_and_revision = true;
    this.development_extensions.locator_label_parse = true;
    this.development_extensions.raw_date_parsing = true;
    this.development_extensions.clean_up_csl_flaws = true;
    this.development_extensions.consolidate_legal_items = false;
    this.development_extensions.csl_reverse_lookup_support = false;
    this.development_extensions.wrap_url_and_doi = false;
    this.development_extensions.thin_non_breaking_space_html_hack = false;
    this.development_extensions.apply_citation_wrapper = false;
    this.development_extensions.main_title_from_short_title = false;
    this.development_extensions.uppercase_subtitles = false;
    this.development_extensions.normalize_lang_keys_to_lowercase = false;
    this.development_extensions.strict_text_case_locales = false;
    this.development_extensions.expect_and_symbol_form = false;
    this.development_extensions.require_explicit_legal_case_title_short = false;
    this.development_extensions.spoof_institutional_affiliations = false;
    this.development_extensions.force_jurisdiction = false;
    this.development_extensions.parse_names = true;
    this.development_extensions.hanging_indent_legacy_number = false;
    this.development_extensions.throw_on_empty = false;
    this.development_extensions.strict_inputs = true;
    this.development_extensions.prioritize_disambiguate_condition = false;
    this.development_extensions.force_short_title_casing_alignment = true;
    this.development_extensions.implicit_short_title = false;
    this.development_extensions.force_title_abbrev_fallback = false;
    this.development_extensions.split_container_title = false;
    this.development_extensions.legacy_institution_name_ordering = false;
    this.development_extensions.etal_min_etal_usefirst_hack = false;
};

CSL.Engine.Tmp = function () {
    //
    // scratch variable to display the total
    // number of names in all rendered variables
    // in a cite.  initialized to zero by the
    // citation element, incremented by each
    // name variable actually rendered
    this.names_max = new CSL.Stack();
    this.names_base = new CSL.Stack();
    this.givens_base = new CSL.Stack();
    //
    // this holds the field values collected by the @value
    // and @variable attributes, for processing by the
    // element functions.
    this.value = [];
    /**
     * Object to hold the decorations declared by a name-part
     * element.
     */
    this.namepart_decorations = {};
    /**
     * String variable to hold the type of a name-part
     * element.
     */
    this.namepart_type = false;
    //
    // scratch variable to flag whether we are processing
    // a citation or a bibiliography.  this diverts token and
    // configuration to the appropriateo objects inside
    // state.  the default is "citation".
    this.area = "citation";
    this.root = "citation";
    this.extension = "";
    //
    // controls the implicit conditional wrappers applied
    // to top-level elements inside a names substitute span.
    // false by default, names start tag pushes a new true level,
    // names end tag pops it.  Output value check in @variable
    // function of attributes.js sets level to false.  closing names
    // tag maps a false value to superior level.
    this.can_substitute = new CSL.Stack(0, CSL.LITERAL);
    //
    // notes whether the formatted elements of a date span
    // rendered anything.  controls whether literal fallback
    // is used.
    this.element_rendered_ok = false;
    //
    // element_trace keeps a record of rendered elements.
    // used to implement author-only.
    //
    this.element_trace = new CSL.Stack("style");
    //
    // counter for total namesets
    this.nameset_counter = 0;
    //
    /////  this.fun.check_for_output = CSL.check_for_output;
    //
    // stack flag used for term handling.  Set to true
    // if at least one variable has tried to render, and
    // no variables had content.
    this.group_context = new CSL.Stack({
        term_intended: false,
        variable_attempt: false,
        variable_success: false,
        output_tip: undefined,
        label_form:  undefined,
        parallel_first: undefined,
        parallel_last: undefined,
        parallel_delimiter_override: undefined,
        condition: false,
        force_suppress: false,
        done_vars: []
    });
    //
    // boolean flag used to control first-letter capitalization
    // of terms.  Set to true if any item preceding the term
    // being handled has rendered successfully, otherwise
    // false.
    this.term_predecessor = false;
    //
    // boolean flag to control use of layout delimiter
    // immediately before numbers. This hack is needed for
    // some numeric styles.
    this.in_cite_predecessor = false;
    //
    // stack flag used to control jumps in the closing
    // token of a conditional.
    this.jump = new CSL.Stack(0, CSL.LITERAL);
    //
    // holds string parameters for group formatting, between
    // the start of a group and the closing token.
    this.decorations = new CSL.Stack();
    //
    // token store stack.
    this.tokenstore_stack = new CSL.Stack();

    // for collapsing
    this.last_suffix_used = "";
    this.last_names_used = [];
    this.last_years_used = [];
    this.years_used = [];
    this.names_used = [];

    this.taintedItemIDs = {};
    this.taintedCitationIDs = {};
    //
    // scratch stack containing initialize-with strings or null values
    this.initialize_with = new CSL.Stack();
    //
    // this is used to set a requested set of
    // disambiguation parameters in the output.
    // for the array elements, the base array
    // (either zero for each nameset, or full-up
    // if givens are already used) is set
    // during names processing, if no value
    // is set in the processor before a rendering
    // run.  to simplify things for the calling
    // function, these are just bog-standard arrays,
    // and can be safely overwritten.
    this.disambig_request = false;
    //
    // scratch variable to toggle an attempt to set a
    // name in sort order rather than display
    // order.
    this["name-as-sort-order"] = false;
    //
    // suppress decorations (used for generating
    // sort keys and disambiguation keys)
    this.suppress_decorations = false;
    //
    // empty settings array, used to report settings used
    // if disambig_request is not set at runtime
    this.disambig_settings = new CSL.AmbigConfig();
    //
    // sort key array
    this.bib_sort_keys = [];
    //
    // holds the prefix between the start of a group
    // and the closing token.
    this.prefix = new CSL.Stack("", CSL.LITERAL);
    //
    // holds the suffix between the start of a group
    // and the closing token.
    this.suffix = new CSL.Stack("", CSL.LITERAL);
    //
    // holds the group delimiter between the start of a group
    // and the closing token.
    this.delimiter = new CSL.Stack("", CSL.LITERAL);
    //
    // Used for conditional locale switching.
    this.cite_locales = [];
    this.cite_affixes = {
        citation: false, 
        bibliography: false,
        citation_sort: false, 
        bibliography_sort: false
    };
    this.strip_periods = 0;
    this.shadow_numbers = {};
    this.authority_stop_last = 0;
    this.loadedItemIDs = {};
    //
    // Push/pop array for set/unset of opt.lang setting, used
    // in if locale="XX" to force terms to language of item.
    // @locale tests track their nesting level in a counter,
    // and push the current value of state.opt.lang to one array,
    // and the counter value to another. On the way back up,
    // closing node decrements the counter, compares its value
    // with the trailing value on the array, and pops both
    // arrays, resetting state.opt.lang to the previous value.
    // A hack to solve a surprisingly difficult problem caused
    // by the use of an execution stack for the nested structure.
    this.condition_counter = 0; //incremented/decremented on ALL conditions
    this.condition_lang_val_arr = [];
    this.condition_lang_counter_arr = [];
};


CSL.Engine.Fun = function (state) {
    //
    // matcher
    this.match = new CSL.Util.Match();
    //
    // utility to get standard suffixes for disambiguation
    this.suffixator = new CSL.Util.Suffixator(CSL.SUFFIX_CHARS);
    //
    // utility to romanize a numeric value
    this.romanizer = new CSL.Util.Romanizer();
    //
    // utility to make an ordinal form of a number
    this.ordinalizer = new CSL.Util.Ordinalizer(state);
    //
    // utility to make the long ordinal form of a number, if possible
    this.long_ordinalizer = new CSL.Util.LongOrdinalizer();
};


CSL.Engine.Build = function () {
    // Alternate et-al term
    // Holds the localization key of the alternative term
    // to be used for et-al in a names environment.  Reduced
    // to a term object when the element tag is processed during
    // Build.
    this["alternate-term"] = false;
    //
    // flags that we are in the bibliography area.
    // used by sort.
    this.in_bibliography = false;
    //
    // scratch variable to alter behaviour when processing
    // locale files
    this.in_style = false;
    //
    // used to ignore info
    this.skip = false;
    //
    // the macro ATTRIBUTE stores a macro name on this
    // scratch variable anywhere outside the layout area
    // during build.  The macro name is picked up when
    // the token is encountered inside the layout area,
    // either through a direct call, or as part of a nested
    // macro expansion, and the macro content is exploded
    // into the token list.
    this.postponed_macro = false;
    //
    // used especially for controlling macro expansion
    // during Build.
    this.layout_flag = false;
    //
    // (was buffer_name)
    // scratch variable to hold the name of a macro
    // or a term until its children have been collected.
    this.name = false;
    this.names_variables = [[]];
    this.name_label = [{}];
    //
    // scratch variable to hold the value of a form
    // attribute until other attributes needed for
    // processing have been collected.
    this.form = false;
    this.term = false;
    //
    // the macros themselves are discarded after Build
    this.macro = {};
    //
    // the macro build stack.  used to raise an error
    // when macros would attempt to call themselves.
    this.macro_stack = [];
    //
    // stores the content of an XML text node during processing
    this.text = false;
    //
    // this is a scratch variable for holding an attribute
    // value during processing
    this.lang = false;
    //
    // should be able to run uninitialized; may attract some
    // cruft this way.
    this.area = "citation";
    this.root = "citation";
    this.extension = "";
    //
    // controls the application of implicit conditional wrappers
    // to top-level elements inside a names substitute span.
    // zero by default, build of names tag pushes a
    // new level with value 1.  group start tag increments by 1,
    // group end tag decrements by 1.  conditional wrappers are
    // only applied if value is exactly 1.
    this.substitute_level = new CSL.Stack(0, CSL.LITERAL);
    this.names_level = 0;
    this.render_nesting_level = 0;
    this.render_seen = false;
    this.bibliography_key_pos = 0;
};


CSL.Engine.Configure = function () {
    //
    // the fail and succeed arrays are used for stack
    // processing during configure.
    this.tests = [];
    this.fail = [];
    this.succeed = [];
};


CSL.Engine.Citation = function (state) {
     // Citation options area.
     // Holds a mixture of persistent and ephemeral
     // options and scratch data used during processing of
     // a citation.</p>
    this.opt = {
        inheritedAttributes: {}
    };

    this.tokens = [];
    // Placeholder function
    this.srt = new CSL.Registry.Comparifier(state, "citation_sort");
    //
    // configuration array to hold the collapse
    // options, if any.
    this.opt.collapse = [];
    //
    // disambiguate options
    this.opt["disambiguate-add-names"] = false;
    this.opt["disambiguate-add-givenname"] = false;
    this.opt["disambiguate-add-year-suffix"] = false;
    this.opt["givenname-disambiguation-rule"] = "by-cite";
    this.opt["near-note-distance"] = 5;

    this.opt.topdecor = [];
    this.opt.layout_decorations = [];
    this.opt.layout_prefix = "";
    this.opt.layout_suffix = "";
    this.opt.layout_delimiter = "";
    //
    // sorting
    this.opt.sort_locales = [];
    this.opt.max_number_of_names = 0;
    this.root = "citation";
};


CSL.Engine.Bibliography = function () {
    this.opt = {
        inheritedAttributes: {}
    };
    this.tokens = [];

    this.opt.collapse = [];

    this.opt.topdecor = [];
    this.opt.layout_decorations = [];
    this.opt.layout_prefix = "";
    this.opt.layout_suffix = "";
    this.opt.layout_delimiter = "";
    this.opt["line-spacing"] = 1;
    this.opt["entry-spacing"] = 1;
    //
    // sorting
    this.opt.sort_locales = [];
    this.opt.max_number_of_names = 0;
    this.root = "bibliography";
};


CSL.Engine.BibliographySort = function () {
    this.tokens = [];
    this.opt = {};
    this.opt.sort_directions = [];
    this.opt.topdecor = [];
    // Holds the final citation-number sort direction, for use
    // in applying numbers in cs:citation and cs:bibliography.
    // Value is exclusively controlled by cs:key in bibliography_sort
    this.opt.citation_number_sort_direction = CSL.ASCENDING;
    this.opt.citation_number_secondary = false;
    this.tmp = {};
    this.keys = [];
    this.root = "bibliography";
};


CSL.Engine.CitationSort = function () {
    this.tokens = [];
    this.opt = {};
    this.opt.sort_directions = [];
    this.keys = [];
    this.opt.topdecor = [];
    this.root = "citation";
};

CSL.Engine.InText = function () {
     // InText options area.
     // Holds a mixture of persistent and ephemeral
     // options and scratch data used during processing of
     // a citation.</p>
    this.opt = {
        inheritedAttributes: {}
    };

    this.tokens = [];
    // Placeholder function
    //this.srt = new CSL.Registry.Comparifier(state, "citation_sort");
    //
    // configuration array to hold the collapse
    // options, if any.
    this.opt.collapse = [];
    //
    // disambiguate options
    this.opt["disambiguate-add-names"] = false;
    this.opt["disambiguate-add-givenname"] = false;
    this.opt["disambiguate-add-year-suffix"] = false;
    this.opt["givenname-disambiguation-rule"] = "by-cite";
    this.opt["near-note-distance"] = 5;

    this.opt.topdecor = [];
    this.opt.layout_decorations = [];
    this.opt.layout_prefix = "";
    this.opt.layout_suffix = "";
    this.opt.layout_delimiter = "";
    //
    // sorting
    this.opt.sort_locales = [];
    this.opt.max_number_of_names = 0;
    this.root = "intext";
};
