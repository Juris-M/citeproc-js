
CSL.NameOutput.prototype.setEtAlParameters = function () {
    var i, ilen, j, jlen;
    for (i = 0, ilen = this.variables.length; i < ilen; i += 1) {
        var v = this.variables[i];
        if ("undefined" === typeof this.etal_spec[v]) {
            this.etal_spec[v] = {freeters:0,institutions:0,persons:[]};
        }
        this.etal_spec[this.nameset_base + i] = this.etal_spec[v];
        if (this.freeters[v].length) {
            this._setEtAlParameter("freeters", v);
        }
        for (j = 0, jlen = this.persons[v].length; j < jlen; j += 1) {
            if ("undefined" === typeof this.etal_spec[v][j]) {
                this.etal_spec[v].persons[j] = 0;
            }
            this._setEtAlParameter("persons", v, j);
        }
        if (this.institutions[v].length) {
            this._setEtAlParameter("institutions", v);
        }
    }
};

CSL.NameOutput.prototype._setEtAlParameter = function (type, v, j) {
    var lst, count;
    if (type === "persons") {
        lst = this.persons[v][j];
        count = this.persons_count[v][j];
    } else {
        lst = this[type][v];
        count = this[type + "_count"][v];
    }
    if (lst.length < count && !this.state.tmp.sort_key_flag) {
        if (this.etal_use_last) {
            if (type === "persons") {
                this.etal_spec[v].persons[j] = 2
            } else {
                this.etal_spec[v][type] = 2;
            }
        } else {
            if (type === "persons") {
                this.etal_spec[v].persons[j] = 1;
            } else {
                this.etal_spec[v][type] = 1;
            }
        }
    } else {
        if (type === "persons") {
            this.etal_spec[v].persons[j] = 0;
        } else {
            this.etal_spec[v][type] = 0;
        }
    }
};
