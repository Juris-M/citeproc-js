
CSL.Node["institution-part"] = {
    build: function (state, target) {
        var func;
        if ("long" === this.strings.name) {
            if (this.strings["if-short"]) {
                func = function (state) {
                    state.nameOutput.institutionpart["long-with-short"] = this;
                };
            } else {
                func = function (state) {
                    state.nameOutput.institutionpart["long"] = this;
                };
            }
        } else if ("short" === this.strings.name) {
            func = function (state) {
                state.nameOutput.institutionpart["short"] = this;
            };
        }
        this.execs.push(func);
        target.push(this);
    }
};
