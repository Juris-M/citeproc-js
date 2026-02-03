/*global CSL: true */

CSL.Node.text = {
    build: function (state, target) {
        var func, form, plural, id, num, number, formatter, firstoutput, specialdelimiter, label, suffix, term;
        if (this.postponed_macro) {
            var group_start = CSL.Util.cloneToken(this);
            group_start.name = "group";
            group_start.tokentype = CSL.START;
            CSL.Node.group.build.call(group_start, state, target);

            CSL.expandMacro.call(state, this, target);

            var group_end = CSL.Util.cloneToken(this);
            group_end.name = "group";
            group_end.tokentype = CSL.END;
            if (this.postponed_macro === 'juris-locator-label') {
                group_end.isJurisLocatorLabel = true;
            }
            CSL.Node.group.build.call(group_end, state, target);

        } else {
            CSL.Util.substituteStart.call(this, state, target);
            // ...
            //
            // Do non-macro stuff
            
            // Guess again. this.variables is ephemeral, adjusted by an initial
            // function set on the node via @variable attribute setup.
            //variable = this.variables[0];
            
            if (!this.variables_real) {
                this.variables_real = [];
            }
            if (!this.variables) {
                this.variables = [];
            }

            form = "long";
            plural = 0;
            if (this.strings.form) {
                form = this.strings.form;
            }
            if (this.strings.plural) {
                plural = this.strings.plural;
            }
            if ("citation-number" === this.variables_real[0] || "year-suffix" === this.variables_real[0] || "citation-label" === this.variables_real[0]) {
                //
                // citation-number and year-suffix are super special,
                // because they are rangeables, and require a completely
                // different set of formatting parameters on the output
                // queue.
                if (this.variables_real[0] === "citation-number") {

                    if (state.build.root === "citation") {
                        state.opt.update_mode = CSL.NUMERIC;
                    }
                    if (state.build.root === "bibliography") {
                        state.opt.bib_mode = CSL.NUMERIC;
                    }
                    //this.strings.is_rangeable = true;
                    if ("citation-number" === state[state.tmp.area].opt.collapse) {
                        this.range_prefix = state.getTerm("citation-range-delimiter");
                    }
                    this.successor_prefix = state[state.build.area].opt.layout_delimiter;
                    this.splice_prefix = state[state.build.area].opt.layout_delimiter;
                    func = function (state, Item, item) {

                        id = "" + Item.id;
                        if (!state.tmp.just_looking) {
                            if (state.tmp.area.slice(-5) === "_sort" && this.variables[0] === "citation-number") {
                                if (state.tmp.area === "bibliography_sort") {
                                    state.tmp.group_context.tip.done_vars.push("citation-number");
                                }
                                if (state.tmp.area === "citation_sort" && state.bibliography_sort.tmp.citation_number_map) {
                                    var num = state.bibliography_sort.tmp.citation_number_map[state.registry.registry[Item.id].seq];
                                } else {
                                    var num = state.registry.registry[Item.id].seq;
                                }
                                if (num) {
                                    // Code currently in util_number.js
                                    num = CSL.Util.padding("" + num);
                                }
                                state.output.append(num, this);
                                return;
                            }
                            if (item && item["author-only"]) {
                                state.tmp.element_trace.replace("suppress-me");
                            }
                            if (state.tmp.area !== "bibliography_sort" && state.bibliography_sort.tmp.citation_number_map && state.bibliography_sort.opt.citation_number_sort_direction === CSL.DESCENDING) {
                                num = state.bibliography_sort.tmp.citation_number_map[state.registry.registry[id].seq];
                            } else {
                                num = state.registry.registry[id].seq;
                            }
                            if (state.opt.citation_number_slug) {
                                state.output.append(state.opt.citation_number_slug, this);
                            } else {
                                number = new CSL.NumericBlob(state, false, num, this, Item.id);
                                if (state.tmp.in_cite_predecessor) {
                                    number.suppress_splice_prefix = true;
                                }
                                state.output.append(number, "literal");
                            }
                        }
                    };
                    this.execs.push(func);
                } else if (this.variables_real[0] === "year-suffix") {

                    state.opt.has_year_suffix = true;

                    if (state[state.tmp.area].opt.collapse === "year-suffix-ranged") {
                        //this.range_prefix = "-";
                        this.range_prefix = state.getTerm("citation-range-delimiter");
                    }
                    this.successor_prefix = state[state.build.area].opt.layout_delimiter;
                    if (state[state.tmp.area].opt["year-suffix-delimiter"]) {
                        this.successor_prefix = state[state.build.area].opt["year-suffix-delimiter"];
                    }
                    func = function (state, Item) {
                        if (state.registry.registry[Item.id] && state.registry.registry[Item.id].disambig.year_suffix !== false && !state.tmp.just_looking) {
                            //state.output.append(state.registry.registry[Item.id].disambig[2],this);
                            num = parseInt(state.registry.registry[Item.id].disambig.year_suffix, 10);

                            //if (state[state.tmp.area].opt.collapse === "year-suffix-ranged") {
                            //    //this.range_prefix = "-";
                            //    this.range_prefix = state.getTerm("citation-range-delimiter");
                            //}
                            //this.successor_prefix = state[state.tmp.area].opt.layout_delimiter;
                            if (state[state.tmp.area].opt.cite_group_delimiter) {
                                this.successor_prefix = state[state.tmp.area].opt.cite_group_delimiter;
                            }
                            number = new CSL.NumericBlob(state, false, num, this, Item.id);
                            formatter = new CSL.Util.Suffixator(CSL.SUFFIX_CHARS);
                            number.setFormatter(formatter);
                            state.output.append(number, "literal");
                            firstoutput = false;
                            // XXX Can we do something better for length here?
                            for (var i=0,ilen=state.tmp.group_context.mystack.length; i<ilen; i++) {
                                var flags = state.tmp.group_context.mystack[i];
                                if (!flags.variable_success && (flags.variable_attempt || (!flags.variable_attempt && !flags.term_intended))) {
                                    firstoutput = true;
                                    break;
                                }
                            }
                            specialdelimiter = state[state.tmp.area].opt["year-suffix-delimiter"];
                            if (firstoutput && specialdelimiter && !state.tmp.sort_key_flag) {
                                state.tmp.splice_delimiter = state[state.tmp.area].opt["year-suffix-delimiter"];
                            }
                        }
                    };
                    this.execs.push(func);
                } else if (this.variables_real[0] === "citation-label") {
                    if (state.build.root === "bibliography") {
                        state.opt.bib_mode = CSL.TRIGRAPH;
                    }
                    state.opt.has_year_suffix = true;
                    func = function (state, Item) {
                        label = Item["citation-label"];
                        if (!label) {
                            label = state.getCitationLabel(Item);
                        }
                        if (!state.tmp.just_looking) {
                            suffix = "";
                            if (state.registry.registry[Item.id] && state.registry.registry[Item.id].disambig.year_suffix !== false) {
                                num = parseInt(state.registry.registry[Item.id].disambig.year_suffix, 10);
                                suffix = state.fun.suffixator.format(num);
                            }
                            label += suffix;
                        }
                        state.output.append(label, this);
                    };
                    this.execs.push(func);
                }
            } else {
                if (this.strings.term) {
                    
                    // printterm
                    func = function (state, Item) {
                        var gender = state.opt.gender[Item.type];
                        var term = this.strings.term;
                        term = state.getTerm(term, form, plural, gender, CSL.TOLERANT, this.default_locale);
                        var myterm;
                        // if the term is not an empty string, say
                        // that we rendered a term
                        if (term !== "") {
                            state.tmp.group_context.tip.term_intended = true;
                        }
                        CSL.UPDATE_GROUP_CONTEXT_CONDITION(state, term, null, this);
                        
                        // capitalize the first letter of a term, if it is the
                        // first thing rendered in a citation (or if it is
                        // being rendered immediately after terminal punctuation,
                        // I guess, actually).
                        if (!state.tmp.term_predecessor && !(state.opt["class"] === "in-text" && state.tmp.area === "citation")) {
                            myterm = CSL.Output.Formatters["capitalize-first"](state, term);
                            //CSL.debug("Capitalize");
                        } else {
                            myterm = term;
                        }
                        
                        CSL.checkNonEnglishTitleCase.call(this, state, Item);
                        // XXXXX Cut-and-paste code in multiple locations. This code block should be
                        // collected in a function.
                        // Tag: strip-periods-block
                        if (state.tmp.strip_periods) {
                            myterm = myterm.replace(/\./g, "");
                        } else {
                            for (var i = 0, ilen = this.decorations.length; i < ilen; i += 1) {
                                if ("@strip-periods" === this.decorations[i][0] && "true" === this.decorations[i][1]) {
                                    myterm = myterm.replace(/\./g, "");
                                    break;
                                }
                            }
                        }
                        state.output.append(myterm, this);
                        if (state.tmp.can_block_substitute) {
                            // Black magic here. This causes the cs:substitution condition to pass,
                            // blocking further rendering within its scope. 
                            state.tmp.can_substitute.replace(false, CSL.LITERAL);
                        }
                    };
                    this.execs.push(func);
                    state.build.term = false;
                    state.build.form = false;
                    state.build.plural = false;
                } else if (this.variables_real.length) {
                    func = function (state, Item) {

                        // If some text variable is rendered, we're not collapsing.
                        if (this.variables_real[0] !== "locator") {
                            state.tmp.have_collapsed = false;
                        }

                        if (!state.tmp.group_context.tip.condition && Item[this.variables[0]]) {
                            state.tmp.just_did_number = false;
                        }
                        var val = Item[this.variables[0]];
                        if (val && !state.tmp.group_context.tip.condition) {
                            if (("" + val).slice(-1).match(/[0-9]/)) {
                                state.tmp.just_did_number = true;
                            } else {
                                state.tmp.just_did_number = false;
                            }
                        }
                    };
                    this.execs.push(func);

                    // plain string fields

                    // Deal with multi-fields and ordinary fields separately.
                    if (CSL.MULTI_FIELDS.indexOf(this.variables_real[0]) > -1
                        || this.variables_real[0].indexOf("-main") > -1
                        || this.variables_real[0].indexOf("-sub") > -1
                        || ["language-name", "language-name-original"].indexOf(this.variables_real[0]) > -1
                       ) {

                        // multi-fields
                        // Initialize transform factory according to whether
                        // abbreviation is desired.
                        var abbrevfam = this.variables[0];
                        var abbrfall = false;
                        var altvar = false;
                        var transfall = false;
                        if (form === "short") {
                            if (this.variables_real[0].slice(-6) !== "-short") {
                                altvar = this.variables_real[0] + "-short";
                            }
                        } else {
                            abbrevfam = false;
                        }
                        if (state.build.extension) {
                            // multi-fields for sorting get a sort transform,
                            // (abbreviated if the short form was selected)
                            transfall = true;
                        } else {
                            transfall = true;
                            abbrfall = true;
						}

                        func = state.transform.getOutputFunction(this.variables, abbrevfam, abbrfall, altvar, transfall);
                    } else {
                        // ordinary fields
                        if (CSL.CITE_FIELDS.indexOf(this.variables_real[0]) > -1) {
                            // per-cite fields are read from item, rather than Item
                            func = function (state, Item, item) {
                                if (item && item[this.variables[0]]) {
                                    // Code copied to page variable as well; both
                                    // become cs:number in MLZ extended schema
                                    
                                    // If locator, use cs:number. Otherwise, render
                                    // normally.

                                    // XXX The code below is pretty-much copied from
                                    // XXX node_number.js. Should be a common function.
                                    // XXX BEGIN
                                    state.processNumber(this, item, this.variables[0], Item.type);
                                    CSL.Util.outputNumericField(state, this.variables[0], Item.id);
                                    // XXX END

                                    if (["locator", "locator-extra"].indexOf(this.variables_real[0]) > -1
                                       && !state.tmp.just_looking) { 
                                        state.tmp.done_vars.push(this.variables_real[0]);
                                    }
                                }
                            };
                        } else  if (["page", "page-first", "chapter-number", "collection-number", "edition", "issue", "number", "number-of-pages", "number-of-volumes", "volume"].indexOf(this.variables_real[0]) > -1) {
                            // page gets mangled with the correct collapsing
                            // algorithm
                            func = function(state, Item) {
                                CSL.checkNonEnglishTitleCase.call(this, state, Item);
                                state.processNumber(this, Item, this.variables[0], Item.type);
                                CSL.Util.outputNumericField(state, this.variables[0], Item.id);
                            };
                        } else if (["URL", "DOI"].indexOf(this.variables_real[0]) > -1) {
                            func = function (state, Item) {
                                var value;
                                if (this.variables[0]) {
                                    value = state.getVariable(Item, this.variables[0], form);
                                    if (value) {
                                        if (this.variables[0] === "URL" && form === "short") {
                                            value = value.replace(/(.*\.[^\/]+)\/.*/, "$1");
                                            if (value.match(/\/\/www\./)) {
                                                value = value.replace(/https?:\/\//, "");
                                            }
                                        }
                                        if (this.variables[0] === "DOI") {
                                            if (!value.match(/^https?:\/\//) && this.strings.prefix && this.strings.prefix.match(/^.*https:\/\/doi\.org\/$/)) {
                                                value = CSL.Util.encodeDoiForUrl(value);
                                            }
                                        }
                                        // true is for non-suppression of periods
                                        if (state.opt.development_extensions.wrap_url_and_doi) {
                                            if (!this.decorations.length || this.decorations[0][0] !== "@" + this.variables[0]) {
                                                // Special-casing to fix https://github.com/Juris-M/citeproc-js/issues/57
                                                // clone current token, to avoid collateral damage
                                                var clonetoken = CSL.Util.cloneToken(this);
                                                // cast a group blob
                                                var groupblob = new CSL.Blob(null, null, "url-wrapper");
                                                // set the DOI decoration on the blob
                                                groupblob.decorations.push(["@DOI", "true"]);
                                                if (this.variables_real[0] === "DOI") {
                                                    // strip a proper DOI prefix
                                                    var prefix;
                                                    if (this.strings.prefix && this.strings.prefix.match(/^.*https:\/\/doi\.org\/$/)) {
                                                        if (value.match(/^https?:\/\/doi\.org\//)) {
                                                            value = value.replace(/^https?:\/\/doi\.org\//, "");
                                                            value = decodeURIComponent(value);
                                                        }
                                                        if (value.match(/^https?:\/\//)) {
                                                            // Do not tamper with another protocol + domain if already set in field value
                                                            prefix = "";
                                                        } else {
                                                            // Otherwise https + domain
                                                            prefix = "https://doi.org/";
                                                        }
                                                        // set any string prefix on the clone
                                                        clonetoken.strings.prefix = this.strings.prefix.slice(0, clonetoken.strings.prefix.length-16);
                                                    }
                                                    if (!value.match(/^https?:\/\//)) {
                                                        value = CSL.Util.encodeDoiForUrl(value);
                                                    }
                                                    // cast a text blob
                                                    // set the prefix as the content of the blob
                                                    var prefixblob = new CSL.Blob(prefix);
                                                    // cast another text blob
                                                    // set the value as the content of the second blob
                                                    var valueblob = new CSL.Blob(value);
                                                    // append new text token and clone to group token
                                                    groupblob.push(prefixblob);
                                                    groupblob.push(valueblob);
                                                    // append group token to output
                                                    state.output.append(groupblob, clonetoken, false, false, true);
                                                } else {
                                                    var valueblob = new CSL.Blob(value);
                                                    // append new text token and clone to group token
                                                    groupblob.push(valueblob);
                                                    // append group token to output
                                                    //this.decorations = [["@" + this.variables[0], "true"]].concat(this.decorations);
                                                    state.output.append(groupblob, clonetoken, false, false, true);
                                                }
                                            } else {
                                                state.output.append(value, this, false, false, true);
                                            }
                                        } else {
                                            // This is totally unnecessary, isn't it?
                                            if (this.decorations.length) {
                                                for (var i=this.decorations.length-1; i>-1; i--) {
                                                    if (this.decorations[i][0] === "@" + this.variables[0]) {
                                                        this.decorations = this.decorations.slice(0, i).concat(this.decorations.slice(i+1));
                                                    }
                                                }
                                            }
                                            state.output.append(value, this, false, false, true);
                                        }
                                    }
                                }
                            };
                        } else if (this.variables_real[0] === "section") {
                            // Sections for statutes are special. This is an uncommon
                            // variable, so we save the cost of the runtime check
                            // unless it's being used.
                            func = function (state, Item) {
                                var value;
                                value = state.getVariable(Item, this.variables[0], form);
                                if (value) {
                                    CSL.checkNonEnglishTitleCase.call(this, state, Item);
                                    state.output.append(value, this);
                                }
                            };
                        } else if (this.variables_real[0] === "hereinafter") {
                            func = function (state, Item) {
                                var value = state.transform.abbrevs["default"]["hereinafter"][Item.id];
                                if (value) {
                                    state.output.append(value, this);
                                    state.tmp.group_context.tip.variable_success = true;
                                }
                            };
                        } else {
                            // anything left over just gets output in the normal way.
                            func = function (state, Item) {
                                var value;
                                if (this.variables[0]) {
                                    value = state.getVariable(Item, this.variables[0], form);
                                    if (value) {
                                        value = "" + value;
                                        value = value.split("\\").join("");
                                        CSL.checkNonEnglishTitleCase.call(this, state, Item);
                                        state.output.append(value, this);
                                    }
                                }
                            };
                        }
                    }
                    this.execs.push(func);
                } else if (this.strings.value) {
                    // for the text value attribute.
                    func = function (state, Item) {
                        state.tmp.group_context.tip.term_intended = true;
                        // true flags that this is a literal-value term
                        CSL.UPDATE_GROUP_CONTEXT_CONDITION(state, this.strings.value, true, this);
                        CSL.checkNonEnglishTitleCase.call(this, state, Item);
                        state.output.append(this.strings.value, this);
                        if (state.tmp.can_block_substitute) {
                            // Black magic here. This causes the cs:substitution condition to pass,
                            // blocking further rendering within its scope. 
                            state.tmp.can_substitute.replace(false, CSL.LITERAL);
                        }
                    };
                    this.execs.push(func);
                    // otherwise no output
                }
            }
            target.push(this);
            CSL.Util.substituteEnd.call(this, state, target);
        }
    }
};


CSL.checkNonEnglishTitleCase = function (state, Item) {
    if (this.strings["text-case"] === "title") {
        let lang = Item.language ? Item.language : state.opt.lang;
        if (lang && lang.slice(0, 2) !== "en") {
            this.strings["text-case"] = "passthrough";
        }
    }
};