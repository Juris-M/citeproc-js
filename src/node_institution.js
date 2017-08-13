
CSL.Node.institution = {
    build: function (state, target) {
        if ([CSL.SINGLETON, CSL.START].indexOf(this.tokentype) > -1) {

            var func = function (state) {
                if ("string" === typeof this.strings.delimiter) {
                    state.tmp.institution_delimiter = this.strings.delimiter;
                } else {
                    state.tmp.institution_delimiter = state.tmp.name_delimiter;
                }

                // This is the same code for the same result as in node_name.js, 
                // but when cs:institution comes on stream, it may produce
                // different results.
                if ("text" === state.inheritOpt(this, "and")) {
                    this.and_term = state.getTerm("and", "long", 0);
                } else if ("symbol" === state.inheritOpt(this, "and")) {
                    if (state.opt.development_extensions.expect_and_symbol_form) {
                        this.and_term = state.getTerm("and", "symbol", 0);
                    } else {
                        this.and_term = "&";
                    }
                } else if ("none" === state.inheritOpt(this, "and")) {
                    this.and_term = state.tmp.institution_delimiter;
                }
                if ("undefined" === typeof this.and_term && state.tmp.and_term) {
                    this.and_term = state.getTerm("and", "long", 0);
                }
                if (CSL.STARTSWITH_ROMANESQUE_REGEXP.test(this.and_term)) {
                    this.and_prefix_single = " ";
                    this.and_prefix_multiple = ", ";
                    if ("string" === typeof state.tmp.institution_delimiter) {
                        this.and_prefix_multiple = state.tmp.institution_delimiter;
                    }
                    this.and_suffix = " ";
                } else {
                    this.and_prefix_single = "";
                    this.and_prefix_multiple = "";
                    this.and_suffix = "";
                }
                if (state.inheritOpt(this, "delimiter-precedes-last") === "always") {
                    this.and_prefix_single = state.tmp.institution_delimiter;
                } else if (state.inheritOpt(this, "delimiter-precedes-last") === "never") {
                    // Slightly fragile: could test for charset here to make
                    // this more certain.
                    if (this.and_prefix_multiple) {
                        this.and_prefix_multiple = " ";
                    }
                }
                
                this.and = {};
                if ("undefined" !== typeof this.and_term) {
                    state.output.append(this.and_term, "empty", true);
                    this.and.single = state.output.pop();
                    this.and.single.strings.prefix = this.and_prefix_single;
                    this.and.single.strings.suffix = this.and_suffix;
                    state.output.append(this.and_term, "empty", true);
                    this.and.multiple = state.output.pop();
                    this.and.multiple.strings.prefix = this.and_prefix_multiple;
                    this.and.multiple.strings.suffix = this.and_suffix;
                } else if ("undefined" !== this.strings.delimiter) {
                    this.and.single = new CSL.Blob(state.tmp.institution_delimiter);
                    this.and.single.strings.prefix = "";
                    this.and.single.strings.suffix = "";
                    this.and.multiple = new CSL.Blob(state.tmp.institution_delimiter);
                    this.and.multiple.strings.prefix = "";
                    this.and.multiple.strings.suffix = "";
                }
                state.nameOutput.institution = this;
            };
            this.execs.push(func);
        }
        target.push(this);
    },
    configure: function (state) {
        if ([CSL.SINGLETON, CSL.START].indexOf(this.tokentype) > -1) {
            state.build.has_institution = true;
        }
    }
};
