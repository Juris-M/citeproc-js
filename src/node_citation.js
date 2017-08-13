
CSL.Node.citation = {
    build: function (state, target) {
        if (this.tokentype === CSL.START) {

            state.build.area = "citation";
            state.build.root = "citation";
            state.build.extension = "";


            var func = function(state) {
                state.tmp.area = "citation";
                state.tmp.root = "citation";
                state.tmp.extension = "";
            }
            this.execs.push(func);

/*
            state.build.root = "citation";

            OK state.fixOpt(this, "names-delimiter", "delimiter");
            OK state.fixOpt(this, "name-delimiter", "delimiter");
            OK state.fixOpt(this, "name-form", "form");
            OK state.fixOpt(this, "and", "and");
            OK state.fixOpt(this, "delimiter-precedes-last", "delimiter-precedes-last");
            OK state.fixOpt(this, "delimiter-precedes-et-al", "delimiter-precedes-et-al");
            OK state.fixOpt(this, "initialize-with", "initialize-with");
            OK state.fixOpt(this, "initialize", "initialize");
            OK state.fixOpt(this, "name-as-sort-order", "name-as-sort-order");
            OK state.fixOpt(this, "sort-separator", "sort-separator");

            OK state.fixOpt(this, "et-al-min", "et-al-min");
            OK state.fixOpt(this, "et-al-use-first", "et-al-use-first");
            OK state.fixOpt(this, "et-al-use-last", "et-al-use-last");
            state.fixOpt(this, "et-al-subsequent-min", "et-al-subsequent-min");
            state.fixOpt(this, "et-al-subsequent-use-first", "et-al-subsequent-use-first");
*/
        }
        if (this.tokentype === CSL.END) {

            // Open an extra key at first position for use in
            // grouped sorts.
            // print("in cs:citation END");
            state.opt.grouped_sort = state.opt.xclass === "in-text" 
                && (state.citation.opt.collapse 
                    && state.citation.opt.collapse.length)
                || (state.citation.opt.cite_group_delimiter
                    && state.citation.opt.cite_group_delimiter.length)
                && state.opt.update_mode !== CSL.POSITION
                && state.opt.update_mode !== CSL.NUMERIC;
            
            if (state.opt.grouped_sort 
                && state.citation_sort.opt.sort_directions.length) {
                
                var firstkey = state.citation_sort.opt.sort_directions[0].slice();
                //print("extending sort keys "+state.citation_sort.opt.sort_directions+" with "+firstkey);
                state.citation_sort.opt.sort_directions = [firstkey].concat(state.citation_sort.opt.sort_directions);
                // print("new key directions in effect: "+state.citation_sort.opt.sort_directions);
            }
            // print("creating new comparifier");
            state.citation.srt = new CSL.Registry.Comparifier(state, "citation_sort");
        }
        target.push(this);
    }
};

