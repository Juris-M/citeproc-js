/*global CSL: true */

CSL.Attributes = {};

CSL.Attributes["@disambiguate"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    if (arg === "true") {
        state.opt.has_disambiguate = true;
        var func = function (Item) {
            if (state.tmp.area === "bibliography") {
                if (state.tmp.disambiguate_count < state.registry.registry[Item.id].disambig.disambiguate) {
                    state.tmp.disambiguate_count += 1;
                    return true;
                }
            } else {
                state.tmp.disambiguate_maxMax += 1;
                if (state.tmp.disambig_settings.disambiguate
                    && state.tmp.disambiguate_count < state.tmp.disambig_settings.disambiguate) {
                    state.tmp.disambiguate_count += 1;
                    return true;
                }
            }
            return false;
        };
        this.tests.push(func);
    } else if (arg === "check-ambiguity-and-backreference") {
        var func = function (Item) {
            if (state.registry.registry[Item.id].disambig.disambiguate && state.registry.registry[Item.id]["citation-count"] > 1) {
                return true;
            }
            return false;
        };
        this.tests.push(func);
    }
};

CSL.Attributes["@is-numeric"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var variables = arg.split(/\s+/);
    var maketest = function(variable) {
        return function (Item, item) {
            var myitem = Item;
            if (item && ["locator","locator-extra"].indexOf(variable) > -1) {
                myitem = item;
            }
            if (!myitem[variable]) {
                return false;
            }
            if (CSL.NUMERIC_VARIABLES.indexOf(variable) > -1) {
                if (!state.tmp.shadow_numbers[variable]) {
                    state.processNumber(false, myitem, variable, Item.type);
                }
                if (state.tmp.shadow_numbers[variable].numeric) {
                    return true;
                }
            } else if (["title","version"].indexOf(variable) > -1) {
                if (myitem[variable].slice(-1) === "" + parseInt(myitem[variable].slice(-1), 10)) {
                    return true;
                }
            }
            return false;
        };
    };
    for (var i=0; i<variables.length; i+=1) {
        this.tests.push(maketest(variables[i]));
    }
};


CSL.Attributes["@is-uncertain-date"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var variables = arg.split(/\s+/);
    // Strip off any boolean prefix.
    var maketest = function (myvariable) {
        return function(Item) {
            if (Item[myvariable] && Item[myvariable].circa) {
                return true;
            } else {
                return false;
            }
        };
    };
    for (var i=0,ilen=variables.length;i<ilen;i+=1) {
        this.tests.push(maketest(variables[i]));
    }
};


CSL.Attributes["@locator"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var trylabels = arg.replace("sub verbo", "sub-verbo");
    trylabels = trylabels.split(/\s+/);
    // Strip off any boolean prefix.
    var maketest = function (trylabel) {
        if (trylabel === "article") {
            trylabel = "article-locator";
        } else if (trylabel === "title") {
            trylabel = "title-locator";
        }
        return function(Item, item) {
            var label;
            state.processNumber(false, item, "locator");
            label = state.tmp.shadow_numbers.locator.label;
            // If item.label is not in CSL.STATUTE_SUBDIV_STRINGS_REVERSE,
            // the label is undefined here.
            if (!label) {
                label = item && item.label ? item.label : "page";
            }
            if (label && trylabel === label) {
                return true;
            } else {
                return false;
            }
        };
    };
    for (var i=0,ilen=trylabels.length;i<ilen;i+=1) {
        this.tests.push(maketest(trylabels[i]));
    }
};


CSL.Attributes["@position"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var tryposition;
    state.opt.update_mode = CSL.POSITION;
    var trypositions = arg.split(/\s+/);
    var testSubsequentNear = function (Item, item) {
        if (item && CSL.POSITION_MAP[item.position] >= CSL.POSITION_MAP[CSL.POSITION_SUBSEQUENT] && item["near-note"]) {
            return true;
        }
        return false;
    };
    var testSubsequentNotNear = function (Item, item) {
        if (item && CSL.POSITION_MAP[item.position] == CSL.POSITION_MAP[CSL.POSITION_SUBSEQUENT] && !item["near-note"]) {
            return true;
        }
        return false;
    };
    var maketest = function(tryposition) {
        return function (Item, item) {
            if (state.tmp.area === "bibliography") {
                return false;
            }
            if (item && "undefined" === typeof item.position) {
                item.position = 0;
            }
            if (item && typeof item.position === "number") {
                if (item.position === 0 && tryposition === 0) {
                    return true;
                } else if (tryposition > 0 && CSL.POSITION_MAP[item.position] >= CSL.POSITION_MAP[tryposition]) {
                    return true;
                }
            } else if (tryposition === 0) {
                return true;
            }
            return false;
        };
    };
    for (var i=0,ilen=trypositions.length;i<ilen;i+=1) {
        var tryposition = trypositions[i];
        if (tryposition === "first") {
            tryposition = CSL.POSITION_FIRST;
        } else if (tryposition === "container-subsequent") {
            tryposition = CSL.POSITION_CONTAINER_SUBSEQUENT;
        } else if (tryposition === "subsequent") {
            tryposition = CSL.POSITION_SUBSEQUENT;
        } else if (tryposition === "ibid") {
            tryposition = CSL.POSITION_IBID;
        } else if (tryposition === "ibid-with-locator") {
            tryposition = CSL.POSITION_IBID_WITH_LOCATOR;
        }
        if ("near-note" === tryposition) {
            this.tests.push(testSubsequentNear);
        } else if ("far-note" === tryposition) {
            this.tests.push(testSubsequentNotNear);
        } else {
            this.tests.push(maketest(tryposition));
        }
    }
};

CSL.Attributes["@type"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    // XXX This is ALWAYS composed as an "any" match
    var types = arg.split(/\s+/);
    // Strip off any boolean prefix.
    var maketest = function (mytype) {
        return function(Item) {
            var ret = (Item.type === mytype);
            if (ret) {
                return true;
            } else {
                return false;
            }
        };
    };
    var tests = [];
    for (var i=0,ilen=types.length;i<ilen;i+=1) {
        tests.push(maketest(types[i]));
    }
    this.tests.push(state.fun.match.any(this, state, tests));
};

CSL.Attributes["@variable"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var func;
    this.variables = arg.split(/\s+/);
    this.variables_real = this.variables.slice();

    // First the non-conditional code.
    if ("label" === this.name && this.variables[0]) {
        this.strings.term = this.variables[0];
    } else if (["names", "date", "text", "number"].indexOf(this.name) > -1) {
        //
        // An oddity of variable handling is that this.variables
        // is actually ephemeral; the full list of variables is
        // held in the variables_real var, and pushed into this.variables
        // conditionally in order to suppress repeat renderings of
        // the same item variable.  [STILL FUNCTIONAL? 2010.01.15]
        //
        // set variable names
        func = function (state, Item, item) {
            // Clear this.variables in place
            for (var i = this.variables.length - 1; i > -1; i += -1) {
                this.variables.pop();
            }
            for (var i=0,ilen=this.variables_real.length;i<ilen;i++) {
                // set variable name if not quashed, and if not the title of a legal case w/suppress-author
                if (state.tmp.done_vars.indexOf(this.variables_real[i]) === -1 
// This looks nuts. Why suppress a case name if not required by context?
//                    && !(item && Item.type === "legal_case" && item["suppress-author"] && this.variables_real[i] === "title")
                   ) {
                    this.variables.push(this.variables_real[i]);
                }
                if (state.tmp.can_block_substitute) {
                    state.tmp.done_vars.push(this.variables_real[i]);
                }
            }
        };
        this.execs.push(func);

        // check for output
        func = function (state, Item, item) {
            var output = false;
            for (var i=0,ilen=this.variables.length;i<ilen;i++) {
                var variable = this.variables[i];
                if (["authority", "committee"].indexOf(variable) > -1
                    && "string" === typeof Item[variable]
                    && "names" === this.name) {

                    // Great! So for each of these, we split.
                    // And we only recombine everything if the length
                    // of all the splits matches.
                    
                    // Preflight
                    var isValid = true;
                    var rawNames = Item[variable].split(/\s*;\s*/);
                    var rawMultiNames = {};
                    if (Item.multi && Item.multi._keys[variable]) {
                        for (var langTag in Item.multi._keys[variable]) {
                            rawMultiNames[langTag] = Item.multi._keys[variable][langTag].split(/\s*;\s*/);
                            if (rawMultiNames[langTag].length !== rawNames.length) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                    if (!isValid) {
                        rawNames = [Item[variable]];
                        rawMultiNames = Item.multi._keys[variable];
                    }
                    for (var j = 0, jlen = rawNames.length; j < jlen; j++) {
                        var creatorParent = {
                            literal:rawNames[j],
                            multi:{
                                _key:{}
                            }
                        };
                        for (var langTag in rawMultiNames) {
                            var creatorChild = {
                                literal:rawMultiNames[langTag][j]
                            };
                            creatorParent.multi._key[langTag] = creatorChild;
                        }
                        rawNames[j] = creatorParent;
                    }
                    Item[variable] = rawNames;
                }
                if (this.strings.form === "short" && !Item[variable]) {
                    if (variable === "title") {
                        variable = "title-short";
                    } else if (variable === "container-title") {
                        variable = "container-title-short";
                    }
                }
                if (variable === "year-suffix") {
                    // year-suffix always signals that it produces output,
                    // even when it doesn't. This permits it to be used with
                    // the "no date" term inside a group used exclusively
                    // to control formatting.
                    output = true;
                    break;
                } else if (CSL.DATE_VARIABLES.indexOf(variable) > -1) {
                    if (state.opt.development_extensions.locator_date_and_revision && "locator-date" === variable) {
                        // If locator-date is set, it's valid.
                        output = true;
                        break;
                    }
                    if (Item[variable]) {
                        for (var key in Item[variable]) {
                            if (this.dateparts.indexOf(key) === -1 && "literal" !== key) {
                                continue;
                            }
                            if (Item[variable][key]) {
                                output = true;
                                break;
                            }
                        }
                        if (output) {
                            break;
                        }
                    }
                } else if ("locator" === variable) {
                    if (item && item.locator) {
                        output = true;
                    }
                    break;
                } else if ("locator-extra" === variable) {
                    if (item && item["locator-extra"]) {
                        output = true;
                    }
                    break;
                } else if (["citation-number","citation-label"].indexOf(variable) > -1) {
                    output = true;
                    break;
                } else if ("first-reference-note-number" === variable) {
                    if (item && item["first-reference-note-number"]) {
                        output = true;
                    }
                    break;
                } else if ("first-container-reference-note-number" === variable) {
                    if (item && item["first-container-reference-note-number"]) {
                        output = true;
                    }
                    break;
                } else if ("hereinafter" === variable) {
                    if (state.transform.abbrevs["default"].hereinafter[Item.id]
                        && state.sys.getAbbreviation
                        && Item.id) {
						
                        output = true;
                    }
                    break;
                } else if ("object" === typeof Item[variable]) {
                    break;
                } else if ("string" === typeof Item[variable] && Item[variable]) {
                    output = true;
                    break;
                } else if ("number" === typeof Item[variable]) {
                    output = true;
                    break;
                }
                if (output) {
                    break;
                }
            }
            //print("-- VAR: "+variable);
            //flag = state.tmp.group_context.tip;
            if (output) {
                for (var i=0,ilen=this.variables_real.length;i<ilen;i++) {
                    var variable = this.variables_real[i];
                    if (variable !== "citation-number" || state.tmp.area !== "bibliography") {
                        state.tmp.cite_renders_content = true;
                    }
                    //print("  setting [2] to true based on: " + arg);
                    state.tmp.group_context.tip.variable_success = true;
                    // For util_substitute.js, subsequent-author-substitute
                    if (state.tmp.can_substitute.value() 
                        && state.tmp.area === "bibliography"
                        && "string" === typeof Item[variable]) {

                        state.tmp.name_node.top = state.output.current.value();
                        state.tmp.rendered_name.push(Item[variable]);
                    }
                }
                state.tmp.can_substitute.replace(false,  CSL.LITERAL);
            } else {
                //print("  setting [1] to true based on: " + arg);
                state.tmp.group_context.tip.variable_attempt = true;
            }
            //state.tmp.group_context.replace(flag);
        };
        this.execs.push(func);
    } else if (["if",  "else-if", "condition"].indexOf(this.name) > -1) {
        // Strip off any boolean prefix.
        // Now the conditionals.
        var maketest = function (variable) {
            return function(Item,item){
                var myitem = Item;
                if (item && ["locator", "locator-extra", "first-reference-note-number", "first-container-reference-note-number", "locator-date"].indexOf(variable) > -1) {
                    myitem = item;
                }
                // We don't run loadAbbreviation() here; it is run by the application-supplied
                // retrieveItem() if hereinafter functionality is to be used, so this key will
                // always exist in memory, possibly with a nil value.
                if (variable === "hereinafter" && state.sys.getAbbreviation && myitem.id) {
                    if (state.transform.abbrevs["default"].hereinafter[myitem.id]) {
                        return true;
                    }
                } else if (myitem[variable]) {
                    if ("number" === typeof myitem[variable] || "string" === typeof myitem[variable]) {
                        return true;
                    } else if ("object" === typeof myitem[variable]) {
                        //
                        // this will turn true only for hash objects
                        // that have at least one attribute, or for a
                        // non-zero-length list
                        //
                        for (var key in myitem[variable]) {
                            if (myitem[variable][key]) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            };
        };
        for (var i=0,ilen=this.variables.length;i<ilen;i+=1) {
            this.tests.push(maketest(this.variables[i]));
        }
    }
};


CSL.Attributes["@page"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var trylabels = arg.replace("sub verbo", "sub-verbo");
    trylabels = trylabels.split(/\s+/);
    // Strip off any boolean prefix.
    var maketest = function (trylabel) {
        return function(Item) {
            var label;
            state.processNumber(false, Item, "page", Item.type);
            if (!state.tmp.shadow_numbers.page.label) {
                label = "page";
            } else if (state.tmp.shadow_numbers.page.label === "sub verbo") {
                label = "sub-verbo";
            } else {
                label = state.tmp.shadow_numbers.page.label;
            }
            if (state.tmp.shadow_numbers.page.values.length > 0) {
                if (state.tmp.shadow_numbers.page.values[0].gotosleepability) {
                    state.tmp.shadow_numbers.page.values[0].labelVisibility = false;
                }
            }
            if (trylabel === label) {
                return true;
            } else {
                return false;
            }
        };
    };
    for (var i=0,ilen=trylabels.length;i<ilen;i+=1) {
        this.tests.push(maketest(trylabels[i]));
    }
};


// a near duplicate of code above
CSL.Attributes["@number"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var trylabels = arg.split(/\s+/);
    var maketest = function(trylabel) {
        return function (Item) {
            var label;
            state.processNumber(false, Item, "number", Item.type);
            if (!state.tmp.shadow_numbers.number.label) {
                label = "number";
            } else {
                label = state.tmp.shadow_numbers.number.label;
            }
            if (trylabel === label) {
                return true;
            } else {
                return false;
            }
        };
    };
    for (var i=0,ilen=trylabels.length;i<ilen;i+=1) {
        this.tests.push(maketest(trylabels[i]));
    }
};

CSL.Attributes["@jurisdiction"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var tryjurisdictions = arg.split(/\s+/);
    
    // This forces a match=any method, similar to @type
    var maketests = function (tryjurisdictions) {
        return function(Item) {
            if (!Item.jurisdiction) {
                return false;
            }
            var jurisdiction = Item.jurisdiction;
            for (var i=0,ilen=tryjurisdictions.length;i<ilen;i++) {
                if (jurisdiction === tryjurisdictions[i]) {
                    return true;
                }
            }
            return false;
        };
    };
    this.tests.push(maketests(tryjurisdictions));
};

CSL.Attributes["@country"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var trycountries = arg.split(/\s+/);
    
    // This forces a match=any method, similar to @type
    var maketests = function (trycountries) {
        return function(Item) {
            if (!Item.country) {
                return false;
            }
            var country = Item.country;
            for (var i=0,ilen=trycountries.length;i<ilen;i++) {
                if (country === trycountries[i]) {
                    return true;
                }
            }
            return false;
        };
    };
    this.tests.push(maketests(trycountries));
};

CSL.Attributes["@context"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var func = function () {
        if (["bibliography", "citation"].indexOf(arg) > -1) {
		    var area = state.tmp.area.slice(0, arg.length);
		    if (area === arg) {
			    return true;
		    }
		    return false;
        } else if ("alternative" === arg) {
            return !!state.tmp.abort_alternative;
        }
    };
    this.tests.push(func);
};

CSL.Attributes["@has-year-only"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var trydates = arg.split(/\s+/);
    var maketest = function (trydate) {
        return function(Item) {
            var date = Item[trydate];
            if (!date || date.month || date.season) {
                return false;
            } else {
                return true;
            }
        };
    };
    for (var i=0,ilen=trydates.length;i<ilen;i+=1) {
        this.tests.push(maketest(trydates[i]));
    }
};

CSL.Attributes["@has-to-month-or-season"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var trydates = arg.split(/\s+/);
    var maketest = function (trydate) {
        return function(Item) {
            var date = Item[trydate];
            if (!date || (!date.month && !date.season) || date.day) {
                return false;
            } else {
                return true;
            }
        };
    };
    for (var i=0,ilen=trydates.length;i<ilen;i+=1) {
        this.tests.push(maketest(trydates[i]));
    }
};

CSL.Attributes["@has-day"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var trydates = arg.split(/\s+/);
    var maketest = function (trydate) {
        return function(Item) {
            var date = Item[trydate];
            if (!date || !date.day) {
                return false;
            } else {
                return true;
            }
        };
    };
    for (var i=0,ilen=trydates.length;i<ilen;i+=1) {
        this.tests.push(maketest(trydates[i]));
    }
};

CSL.Attributes["@is-plural"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var func = function (Item) {
        var nameList = Item[arg];
        if (nameList && nameList.length) {
            var persons = 0;
            var institutions = 0;
            var last_is_person = false;
            for (var i = 0, ilen = nameList.length; i < ilen; i += 1) {
                if (state.opt.development_extensions.spoof_institutional_affiliations
                    && (nameList[i].literal || (nameList[i].isInstitution && nameList[i].family && !nameList[i].given))) {
                    institutions += 1;
                    last_is_person = false;
                } else {
                    persons += 1;
                    last_is_person = true;
                }
            }
            if (persons > 1) {
                return true;
            } else if (institutions > 1) {
                return true;
            } else if (institutions && last_is_person) {
                return true;
            }
        }
        return false;
    };
    this.tests.push(func);
};

CSL.Attributes["@is-multiple"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var func = function (Item) {
        var val = ("" + Item[arg]);
        var lst = val.split(/(?:,\s|\s(?:tot\sen\smet|līdz|oraz|and|bis|έως|και|och|až|do|en|et|in|ir|ja|og|sa|to|un|und|és|și|i|u|y|à|e|a|и|-|–)\s|—|\&)/);
        if (lst.length > 1) {
            return true;
        }
        return false;
    };
    this.tests.push(func);
};




CSL.Attributes["@locale"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var ret, langspec, lang, lst, i, ilen;
    // Style default
    var locale_default = state.opt["default-locale"][0];

    if (this.name === "layout") {
        // For layout
        this.locale_raw = arg;
        if (this.tokentype === CSL.START) {
            if (!state.opt.multi_layout) {
                state.opt.multi_layout = [];
            }
            var locale_data = [];
            // Register the primary locale in the set, and others that "map" to it, 
            // so that they can be used when generating sort keys. See node_sort.js.
            // Not idempotent. Only do this once.
            var locales = arg.split(/\s+/);
            var sort_locale = {};
            var localeMaster = CSL.localeResolve(locales[0], locale_default);
            locale_data.push(localeMaster);
            if (localeMaster.generic) {
                sort_locale[localeMaster.generic] = localeMaster.best;
            } else {
                sort_locale[localeMaster.best] = localeMaster.best;
            }
            for (var i=1,ilen=locales.length;i<ilen;i+=1) {
                var localeServant = CSL.localeResolve(locales[i], locale_default);
                locale_data.push(localeServant);
                if (localeServant.generic) {
                    sort_locale[localeServant.generic] = localeMaster.best;
                } else {
                    sort_locale[localeServant.best] = localeMaster.best;
                }

            }
            state[state.build.area].opt.sort_locales.push(sort_locale);
            state.opt.multi_layout.push(locale_data);
        }
        state.opt.has_layout_locale = true;
    } else {
        // For if and if-else

        // Split argument
        lst = arg.split(/\s+/);

        // Expand each list element
        var locale_bares = [];
        for (i = 0, ilen = lst.length; i < ilen; i += 1) {
            // Parse out language string
            lang = lst[i];
        
            // Analyze the locale
            langspec = CSL.localeResolve(lang, locale_default);
            if (lst[i].length === 2) {
                // For fallback
                locale_bares.push(langspec.bare);
            }
            // Load the locale terms etc.
            // (second argument causes immediate return if locale already exists)
            state.localeConfigure(langspec, true);
            
            // Replace string with locale spec object
            lst[i] = langspec;
        }
        // Locales to test
        var locale_list = lst.slice();

        // check for variable value
        // Closure probably not necessary here.
        var maketest = function (locale_list, locale_default,locale_bares) {
            return function (Item) {
                var res;
                ret = [];
                res = false;
                var langspec = false;

                var lang;
                if (!Item.language) {
                    lang = locale_default;
                } else {
                    lang = Item.language;
                }
                langspec = CSL.localeResolve(lang, locale_default);
                for (i = 0, ilen = locale_list.length; i < ilen; i += 1) {
                    if (langspec.best === locale_list[i].best) {
                        state.tmp.condition_lang_counter_arr.push(state.tmp.condition_counter);
                        state.tmp.condition_lang_val_arr.push(state.opt.lang);
                        state.opt.lang = locale_list[0].best;
                        res = true;
                        break;
                    }
                }
                if (!res && locale_bares.indexOf(langspec.bare) > -1) {
                    state.tmp.condition_lang_counter_arr.push(state.tmp.condition_counter);
                    state.tmp.condition_lang_val_arr.push(state.opt.lang);
                    state.opt.lang = locale_list[0].best;
                    res = true;
                }
                return res;
            };
        };
        this.tests.push(maketest(locale_list,locale_default,locale_bares));
    }
};

CSL.Attributes["@alternative-node-internal"] = function (state) {
    if (!this.tests) {this.tests = []; };
    var maketest = function () {
        return function() {
            return !state.tmp.abort_alternative;
        };
    };
    var me = this;
    this.tests.push(maketest(me));
};

CSL.Attributes["@locale-internal"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var langspec, lang, lst, i, ilen;
        // For if and if-else

        // Split argument
        lst = arg.split(/\s+/);

        // Expand each list element
        this.locale_bares = [];
        for (i = 0, ilen = lst.length; i < ilen; i += 1) {
            // Parse out language string
            lang = lst[i];
        
            // Analyze the locale
            langspec = CSL.localeResolve(lang, state.opt["default-locale"][0]);
            if (lst[i].length === 2) {
                // For fallback
                this.locale_bares.push(langspec.bare);
            }
            // Load the locale terms etc.
            state.localeConfigure(langspec);
            
            // Replace string with locale spec object
            lst[i] = langspec;
        }
        // Set locale tag on node
        this.locale_default = state.opt["default-locale"][0];
        // The locale to set on node children if match is successful
        this.locale = lst[0].best;
        // Locales to test
        this.locale_list = lst.slice();
        
        // check for variable value
        // Closure probably not necessary here.
        var maketest = function (me) {
            return function (Item) {
                var ret, res;
                ret = [];
                res = false;
                var langspec = false;
                if (Item.language) {
                    lang = Item.language;
                    langspec = CSL.localeResolve(lang, state.opt["default-locale"][0]);
                    if (langspec.best === state.opt["default-locale"][0]) {
                        langspec = false;
                    }
                }
                if (langspec) {
                    // We attempt to match a specific locale from the
                    // list of parameters.  If that fails, we fall back
                    // to the base locale of the first element.  The
                    // locale applied is always the first local 
                    // in the list of parameters (or base locale, for a 
                    // single two-character language code) 
                    for (i = 0, ilen = me.locale_list.length; i < ilen; i += 1) {
                        if (langspec.best === me.locale_list[i].best) {
                            state.opt.lang = me.locale;
                            state.tmp.last_cite_locale = me.locale;
                            // Set empty group open tag with locale set marker
                            state.output.openLevel("empty");
                            state.output.current.value().new_locale = me.locale;
                            res = true;
                            break;
                        }
                    }
                    if (!res && me.locale_bares.indexOf(langspec.bare) > -1) {
                        state.opt.lang = me.locale;
                        state.tmp.last_cite_locale = me.locale;
                        // Set empty group open tag with locale set marker
                        state.output.openLevel("empty");
                        state.output.current.value().new_locale = me.locale;
                        res = true;
                    }
                }
                return res;
            };
        };
        var me = this;
        this.tests.push(maketest(me));
};


CSL.Attributes["@court-class"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
	var tryclasses = arg.split(/\s+/);
    var maketest = function (tryclass) {
        return function(Item) {
            var cls = CSL.GET_COURT_CLASS(state, Item);
            if (cls === tryclass) {
                return true;
            } else {
                return false;
            }
        };
    };
    for (var i=0,ilen=tryclasses.length; i<ilen; i++) {
        this.tests.push(maketest(tryclasses[i]));
    }
};

CSL.Attributes["@container-multiple"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
	var retval = "true" === arg ? true : false;
    var maketest = function (retval) {
        return function(Item) {
            if (!state.tmp.container_item_count[Item.container_id]) {
                return !retval;
            } else if (state.tmp.container_item_count[Item.container_id] > 1) {
                return retval;
            }
            return !retval;
        };
    };
    this.tests.push(maketest(retval));
};

CSL.Attributes["@container-subsequent"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
	var retval = "true" === arg ? true : false;
    var maketest = function (retval) {
        return function(Item) {
            if (state.tmp.container_item_pos[Item.container_id] > 1) {
                return retval;
            }
            return !retval;
        };
    };
    this.tests.push(maketest(retval));
};

CSL.Attributes["@has-subunit"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var maketest = function(namevar) {
        return function (Item) {
            var subunit_count = 0;
            for (var i in Item[namevar]) {
                var name = Item[namevar][i];
                if (!name.given) {
                    var institution = name.literal ? name.literal : name.family;
                    var length = institution.split("|").length;
                    if (subunit_count === 0 || length < subunit_count) {
                        subunit_count = length;
                    }
                }
            }
            return (subunit_count > 1);
        };
    };
    this.tests.push(maketest(arg));
}

CSL.Attributes["@cite-form"] = function (state, arg) {
    if (!this.tests) {this.tests = []; };
    var maketest = function(citeForm) {
        return function (Item) {
            if (Item["cite-form"] === citeForm) {
                return true;
            }
            return false;
        };
    };
    this.tests.push(maketest(arg));
}

CSL.Attributes["@disable-duplicate-year-suppression"] = function (state, arg) {
	state.opt.disable_duplicate_year_suppression = arg.split(/\s+/);
}

CSL.Attributes["@consolidate-containers"] = function (state, arg) {
    CSL.Attributes["@track-containers"](state, arg);
    var args = arg.split(/\s+/);
    state.bibliography.opt.consolidate_containers = args;
}

CSL.Attributes["@track-containers"] = function (state, arg) {
    var args = arg.split(/\s+/);
    if (!state.bibliography.opt.track_container_items) {
        state.bibliography.opt.track_container_items = [];
    }
    if (!state.bibliography.opt.consolidate_containers) {
        state.bibliography.opt.consolidate_containers = [];
    }
    state.bibliography.opt.track_container_items = state.bibliography.opt.track_container_items.concat(args);
}

// These are not evaluated as conditions immediately: they only
// set parameters that are picked up during processing.
CSL.Attributes["@parallel-first"] = function (state, arg) {
    state.opt.parallel.enable = true;
    var vars = arg.split(/\s+/);
    if (!state.opt.track_repeat) {
        state.opt.track_repeat = {};
    }
    this.parallel_first = {};
    for (var i in vars) {
        var v = vars[i];
        this.parallel_first[v] = true;
        state.opt.track_repeat[v] = true;
    }
};
CSL.Attributes["@parallel-last"] = function (state, arg) {
    state.opt.parallel.enable = true;
    var vars = arg.split(/\s+/);
    if (!state.opt.track_repeat) {
        state.opt.track_repeat = {};
    }
    this.parallel_last = {};
    for (var i in vars) {
        var v = vars[i];
        this.parallel_last[v] = true;
        state.opt.track_repeat[v] = true;
    }
};
CSL.Attributes["@parallel-last-to-first"] = function (state, arg) {
    state.opt.parallel.enable = true;
    var vars = arg.split(/\s+/);
    this.parallel_last_to_first = {};
    for (var i=0,ilen=vars.length;i<ilen;i++) {
        this.parallel_last_to_first[vars[i]] = true;
    }
};
CSL.Attributes["@parallel-delimiter-override"] = function (state, arg) {
    state.opt.parallel.enable = true;
    this.strings.set_parallel_delimiter_override = arg;
};
CSL.Attributes["@parallel-delimiter-override-on-suppress"] = function (state, arg) {
    state.opt.parallel.enable = true;
    this.strings.set_parallel_delimiter_override_on_suppress = arg;
};
CSL.Attributes["@no-repeat"] = function (state, arg) {
    state.opt.parallel.enable = true;
    var vars = arg.split(/\s+/);
    if (!state.opt.track_repeat) {
        state.opt.track_repeat = {};
    }
    this.non_parallel = {};
    for (var i in vars) {
        var v = vars[i];
        this.non_parallel[v] = true;
        state.opt.track_repeat[v] = true;
    }
};

CSL.Attributes["@require"] = function (state, arg) {
    state.opt.use_context_condition = true;
    this.strings.require = arg;

    // Introduced to constrain rendering of the group with a
    // requirement that it either render an alpha term via cs:label or
    // cs:text at least once, or render without any label. That
    // behaviour is invoked with "label-empty-or-alpha" as arg.

    // This attribute is a complement to @label-form and modular
    // jurisdiction support, as it makes macros that adapt to shifting
    // local term definitions possible.
};

CSL.Attributes["@reject"] = function (state, arg) {
    state.opt.use_context_condition = true;
    this.strings.reject = arg;

    // Introduced to constrain rendering of the group with a
    // requirement that it render some label via cs:label or cs:text,
    // and that it NOT be alpha. That behaviour is invoked with
    // "label-empty-or-alpha" as arg.

    // This attribute is a complement to @label-form and modular
    // jurisdiction support, as it makes macros that adapt to shifting
    // local term definitions possible.
};

CSL.Attributes["@require-comma-on-symbol"] = function (state, arg) {
    state.opt.require_comma_on_symbol = arg;
}

CSL.Attributes["@gender"] = function (state, arg) {
    this.gender = arg;
};

CSL.Attributes["@cslid"] = function (state, arg) {
    // @cslid is a noop
    // The value set on this attribute is used to
    // generate reverse lookup wrappers on output when 
    // this.development_extensions.csl_reverse_lookup_support is
    // set to true in state.js (there is no runtime option,
    // it must be set in state.js)
    //
    // See the @showid method in the html output
    // section of formats.js for the function that
    // renders the wrappers.
    this.cslid = parseInt(arg, 10);
};

CSL.Attributes["@capitalize-if-first"] = function (state, arg) {
    this.strings.capitalize_if_first_override = arg;
};

CSL.Attributes["@label-capitalize-if-first"] = function (state, arg) {
    this.strings.label_capitalize_if_first_override = arg;
};

CSL.Attributes["@label-form"] = function (state, arg) {
    this.strings.label_form_override = arg;
};

CSL.Attributes["@part-separator"] = function (state, arg) {
    this.strings["part-separator"] = arg;
};

CSL.Attributes["@leading-noise-words"] = function (state, arg) {
    this["leading-noise-words"] = arg;
};

CSL.Attributes["@name-never-short"] = function (state, arg) {
    this["name-never-short"] = arg;
};

CSL.Attributes["@class"] = function (state, arg) {
    state.opt["class"] = arg;
};

CSL.Attributes["@version"] = function (state, arg) {
    state.opt.version = arg;
};

/**
 * Store the value attribute on the token.
 * @name CSL.Attributes.@value
 * @function
 */
CSL.Attributes["@value"] = function (state, arg) {
    this.strings.value = arg;
};


/**
 * Store the name attribute (of a macro or term node)
 * on the state object.
 * <p>For reference when the closing node of a macro
 * or locale definition is encountered.</p>
 * @name CSL.Attributes.@name
 * @function
 */
CSL.Attributes["@name"] = function (state, arg) {
    this.strings.name = arg;
};

/**
 * Store the form attribute (of a term node) on the state object.
 * <p>For reference when the closing node of a macro
 * or locale definition is encountered.</p>
 * @name CSL.Attributes.@form
 * @function
 */
CSL.Attributes["@form"] = function (state, arg) {
    this.strings.form = arg;
};

CSL.Attributes["@date-parts"] = function (state, arg) {
    this.strings["date-parts"] = arg;
};

CSL.Attributes["@range-delimiter"] = function (state, arg) {
    this.strings["range-delimiter"] = arg;
};

/**
 * Store macro tokens in a buffer on the state object.
 * <p>For reference when the enclosing text token is
 * processed.</p>
 * @name CSL.Attributes.@macro
 * @function
 */
CSL.Attributes["@macro"] = function (state, arg) {
    this.postponed_macro = arg;
};

/*
 * CSL.Attributes["@prefer-jurisdiction"] = function (state, arg) {
 *    this.prefer_jurisdiction = true;
 * };
 */

CSL.Attributes["@term"] = function (state, arg) {
    if (arg === "sub verbo") {
        this.strings.term = "sub-verbo";
    } else {
        this.strings.term = arg;
    }
};


/*
 * Ignore xmlns attribute.
 * <p>This should always be <p>http://purl.org/net/xbiblio/csl</code>
 * anyway.  At least for the present we will blindly assume
 * that it is.</p>
 * @name CSL.Attributes.@xmlns
 * @function
 */
CSL.Attributes["@xmlns"] = function () {};


/*
 * Store language attribute to a buffer field.
 * <p>Will be placed in the appropriate location
 * when the element is processed.</p>
 * @name CSL.Attributes.@lang
 * @function
 */
CSL.Attributes["@lang"] = function (state, arg) {
    if (arg) {
        state.build.lang = arg;
    }
};


// Used as a flag during dates processing
CSL.Attributes["@lingo"] = function () {};

// Used as a flag during dates processing
CSL.Attributes["@macro-has-date"] = function () {
    this["macro-has-date"] = true;
};

/*
 * Store suffix string on token.
 * @name CSL.Attributes.@suffix
 * @function
 */
CSL.Attributes["@suffix"] = function (state, arg) {
    this.strings.suffix = arg;
};


/*
 * Store prefix string on token.
 * @name CSL.Attributes.@prefix
 * @function
 */
CSL.Attributes["@prefix"] = function (state, arg) {
    this.strings.prefix = arg;
};


/*
 * Store delimiter string on token.
 * @name CSL.Attributes.@delimiter
 * @function
 */
CSL.Attributes["@delimiter"] = function (state, arg) {
    this.strings.delimiter = arg;
};


/*
 * Store match evaluator on token.
 */
CSL.Attributes["@match"] = function (state, arg) {
    this.match = arg;
};


CSL.Attributes["@names-min"] = function (state, arg) {
    var val = parseInt(arg, 10);
    if (state[state.build.area].opt.max_number_of_names < val) {
        state[state.build.area].opt.max_number_of_names = val;
    }
    this.strings["et-al-min"] = val;
};

CSL.Attributes["@names-use-first"] = function (state, arg) {
    this.strings["et-al-use-first"] = parseInt(arg, 10);
};

CSL.Attributes["@names-use-last"] = function (state, arg) {
    if (arg === "true") {
        this.strings["et-al-use-last"] = true;
    } else {
        this.strings["et-al-use-last"] = false;
    }
};

CSL.Attributes["@sort"] = function (state, arg) {
    if (arg === "descending") {
        this.strings.sort_direction = CSL.DESCENDING;
    }
};

CSL.Attributes["@plural"] = function (state, arg) {
    // Accepted values of plural attribute differ on cs:text
    // and cs:label nodes.
    if ("always" === arg || "true" === arg) {
        this.strings.plural = 1;
    } else if ("never" === arg || "false" === arg) {
        this.strings.plural = 0;
    } else if ("contextual" === arg) {
        this.strings.plural = false;
    }
};

CSL.Attributes["@has-publisher-and-publisher-place"] = function () {
    this.strings["has-publisher-and-publisher-place"] = true;
};

CSL.Attributes["@publisher-delimiter-precedes-last"] = function (state, arg) {
    this.strings["publisher-delimiter-precedes-last"] = arg;
};

CSL.Attributes["@publisher-delimiter"] = function (state, arg) {
    this.strings["publisher-delimiter"] = arg;
};

CSL.Attributes["@publisher-and"] = function (state, arg) {
    this.strings["publisher-and"] = arg;
};

CSL.Attributes["@givenname-disambiguation-rule"] = function (state, arg) {
    if (CSL.GIVENNAME_DISAMBIGUATION_RULES.indexOf(arg) > -1) {
        state.citation.opt["givenname-disambiguation-rule"] = arg;
    }
};

CSL.Attributes["@collapse"] = function (state, arg) {
    // only one collapse value will be honoured.
    if (arg) {
        state[this.name].opt.collapse = arg;
    }
};

CSL.Attributes["@cite-group-delimiter"] = function (state, arg) {
    if (arg) {
        state[state.tmp.area].opt.cite_group_delimiter = arg;
    }
};



CSL.Attributes["@names-delimiter"] = function (state, arg) {
    state.setOpt(this, "names-delimiter", arg);
};

CSL.Attributes["@name-form"] = function (state, arg) {
    state.setOpt(this, "name-form", arg);
};

CSL.Attributes["@subgroup-delimiter"] = function (state, arg) {
    this.strings["subgroup-delimiter"] = arg;
};

CSL.Attributes["@subgroup-delimiter-precedes-last"] = function (state, arg) {
    this.strings["subgroup-delimiter-precedes-last"] = arg;
};


CSL.Attributes["@name-delimiter"] = function (state, arg) {
    state.setOpt(this, "name-delimiter", arg);
};

CSL.Attributes["@et-al-min"] = function (state, arg) {
    var val = parseInt(arg, 10);
    if (state[state.build.area].opt.max_number_of_names < val) {
        state[state.build.area].opt.max_number_of_names = val;
    }
    state.setOpt(this, "et-al-min", val);
};

CSL.Attributes["@et-al-use-first"] = function (state, arg) {
    state.setOpt(this, "et-al-use-first", parseInt(arg, 10));
};

CSL.Attributes["@et-al-use-last"] = function (state, arg) {
    if (arg === "true") {
        state.setOpt(this, "et-al-use-last", true);
    } else {
        state.setOpt(this, "et-al-use-last", false);
    }
};

CSL.Attributes["@et-al-subsequent-min"] = function (state, arg) {
    var val = parseInt(arg, 10);
    if (state[state.build.area].opt.max_number_of_names < val) {
        state[state.build.area].opt.max_number_of_names = val;
    }
    state.setOpt(this, "et-al-subsequent-min", val);
};

CSL.Attributes["@et-al-subsequent-use-first"] = function (state, arg) {
    state.setOpt(this, "et-al-subsequent-use-first", parseInt(arg, 10));
};

CSL.Attributes["@suppress-min"] = function (state, arg) {
    this.strings["suppress-min"] = parseInt(arg, 10);
};

CSL.Attributes["@suppress-max"] = function (state, arg) {
    this.strings["suppress-max"] = parseInt(arg, 10);
};


CSL.Attributes["@and"] = function (state, arg) {
    state.setOpt(this, "and", arg);
};

CSL.Attributes["@delimiter-precedes-last"] = function (state, arg) {
    state.setOpt(this, "delimiter-precedes-last", arg);
};

CSL.Attributes["@delimiter-precedes-et-al"] = function (state, arg) {
    state.setOpt(this, "delimiter-precedes-et-al", arg);
};

CSL.Attributes["@initialize-with"] = function (state, arg) {
    state.setOpt(this, "initialize-with", arg);
};

CSL.Attributes["@initialize"] = function (state, arg) {
    if (arg === "false") {
        state.setOpt(this, "initialize", false);
    }
};

CSL.Attributes["@name-as-reverse-order"] = function (state, arg) {
    this["name-as-reverse-order"] = arg;
};

CSL.Attributes["@name-as-sort-order"] = function (state, arg) {
    if (this.name === "style-options") {
        this["name-as-sort-order"] = arg;
    } else {
        state.setOpt(this, "name-as-sort-order", arg);
    }
};

CSL.Attributes["@sort-separator"] = function (state, arg) {
    state.setOpt(this, "sort-separator", arg);
};

CSL.Attributes["@require-match"] = function (state, arg) {
    if (arg === "true") {
        this.requireMatch = true;
    }
};

CSL.Attributes["@exclude-types"] = function (state, arg) {
    state.bibliography.opt.exclude_types = arg.split(/\s+/);
};

CSL.Attributes["@exclude-with-fields"] = function (state, arg) {
    state.bibliography.opt.exclude_with_fields = arg.split(/\s+/);
};


CSL.Attributes["@year-suffix-delimiter"] = function (state, arg) {
    state[this.name].opt["year-suffix-delimiter"] = arg;
};

CSL.Attributes["@after-collapse-delimiter"] = function (state, arg) {
    state[this.name].opt["after-collapse-delimiter"] = arg;
};

CSL.Attributes["@subsequent-author-substitute"] = function (state, arg) {
    state[this.name].opt["subsequent-author-substitute"] = arg;
};

CSL.Attributes["@subsequent-author-substitute-rule"] = function (state, arg) {
    state[this.name].opt["subsequent-author-substitute-rule"] = arg;
};

CSL.Attributes["@disambiguate-add-names"] = function (state, arg) {
    if (arg === "true") {
        state.opt["disambiguate-add-names"] = true;
    }
};

CSL.Attributes["@disambiguate-add-givenname"] = function (state, arg) {
    if (arg === "true") {
        state.opt["disambiguate-add-givenname"] = true;
    }
};

CSL.Attributes["@disambiguate-add-year-suffix"] = function (state, arg) {
    if (arg === "true" && state.opt.xclass !== "numeric") {
        state.opt["disambiguate-add-year-suffix"] = true;
    }
};


CSL.Attributes["@second-field-align"] = function (state, arg) {
    if (arg === "flush" || arg === "margin") {
        state[this.name].opt["second-field-align"] = arg;
    }
};


CSL.Attributes["@hanging-indent"] = function (state, arg) {
    if (arg === "true") {
        if (state.opt.development_extensions.hanging_indent_legacy_number) {
            state[this.name].opt.hangingindent = 2;
	    } else {
            state[this.name].opt.hangingindent = true;
	    }
    }
};


CSL.Attributes["@line-spacing"] = function (state, arg) {
    if (arg && arg.match(/^[.0-9]+$/)) {
        state[this.name].opt["line-spacing"] = parseFloat(arg, 10);
    }
};


CSL.Attributes["@entry-spacing"] = function (state, arg) {
    if (arg && arg.match(/^[.0-9]+$/)) {
        state[this.name].opt["entry-spacing"] = parseFloat(arg, 10);
    }
};


CSL.Attributes["@near-note-distance"] = function (state, arg) {
    state[this.name].opt["near-note-distance"] = parseInt(arg, 10);
};

CSL.Attributes["@substring"] = function (state, arg) {
    this.substring = parseInt(arg, 10);
};

CSL.Attributes["@text-case"] = function (state, arg) {
    var func = function (state, Item) {
        if (arg === "normal") {
            this.text_case_normal = true;
        } else {
            this.strings["text-case"] = arg;
            if (arg === "title") {
                if (Item.jurisdiction) {
                    this.strings["text-case"] = "passthrough";
                }
            }
        }
    };
    this.execs.push(func);
};


CSL.Attributes["@page-range-format"] = function (state, arg) {
    state.opt["page-range-format"] = arg;
};


CSL.Attributes["@year-range-format"] = function (state, arg) {
    state.opt["year-range-format"] = arg;
};


CSL.Attributes["@default-locale"] = function (state, arg) {
    if (this.name === 'style') {
        var lst, len, pos, m, ret;
        //
        // Workaround for Internet Exploder 6 (doesn't recognize
        // groups in str.split(/something(braced-group)something/)
        //
        var m = arg.match(/-x-(sort|translit|translat)-/g);
        if (m) {
            for (pos = 0, len = m.length; pos < len; pos += 1) {
                m[pos] = m[pos].replace(/^-x-/, "").replace(/-$/, "");
            }
        }
        lst = arg.split(/-x-(?:sort|translit|translat)-/);
        ret = [lst[0]];
        for (pos = 1, len = lst.length; pos < len; pos += 1) {
            ret.push(m[pos - 1]);
            ret.push(lst[pos]);
        }
        lst = ret.slice();
        len = lst.length;
        for (pos = 1; pos < len; pos += 2) {
            state.opt[("locale-" + lst[pos])].push(lst[(pos + 1)].replace(/^\s*/g, "").replace(/\s*$/g, ""));
        }
        if (lst.length) {
            state.opt["default-locale"] = lst.slice(0, 1);
        } else {
            state.opt["default-locale"] = ["en"];
        }
    } else if (arg === "true") {
        this.default_locale = true;
    }
};

CSL.Attributes["@default-locale-sort"] = function (state, arg) {
    state.opt["default-locale-sort"] = arg;
};

CSL.Attributes["@demote-non-dropping-particle"] = function (state, arg) {
    state.opt["demote-non-dropping-particle"] = arg;
};

CSL.Attributes["@initialize-with-hyphen"] = function (state, arg) {
    if (arg === "false") {
        state.opt["initialize-with-hyphen"] = false;
    }
};

CSL.Attributes["@institution-parts"] = function (state, arg) {
    this.strings["institution-parts"] = arg;
};

CSL.Attributes["@if-short"] = function (state, arg) {
    if (arg === "true") {
        this.strings["if-short"] = true;
    }
};

CSL.Attributes["@substitute-use-first"] = function (state, arg) {
    this.strings["substitute-use-first"] = parseInt(arg, 10);
};

CSL.Attributes["@use-first"] = function (state, arg) {
    this.strings["use-first"] = parseInt(arg, 10);
};

CSL.Attributes["@use-last"] = function (state, arg) {
    this.strings["use-last"] = parseInt(arg, 10);
};

CSL.Attributes["@stop-first"] = function (state, arg) {
    this.strings["stop-first"] = parseInt(arg, 10);
};

CSL.Attributes["@stop-last"] = function (state, arg) {
    this.strings["stop-last"] = parseInt(arg, 10) * -1;
};


CSL.Attributes["@reverse-order"] = function (state, arg) {
    if ("true" === arg) {
        this.strings["reverse-order"] = true;
    }
};

CSL.Attributes["@display"] = function (state, arg) {
    if (state.bibliography.tokens.length === 2) {
        state.opt.using_display = true;
    }
    this.strings.cls = arg;
};

