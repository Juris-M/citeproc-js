// Disambiguate names (the number of names is controlled externally, by successive
// runs of the processor).

CSL.NameOutput.prototype.disambigNames = function () {
    var pos;
    for (var i = 0, ilen = this.variables.length; i < ilen; i += 1) {
        var v = this.variables[i];
        pos = this.nameset_base + i;
        if (this.freeters[v].length) {
            this._runDisambigNames(this.freeters[v], pos);
        }
        // Is this even necessary???
        if (this.institutions[v].length) {
            if ("undefined" === typeof this.state.tmp.disambig_settings.givens[pos]) {
                this.state.tmp.disambig_settings.givens[pos] = [];
            }
            for (var j=0,jlen=this.institutions[v].length;j<jlen;j+=1) {
                if ("undefined" === typeof this.state.tmp.disambig_settings.givens[pos][j]) {
                    this.state.tmp.disambig_settings.givens[pos].push(2);
                }
            }
        }
        for (j = 0, jlen = this.persons[v].length; j < jlen; j += 1) {
            if (this.persons[v][j].length) {
                this._runDisambigNames(this.persons[v][j], pos);
            }
        }
    }
};

CSL.NameOutput.prototype._runDisambigNames = function (lst, pos) {
    var chk, myform, myinitials, param, i, ilen, paramx;
    //if (this.state.tmp.root === "bibliography") {
    //    return;
    //}
    for (i = 0, ilen = lst.length; i < ilen; i += 1) {
        //
        // register the name in the global names disambiguation
        // registry

        if (!lst[i].given && !lst[i].family) {
            continue;
        }

        myinitials = this.state.inheritOpt(this.name, "initialize-with");
        this.state.registry.namereg.addname("" + this.Item.id, lst[i], i);
        chk = this.state.tmp.disambig_settings.givens[pos];
        if ("undefined" === typeof chk) {
            // Holes can appear in the list, probably due to institutional
            // names that this doesn't touch. Maybe. This fills them up.
            for (var j = 0, jlen = pos + 1; j < jlen; j += 1) {
                if (!this.state.tmp.disambig_settings.givens[j]) {
                    this.state.tmp.disambig_settings.givens[j] = [];
                }
            }
        }
        chk = this.state.tmp.disambig_settings.givens[pos][i];
        //if ("undefined" !== typeof chk && this.state.tmp.root === 'citation') {
            //this.state.tmp.disambig_settings.givens[pos] = [];
            //chk = undefined;
        //}
        if ("undefined" === typeof chk) {
            myform = this.state.inheritOpt(this.name, "form", "name-form");
            param = this.state.registry.namereg.evalname("" + this.Item.id, lst[i], i, 0, myform, myinitials);
            this.state.tmp.disambig_settings.givens[pos].push(param);
        }
        //
        // set the display mode default for givennames if required
        myform = this.state.inheritOpt(this.name, "form", "name-form");
        paramx = this.state.registry.namereg.evalname("" + this.Item.id, lst[i], i, 0, myform, myinitials);
        // this.state.registry.namereg.evalname("" + this.Item.id, lst[i], i, 0, myform, myinitials);
        if (this.state.tmp.disambig_request) {
            //
            // fix a request for initials that makes no sense.
            // can't do this in disambig, because the availability
            // of initials is not a global parameter.
            var val = this.state.tmp.disambig_settings.givens[pos][i];
            // This is limited to by-cite disambiguation.
            // 2012-09-13: added lst[i].given check to condition
            if (val === 1 && 
                this.state.citation.opt["givenname-disambiguation-rule"] === "by-cite" && 
                ("undefined" === typeof this.state.inheritOpt(this.name, "initialize-with")
                 || "undefined" === typeof lst[i].given)) {
                val = 2;
            }
            param = val;
            // 2012-09-13: lst[i].given check protects against personal names
            // that have no first name element. These were causing an infinite loop,
            // this prevents that.
            if (this.state.opt["disambiguate-add-givenname"] && lst[i].given) {
                param = this.state.registry.namereg.evalname("" + this.Item.id, lst[i], i, param, this.state.inheritOpt(this.name, "form", "name-form"), this.state.inheritOpt(this.name, "initialize-with"));
            }
        } else {
            //
            // it clicks.  here is where we will put the
            // call to the names register, to get the floor value
            // for an individual name.
            //
            param = paramx;
        }
        // Need to save off the settings based on subsequent
        // form, when first cites are rendered.
        if (!this.state.tmp.just_looking && this.item && this.item.position === CSL.POSITION_FIRST) {
            if (paramx > param) {
                param = paramx;
            }
        }
        if (!this.state.tmp.sort_key_flag) {
            this.state.tmp.disambig_settings.givens[pos][i] = param;
            if ("string" === typeof myinitials
                && ("undefined" === typeof this.name.strings["initialize"]
                    || true === this.name.strings["initialize"])) {

                this.state.tmp.disambig_settings.use_initials = true;
            }
        }
    }
    //this.state.registry.registry[this.Item.id].disambig.givens = this.state.tmp.disambig_settings.givens.slice();
};
