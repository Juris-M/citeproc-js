
CSL.NameOutput.prototype.constrainNames = function () {
    // figure out how many names to include, in light of the disambig params
    //
    this.names_count = 0;
    var pos;
    for (var i = 0, ilen = this.variables.length; i < ilen; i += 1) {
        var v = this.variables[i];
        pos = this.nameset_base + i;
        // Constrain independent authors here
        if (this.freeters[v].length) {
            this.state.tmp.names_max.push(this.freeters[v].length, "literal");
            this._imposeNameConstraints(this.freeters, this.freeters_count, v, pos);
            this.names_count += this.freeters[v].length;
        }

        // Constrain institutions here
        if (this.institutions[v].length) {
            this.state.tmp.names_max.push(this.institutions[v].length, "literal");
            this._imposeNameConstraints(this.institutions, this.institutions_count, v, pos);
            this.persons[v] = this.persons[v].slice(0, this.institutions[v].length);
            this.names_count += this.institutions[v].length;
        }

        for (var j = 0, jlen = this.persons[v].length; j < jlen; j += 1) {
            // Constrain affiliated authors here
            if (this.persons[v][j].length) {
                this.state.tmp.names_max.push(this.persons[v][j].length, "literal");
                this._imposeNameConstraints(this.persons[v], this.persons_count[v], j, pos);
                this.names_count += this.persons[v][j].length;
            }
        }
    }
};

CSL.NameOutput.prototype._imposeNameConstraints = function (lst, count, key, pos) {
    // display_names starts as the original length of this list of names.
    var display_names = lst[key];
    var discretionary_names_length = this.state.tmp["et-al-min"];
    
    // Mappings, to allow existing disambiguation machinery to
    // remain untouched.
    if (this.state.tmp.suppress_decorations) {
        if (this.state.tmp.disambig_request && this.state.tmp.disambig_request.names[pos]) {
            // Oh. Trouble.
            // state.tmp.nameset_counter is the number of the nameset
            // in the disambiguation try-sequence. Ouch.
            discretionary_names_length = this.state.tmp.disambig_request.names[pos];
        } else if (count[key] >= this.etal_min) {
            discretionary_names_length = this.etal_use_first;
        }
    } else {
        if (this.state.tmp.disambig_request 
            && this.state.tmp.disambig_request.names[pos] > this.etal_use_first) {

            if (count[key] < this.etal_min) {
                discretionary_names_length = count[key];
            } else {
                discretionary_names_length = this.state.tmp.disambig_request.names[pos];
            }
        } else if (count[key] >= this.etal_min) {
            //discretionary_names_length = this.state.tmp["et-al-use-first"];
            discretionary_names_length = this.etal_use_first;
        }
        // XXXX: This is a workaround. Under some conditions.
        // Where namesets disambiguate on one of the two names
        // dropped here, it is possible for more than one
        // in-text citation to be close (and indistinguishable)
        // matches to a single bibliography entry.
        //
        // 
        if (this.etal_use_last && discretionary_names_length > (this.etal_min - 2)) {
            discretionary_names_length = this.etal_min - 2;
        }
    }
    var sane = this.etal_min >= this.etal_use_first;
    var overlength = count[key] > discretionary_names_length;
    // This var is used to control contextual join, and
    // lies about the number of names when forceEtAl is true,
    // unless normalized.
    if (discretionary_names_length > count[key]) {

        // Use actual truncated list length, to avoid overrun.
        discretionary_names_length = display_names.length;
    }
    // forceEtAl is relevant when the author list is
    // truncated to eliminate clutter.
    if (sane && overlength) {
        if (this.etal_use_last) {
            lst[key] = display_names.slice(0, discretionary_names_length).concat(display_names.slice(-1));
        } else {
            lst[key] = display_names.slice(0, discretionary_names_length);
        }
    }
    this.state.tmp.disambig_settings.names[pos] = lst[key].length;
    this.state.disambiguate.padBase(this.state.tmp.disambig_settings);
    

    // ???
    //if (!this.state.tmp.disambig_request) {
    //    this.state.tmp.disambig_settings.givens[pos] = [];
    //}
};
