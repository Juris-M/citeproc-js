
CSL.NameOutput.prototype.truncatePersonalNameLists = function () {
    var v, i, ilen, j, jlen, chopvar;
    // XXX Before truncation, make a note of the original number
    // of names, for use in et-al evaluation.
    this.freeters_count = {};
    this.persons_count = {};
    this.institutions_count = {};
    // By key is okay here, as we don't care about sequence.
    for (v in this.freeters) {
        if (this.freeters.hasOwnProperty(v)) {
            this.freeters_count[v] = this.freeters[v].length;
            this.freeters[v] = this._truncateNameList(this.freeters, v);
        }
    }

    for (v in this.persons) {
        if (this.persons.hasOwnProperty(v)) {
            this.institutions_count[v] = this.institutions[v].length;
            this._truncateNameList(this.institutions, v);
            this.persons[v] = this.persons[v].slice(0, this.institutions[v].length);
            this.persons_count[v] = [];
            for (j = 0, jlen = this.persons[v].length; j < jlen; j += 1) {
                this.persons_count[v][j] = this.persons[v][j].length;
                this.persons[v][j] = this._truncateNameList(this.persons, v, j);
            }
        }
    }
    // Could be factored out to a separate function for clarity.
    if (this.etal_min === 1 && this.etal_use_first === 1 
        && !(this.state.tmp.extension
             || this.state.tmp.just_looking)) {
        chopvar = v;
    } else {
        chopvar = false;
    }
    if (chopvar || this._please_chop) {
        for (i = 0, ilen = this.variables.length; i < ilen; i += 1) {
            v = this.variables[i];
            if (this.freeters[v].length) {
                if (this._please_chop === v) {
                    this.freeters[v] = this.freeters[v].slice(1);
                    this.freeters_count[v] += -1;
                    this._please_chop = false;
                } else if (chopvar && !this._please_chop) {
                    this.freeters[v] = this.freeters[v].slice(0, 1);
                    this.freeters_count[v] = 1;
                    this.institutions[v] = [];
                    this.persons[v] = [];
                    this._please_chop = chopvar;
                }
            }
            for (j=0,jlen = this.persons[v].length;j<jlen;j++) {
                if (this.persons[v][j].length) {
                    if (this._please_chop === v) {
                        this.persons[v][j] = this.persons[v][j].slice(1);
                        this.persons_count[v][j] += -1;
                        this._please_chop = false;
                        break;
                    } else if (chopvar && !this._please_chop) {
                        this.freeters[v] = this.persons[v][j].slice(0, 1);
                        this.freeters_count[v] = 1;
                        this.institutions[v] = [];
                        this.persons[v] = [];
                        this._please_chop = chopvar;
                        break;
                    }
                }
            }
            if (this.institutions[v].length) {
                if (this._please_chop === v) {
                    this.institutions[v] = this.institutions[v].slice(1);
                    this.institutions_count[v] += -1;
                    this._please_chop = false;
                } else if (chopvar && !this._please_chop) {
                    this.institutions[v] = this.institutions[v].slice(0, 1);
                    this.institutions_count[v] = 1;
                    this._please_chop = chopvar;
                }
            }
        }
    }

    // Transliteration and abbreviation mapping

    // Hmm. This could produce three lists for each nameset:
    //   - primary (transformed in place)
    //   - secondary
    //   - tertiary
    // with items that produce no result in the secondary and tertiary
    // transforms set to false. Maybe.

    // Actually that would be insane, so forget it.
    // What we need is to add suitable parameters to getName(), and merge
    // the single-name-level operations below into that function. Then the
    // operation can be applied in util_names_render.js, and the logic
    // becomes very similar to what we already have running in util_transform.js.


    // Could also be factored out to a separate function for clarity.
    // ???? XXX Does this belong?
    for (i = 0, ilen = this.variables.length; i < ilen; i += 1) {
        if (this.institutions[v].length) {
            this.nameset_offset += 1;
        }
        for (j=0,jlen=this.persons[v].length;j<jlen;j++) {
            if (this.persons[v][j].length) {
                this.nameset_offset += 1;
            }
            // this.institutions[v][i] = this._splitInstitution(this.institutions[v][i], v, i);
        }
    }
};

CSL.NameOutput.prototype._truncateNameList = function (container, variable, index) {
    var lst;
    if ("undefined" === typeof index) {
        lst = container[variable];
    } else {
        lst = container[variable][index];
    }
    if (this.state[this.state[this.state.tmp.area].root].opt.max_number_of_names 
        && lst.length > 50 
        && lst.length > (this.state[this.state[this.state.tmp.area].root].opt.max_number_of_names + 2)) {

        // Preserve the last name in the list, in case we're rendering with a PI ellipsis (et-al-use-last)
        var limit = this.state[this.state[this.state.tmp.area].root].opt.max_number_of_names;
        lst = lst.slice(0, limit+1).concat(lst.slice(-1));
    }
    return lst;
};

