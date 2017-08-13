
CSL.Node["et-al"] = {
    build: function (state, target) {
        if (state.build.area === "citation" || state.build.area === "bibliography") {
            var func = function (state, Item) {
                state.tmp.etal_node = this;
                if ("string" === typeof this.strings.term) {
                    state.tmp.etal_term = this.strings.term;
                }
            }
            this.execs.push(func);
        }
        target.push(this);
    }
};
