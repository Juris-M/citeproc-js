/*global CSL: true */

CSL.Node.label = {
    build: function (state, target) {
        if (this.strings.term) {
            var func = function (state, Item, item) {
                // Must accomplish this without touching strings
                // shared with the calling application: "sub verbo"
                // and "sub-verbo" must both pass, as they stand.
                //if (item && item.label === "sub verbo") {
                //    item.label = "sub-verbo";
                //}
                // This is abstracted away, because the same
                // logic must be run in cs:names.
                var termtxt = CSL.evaluateLabel(this, state, Item, item);
                if (item && this.strings.term === "locator") {

                    state.parallel.StartVariable("label");
                    state.parallel.AppendToVariable(item.label);

                    item.section_form_override = this.strings.form;

                }
                if (termtxt) {
                    state.tmp.group_context.tip.term_intended = true;
                }
                CSL.UPDATE_GROUP_CONTEXT_CONDITION(state, termtxt);
                if (termtxt.indexOf("%s") === -1) {
                    // Suppress output here if we have an embedded term
                    state.output.append(termtxt, this);
                }
                if (item && this.strings.term === "locator") {
                    state.parallel.CloseVariable();
                }
            };
            this.execs.push(func);
        } else {
            // Names labels
            // Picked up in names END
            var namevars = state.build.names_variables.slice(-1)[0];
            var i, ilen;
            if (!state.build.name_label) {
                state.build.name_label = {};
            }
            for (i = 0, ilen = namevars.length; i < ilen; i += 1) {
                if (!state.build.name_label[namevars[i]]) {
                    state.build.name_label[namevars[i]] = {};
                }
            }
            if (!state.build.name_flag) {
                for (i = 0, ilen = namevars.length; i < ilen; i += 1) {
                    state.build.name_label[namevars[i]].before = this;
                }
            } else {
                for (i = 0, ilen = namevars.length; i < ilen; i += 1) {
                    state.build.name_label[namevars[i]].after = this;
                }
            }
        }
        target.push(this);
    }
};
