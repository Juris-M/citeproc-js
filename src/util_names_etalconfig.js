
CSL.NameOutput.prototype.getEtAlConfig = function () {
    var item = this.item;
    this["et-al"] = {};

    this.state.output.append(this.etal_term, this.etal_style, true);
    this["et-al"].single = this.state.output.pop();
    this["et-al"].single.strings.suffix = this.etal_suffix;
    this["et-al"].single.strings.prefix = this.etal_prefix_single;
    
    this.state.output.append(this.etal_term, this.etal_style, true);
    this["et-al"].multiple = this.state.output.pop();
    this["et-al"].multiple.strings.suffix = this.etal_suffix;
    this["et-al"].multiple.strings.prefix = this.etal_prefix_multiple;

    // Et-al style parameters (may be sidestepped by disambiguation
    // in util_names_constraints.js)
    if ("undefined" === typeof item) {
        item = {};
    }
    //print("== getEtAlConfig() == "+this.state.tmp.area);

    if (item.position) {
        if (this.state.inheritOpt(this.name, "et-al-subsequent-min")) {
            // XX
            this.etal_min = this.state.inheritOpt(this.name, "et-al-subsequent-min");
        } else {
            // XX
            this.etal_min = this.state.inheritOpt(this.name, "et-al-min");
        }
        if (this.state.inheritOpt(this.name, "et-al-subsequent-use-first")) {
            // XX
            this.etal_use_first = this.state.inheritOpt(this.name, "et-al-subsequent-use-first");
        } else {
            // XX
            this.etal_use_first = this.state.inheritOpt(this.name, "et-al-use-first");
        }
    } else {
        if (this.state.tmp["et-al-min"]) {
            this.etal_min = this.state.tmp["et-al-min"];
        } else {
            // XX
            this.etal_min = this.state.inheritOpt(this.name, "et-al-min");
        }
        if (this.state.tmp["et-al-use-first"]) {
            this.etal_use_first = this.state.tmp["et-al-use-first"];
        } else {
            // XX
            this.etal_use_first = this.state.inheritOpt(this.name, "et-al-use-first");
        }
        if ("boolean" === typeof this.state.tmp["et-al-use-last"]) {
            //print("  etal_use_last from tmp: "+this.state.tmp["et-al-use-last"]);
            this.etal_use_last = this.state.tmp["et-al-use-last"];
        } else {
            //print("  etal_use_last from name: "+this.name.strings["et-al-use-last"]);
            // XX
            this.etal_use_last = this.state.inheritOpt(this.name, "et-al-use-last");
        }
        //print("  etal_use_last: "+this.etal_use_last);
    }
    // Provided for use as the starting level for disambiguation.
    if (!this.state.tmp["et-al-min"]) {
        this.state.tmp["et-al-min"] = this.etal_min;
    }
};
