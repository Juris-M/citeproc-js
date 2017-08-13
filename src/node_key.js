
CSL.Node.key = {
    build: function (state, target) {
        
        target = state[state.build.root + "_sort"].tokens;

        var func;
        var debug = false;
        var start_key = new CSL.Token("key", CSL.START);

        state.tmp.root = state.build.root;

        // The params object for build and runtime (tmp) really shouldn't have been separated.
        // Oh, well.
        start_key.strings["et-al-min"] = state.inheritOpt(this, "et-al-min");
        start_key.strings["et-al-use-first"] = state.inheritOpt(this, "et-al-use-first");
        start_key.strings["et-al-use-last"] = state.inheritOpt(this, "et-al-use-last");


        // initialize done vars
        func = function (state) {
            state.tmp.done_vars = [];
        };
        start_key.execs.push(func);

        state.opt.citation_number_sort_direction = this.strings.sort_direction;

        // initialize output queue
        func = function (state) {
            state.output.openLevel("empty");
        };
        start_key.execs.push(func);

        // sort direction
        var sort_direction = [];
        if (this.strings.sort_direction === CSL.DESCENDING) {
            //print("sort: descending on "+state.tmp.area);
            sort_direction.push(1);
            sort_direction.push(-1);
        } else {
            //print("sort: ascending");
            sort_direction.push(-1);
            sort_direction.push(1);
        }
        state[state.build.area].opt.sort_directions.push(sort_direction);

        if (CSL.DATE_VARIABLES.indexOf(this.variables[0]) > -1) {
            state.build.date_key = true;
        }

        // et al init
        func = function (state) {
            state.tmp.sort_key_flag = true;
            //print("== key node function ==");
            if (state.inheritOpt(this, "et-al-min")) {
                state.tmp["et-al-min"] = state.inheritOpt(this, "et-al-min");
            }
            if (state.inheritOpt(this, "et-al-use-first")) {
                state.tmp["et-al-use-first"] = state.inheritOpt(this, "et-al-use-first");
            }
            if ("boolean" === typeof state.inheritOpt(this, "et-al-use-last")) {
                state.tmp["et-al-use-last"] = state.inheritOpt(this, "et-al-use-last");
                //print("  set tmp et-al-use-last: "+this.strings["et-al-use-last"])
            }
        };
        start_key.execs.push(func);
        target.push(start_key);
        
        //
        // ops to initialize the key's output structures
        if (this.variables.length) {
            var variable = this.variables[0];
            // Set flag if sorting citations by citation-number

            // Nit: This will assume citation-number sorting if
            // that variable is set as key in ANY position.  Could
            // be a little more conservative, but secondary sorts
            // by this variable seem unlikely.
            if (variable === "citation-number") {
                if (state.build.area === "citation" && state.build.extension === "_sort") {
                    state.opt.citation_number_sort = false;
                }
                if (state.build.root === "bibliography" && state.build.extension === "_sort") {
                    state.opt.citation_number_sort_used = false;
                }
            }
            if (CSL.CREATORS.indexOf(variable) > -1) {
                //
                // Start tag
                var names_start_token = new CSL.Token("names", CSL.START);
                names_start_token.tokentype = CSL.START;
                names_start_token.variables = this.variables;
                CSL.Node.names.build.call(names_start_token, state, target);
                //
                // Name tag
                var name_token = new CSL.Token("name", CSL.SINGLETON);
                name_token.tokentype = CSL.SINGLETON;
                name_token.strings["name-as-sort-order"] = "all";
                name_token.strings["sort-separator"] = " ";
                name_token.strings["et-al-use-last"] = state.inheritOpt(this, "et-al-use-last");
                name_token.strings["et-al-min"] = state.inheritOpt(this, "et-al-min");
                name_token.strings["et-al-use-first"] = state.inheritOpt(this, "et-al-use-first");
                CSL.Node.name.build.call(name_token, state, target);
                //
                // Institution tag
                var institution_token = new CSL.Token("institution", CSL.SINGLETON);
                institution_token.tokentype = CSL.SINGLETON;
                CSL.Node.institution.build.call(institution_token, state, target);
                //
                // End tag
                var names_end_token = new CSL.Token("names", CSL.END);
                names_end_token.tokentype = CSL.END;
                CSL.Node.names.build.call(names_end_token, state, target);
            } else {
                var single_text = new CSL.Token("text", CSL.SINGLETON);
                single_text.dateparts = this.dateparts;
                if (CSL.NUMERIC_VARIABLES.indexOf(variable) > -1) {
                    func = function (state, Item) {
                        var num = false;
                        if ("citation-number" === variable) {
                            num = state.registry.registry[Item.id].seq.toString();
                        } else {
                            num = Item[variable];
                        }
                        if (num) {
                            // Code currently in util_number.js
                            num = CSL.Util.padding(num);
                        }
                        state.output.append(num, this);
                    };
                } else if (variable === "citation-label") {
                    func = function (state, Item) {
                        var trigraph = state.getCitationLabel(Item);
                        state.output.append(trigraph, this);
                    };
                } else if (CSL.DATE_VARIABLES.indexOf(variable) > -1) {
                    func = CSL.dateAsSortKey;
                    single_text.variables = this.variables;
                } else if ("title" === variable) {
                    var abbrevfam = "title";
                    var abbrfall = false;
                    var altvar = false;
                    var transfall = true;
                    func = state.transform.getOutputFunction(this.variables, abbrevfam, abbrfall, altvar, transfall);
                } else {
                    func = function (state, Item) {
                        var varval = Item[variable];
                        state.output.append(varval, "empty");
                    };
                }
                single_text.execs.push(func);
                target.push(single_text);
            }
        } else { // macro
            //
            // if it's not a variable, it's a macro
            var token = new CSL.Token("text", CSL.SINGLETON);
            token.postponed_macro = this.postponed_macro;
            CSL.expandMacro.call(state, token, target);
        }
        //
        // ops to output the key string result to an array go
        // on the closing "key" tag before it is pushed.
        // Do not close the level.
        var end_key = new CSL.Token("key", CSL.END);

        // Eliminated at revision 1.0.159.
        // Was causing non-fatal error "wanted empty but found group".
        // Possible contributor to weird "PAGES" bug?
        //func = function (state, Item) {
            //state.output.closeLevel("empty");
        //};
        //end_key.execs.push(func);
        
        // store key for use
        func = function (state) {
            var keystring = state.output.string(state, state.output.queue);
            if (state.sys.normalizeUnicode) {
                keystring = state.sys.normalizeUnicode(keystring);
            }
            keystring = keystring ? (keystring.split(" ").join(state.opt.sort_sep) + state.opt.sort_sep) : "";
            //SNIP-START
            if (debug) {
                CSL.debug("keystring: " + keystring + " " + typeof keystring);
            }
            //print("keystring: (" + keystring + ") " + typeof keystring + " " + state.tmp.area);
            //SNIP-END
            if ("" === keystring) {
                keystring = undefined;
            }
            if ("string" !== typeof keystring || state.tmp.empty_date) {
                keystring = undefined;
                state.tmp.empty_date = false;
            }
            state[state[state.tmp.area].root + "_sort"].keys.push(keystring);
            state.tmp.value = [];
        };
        end_key.execs.push(func);

        // Set year-suffix key on anything that looks like a date
        if (state.build.date_key) {
            if (state.build.area === "citation" && state.build.extension === "_sort") {
                // ascending sort always
                state[state.build.area].opt.sort_directions.push([-1,1]);
                func = function (state, Item) {
                    // year-suffix Key
                    var year_suffix = state.registry.registry[Item.id].disambig.year_suffix;
                    if (!year_suffix) {
                        year_suffix = 0;
                    }
                    var key = CSL.Util.padding("" + year_suffix);
                    state[state.tmp.area].keys.push(key);
                }
                end_key.execs.push(func);
            }
            state.build.date_key = false;
        }

        // reset key params
        func = function (state) {
            // state.tmp.name_quash = new Object();

            // XXX This should work, should be necessary, but doesn't and isn't.
            //state.output.closeLevel("empty");

            state.tmp["et-al-min"] = undefined;
            state.tmp["et-al-use-first"] = undefined;
            state.tmp["et-al-use-last"] = undefined;
            state.tmp.sort_key_flag = false;
        };
        end_key.execs.push(func);
        target.push(end_key);
    }
};
