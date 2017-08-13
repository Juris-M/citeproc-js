
/*
 * Yikes, these functions were running out of scope for yonks.
 * now that they are set in the correct token list,
 * they might be useful for things.
 * FB 2013.11.09
*/

CSL.Node.sort = {
    build: function (state, target) {
        target = state[state.build.root + "_sort"].tokens;
        var func;
        if (this.tokentype === CSL.START) {
            if (state.build.area === "citation") {
                state.parallel.use_parallels = false;
                state.opt.sort_citations = true;
            }
            state.build.area = state.build.root + "_sort";
            state.build.extension = "_sort";
            
            func = function (state, Item) {
                //state.tmp.area = state.tmp.root + "_sort";
                //state.tmp.extension = "_sort";
                if (state.opt.has_layout_locale) {
                    var langspec = CSL.localeResolve(Item.language, state.opt["default-locale"][0]);
                    var sort_locales = state[state.tmp.area.slice(0,-5)].opt.sort_locales;
                    var langForItem;
                    for (var i=0,ilen=sort_locales.length;i<ilen;i+=1) {
                        langForItem = sort_locales[i][langspec.bare];
                        if (!langForItem) {
                            langForItem = sort_locales[i][langspec.best];
                        }
                        if (langForItem) {
                            break;
                        }
                    }
                    if (!langForItem) {
                        langForItem = state.opt["default-locale"][0];
                    }
                    state.tmp.lang_sort_hold = state.opt.lang;
                    state.opt.lang = langForItem;
                }
            }
            this.execs.push(func);
            
        }
        if (this.tokentype === CSL.END) {
            state.build.area = state.build.root;
            state.build.extension = "";
            func = function (state) {
                if (state.opt.has_layout_locale) {
                    state.opt.lang = state.tmp.lang_sort_hold;
                    delete state.tmp.lang_sort_hold;
                }
                //state.tmp.area = state.tmp.root;
                //state.tmp.extension = "";
            }
            this.execs.push(func);
            /*
            var func = function (state, Item) {
                state.tmp.area = state.tmp.root;
                state.tmp.extension = "";
            }
            this.execs.push(func);
            */
        }
        target.push(this);
    }
};


