
CSL.Node.layout = {
    build: function (state, target) {
        var func, prefix_token, suffix_token, tok;

        function setSuffix() {
            if (state.build.area === "bibliography") {
                suffix_token = new CSL.Token("text", CSL.SINGLETON);
                func = function(state) {
                    var suffix;
                    if (state.tmp.cite_affixes[state.tmp.area][state.tmp.last_cite_locale]) {
                        suffix = state.tmp.cite_affixes[state.tmp.area][state.tmp.last_cite_locale].suffix;
                    } else {
                        suffix = state.bibliography.opt.layout_suffix;
                    }

                    // If @display is used, layout suffix is placed on the last
                    // immediate child of the layout, which we assume will be a
                    // @display group node.
                    var topblob = state.output.current.value();
                    if (state.opt.using_display) {
                        topblob.blobs[topblob.blobs.length-1].strings.suffix = suffix;
                    } else {
                        topblob.strings.suffix = suffix;
                    }
                    if (state.bibliography.opt["second-field-align"]) {
                        // closes bib_other
                        state.output.endTag("bib_other");
                    }
                };
                suffix_token.execs.push(func);
                target.push(suffix_token);
            }
        }

        if (this.tokentype === CSL.START) {

            if (this.locale_raw) {
                state.build.current_default_locale = this.locale_raw;
            } else {
                state.build.current_default_locale = state.opt["default-locale"];
            }

            func = function (state, Item, item) {
                if (state.opt.development_extensions.apply_citation_wrapper
                    && state.sys.wrapCitationEntry
                    && !state.tmp.just_looking
                    && Item.system_id 
                    && state.tmp.area === "citation") { 

                    var cite_entry = new CSL.Token("group", CSL.START);
                    cite_entry.decorations = [["@cite", "entry"]];
                    state.output.startTag("cite_entry", cite_entry);
                    state.output.current.value().item_id = Item.system_id;
                    if (item) {
                        state.output.current.value().locator_txt = item.locator_txt;
                        state.output.current.value().suffix_txt = item.suffix_txt;
                    }
                }
            }
            this.execs.push(func);
        }

        // XXX Works, but using state.tmp looks wrong here? We're in the build layer ...
        if (this.tokentype === CSL.START && !state.tmp.cite_affixes[state.build.area]) {
            //
            // done_vars is used to prevent the repeated
            // rendering of variables
            //
            // initalize done vars
            func = function (state, Item) {

                state.tmp.done_vars = [];
                if (!state.tmp.just_looking && state.registry.registry[Item.id].parallel) {
                    state.tmp.done_vars.push("first-reference-note-number");
                }
                //CSL.debug(" === init rendered_name === ");
                state.tmp.rendered_name = false;
            };
            this.execs.push(func);
            // set opt delimiter
            func = function (state) {
                // just in case
                state.tmp.sort_key_flag = false;
            };
            this.execs.push(func);
            
            // reset nameset counter [all nodes]
            func = function (state) {
                state.tmp.nameset_counter = 0;
            };
            this.execs.push(func);

            func = function (state, Item) {
                var tok = new CSL.Token();
                if (state.opt.development_extensions.rtl_support) {
                    if (["ar", "he", "fa", "ur", "yi", "ps", "syr"].indexOf(Item.language) > -1) {
                        // Force correct text direction of this cite if necessary.
                        //print("DO 202b/202c");
                        tok = new CSL.Token();
                        tok.strings.prefix = "\u202b";
                        tok.strings.suffix = "\u202c";
                    }
                }
                state.output.openLevel(tok);
            }
            this.execs.push(func);
            target.push(this);

            // FIXME: This will never run. Probably a bug
            // if (state.opt.development_extensions.rtl_support && false) {
            //     //print("INSERT 200e into: " + this.strings.prefix);
            //     this.strings.prefix = this.strings.prefix.replace(/\((.|$)/g,"(\u200e$1");
            //     this.strings.suffix = this.strings.suffix.replace(/\)(.|$)/g,")\u200e$1");
            // }

            if (state.build.area === "citation") {
                prefix_token = new CSL.Token("text", CSL.SINGLETON);
                func = function (state, Item, item) {
                    var sp;
                    if (item && item.prefix) {
                        sp = "";
                        // We need the raw string, without decorations
                        // of any kind. Markup scheme is known, though, so
                        // markup can be safely stripped at string level.
                        //
                        // U+201d = right double quotation mark
                        // U+2019 = right single quotation mark
                        // U+00bb = right double angle bracket (guillemet)
                        // U+202f = non-breaking thin space
                        // U+00a0 = non-breaking space
                        var test_prefix = item.prefix.replace(/<[^>]+>/g, "").replace(/["'\u201d\u2019\u00bb\u202f\u00a0 ]+$/g,"");
                        var test_char = test_prefix.slice(-1);
                        if (test_prefix.match(CSL.ENDSWITH_ROMANESQUE_REGEXP)) {
                            sp = " ";
                        } else if (CSL.TERMINAL_PUNCTUATION.slice(0,-1).indexOf(test_char) > -1) {
                            sp = " ";
                        } else if (test_char.match(/[)\],0-9]/)) {
                            sp = " ";
                        }
                        var ignorePredecessor = false;
                        if (CSL.TERMINAL_PUNCTUATION.slice(0,-1).indexOf(test_char) > -1 && item.prefix.trim().indexOf(" ") > -1) {
                            state.tmp.term_predecessor = false;
                            ignorePredecessor = true;
                        }
                        // Protect against double spaces, which would trigger an extra,
                        // explicit, non-breaking space.
                        var prefix = (item.prefix + sp).replace(/\s+/g, " ");
                        if (!state.tmp.just_looking) {
                            prefix = state.output.checkNestedBrace.update(prefix);
                        }
                        state.output.append(prefix, this, false, ignorePredecessor);
                    }
                };
                prefix_token.execs.push(func);
                target.push(prefix_token);
            }
        }

        // Cast token to be used in one of the configurations below.
        var my_tok;
        if (this.locale_raw) {
            my_tok = new CSL.Token("dummy", CSL.START);
            my_tok.locale = this.locale_raw;
            my_tok.strings.delimiter = this.strings.delimiter;
            my_tok.strings.suffix = this.strings.suffix;
            if (!state.tmp.cite_affixes[state.build.area]) {
                state.tmp.cite_affixes[state.build.area] = {};
            }
        }

        if (this.tokentype === CSL.START) {
            state.build.layout_flag = true;
                            
            // Only run the following once, to set up the final layout node ...
            if (!this.locale_raw) {
                //
                // save out decorations for flipflop processing [final node only]
                //
                state[state.tmp.area].opt.topdecor = [this.decorations];
                state[(state.tmp.area + "_sort")].opt.topdecor = [this.decorations];

                state[state.build.area].opt.layout_prefix = this.strings.prefix;
                state[state.build.area].opt.layout_suffix = this.strings.suffix;
                state[state.build.area].opt.layout_delimiter = this.strings.delimiter;

                state[state.build.area].opt.layout_decorations = this.decorations;
                
                // Only do this if we're running conditionals
                if (state.tmp.cite_affixes[state.build.area]) {
                    // if build_layout_locale_flag is true,
                    // write cs:else START to the token list.
                    tok = new CSL.Token("else", CSL.START);
                    CSL.Node["else"].build.call(tok, state, target);
                }

            } // !this.locale_raw

            // Conditionals
            if (this.locale_raw) {
                if (!state.build.layout_locale_flag) {
                    // if layout_locale_flag is untrue,
                    // write cs:choose START and cs:if START
                    // to the token list.
                    var choose_tok = new CSL.Token("choose", CSL.START);
                    CSL.Node.choose.build.call(choose_tok, state, target);
                    my_tok.name = "if";
                    CSL.Attributes["@locale-internal"].call(my_tok, state, this.locale_raw);
                    CSL.Node["if"].build.call(my_tok, state, target);
                } else {
                    // if build_layout_locale_flag is true,
                    // write cs:else-if START to the token list.
                    my_tok.name = "else-if";
                    CSL.Attributes["@locale-internal"].call(my_tok, state, this.locale_raw);
                    CSL.Node["else-if"].build.call(my_tok, state, target);
                }
                // cite_affixes for this node
                state.tmp.cite_affixes[state.build.area][my_tok.locale] = {};
                state.tmp.cite_affixes[state.build.area][my_tok.locale].delimiter = this.strings.delimiter;
                state.tmp.cite_affixes[state.build.area][my_tok.locale].suffix = this.strings.suffix;
            }
        }
        if (this.tokentype === CSL.END) {
            if (this.locale_raw) {
                setSuffix();
                if (!state.build.layout_locale_flag) {
                    // If layout_locale_flag is untrue, write cs:if END
                    // to the token list.
                    my_tok.name = "if";
                    my_tok.tokentype = CSL.END;
                    CSL.Attributes["@locale-internal"].call(my_tok, state, this.locale_raw);
                    CSL.Node["if"].build.call(my_tok, state, target);
                    state.build.layout_locale_flag = true;
                } else {
                    // If layout_locale_flag is true, write cs:else-if END
                    // to the token list.
                    my_tok.name = "else-if";
                    my_tok.tokentype = CSL.END;
                    CSL.Attributes["@locale-internal"].call(my_tok, state, this.locale_raw);
                    CSL.Node["else-if"].build.call(my_tok, state, target);
                }
            }
            if (!this.locale_raw) {
                setSuffix();
                // Only add this if we're running conditionals
                if (state.tmp.cite_affixes[state.build.area]) {
                    // If layout_locale_flag is true, write cs:else END
                    // and cs:choose END to the token list.
                    if (state.build.layout_locale_flag) {
                        tok = new CSL.Token("else", CSL.END);
                        CSL.Node["else"].build.call(tok, state, target);
                        tok = new CSL.Token("choose", CSL.END);
                        CSL.Node.choose.build.call(tok, state, target);
                    }
                }
                state.build_layout_locale_flag = true;
                if (state.build.area === "citation") {
                    suffix_token = new CSL.Token("text", CSL.SINGLETON);
                    func = function (state, Item, item) {
                        var sp;
                        if (item && item.suffix) {
                            sp = "";
                            if (item.suffix.match(CSL.STARTSWITH_ROMANESQUE_REGEXP)
                                || ['[','('].indexOf(item.suffix.slice(0,1)) > -1) {

                                sp = " ";
                            }
                            var suffix = item.suffix;
                            if (!state.tmp.just_looking) {
                                suffix = state.output.checkNestedBrace.update(suffix);
                            }
                            state.output.append((sp + suffix), this);
                        }
                    };
                    suffix_token.execs.push(func);
                    target.push(suffix_token);
                }

                // Closes the RTL token
                func = function (state) {
                    state.output.closeLevel();
                };
                this.execs.push(func);
                func = function (state, Item) {
                    if (state.opt.development_extensions.apply_citation_wrapper
                        && state.sys.wrapCitationEntry
                        && !state.tmp.just_looking
                        && Item.system_id 
                        && state.tmp.area === "citation") { 
                        
                        state.output.endTag(); // closes citation link wrapper
                    }
                }
                this.execs.push(func);
                target.push(this);
                state.build.layout_flag = false;
                state.build.layout_locale_flag = false;
            } // !this.layout_raw
        }
    }
};
