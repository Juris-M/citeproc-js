
CSL.NameOutput.prototype.divideAndTransliterateNames = function () {
    var i, ilen, j, jlen;
    var Item = this.Item;
    var variables = this.variables;
    this.varnames = variables.slice();
    this.freeters = {};
    this.persons = {};
    this.institutions = {};
    for (i = 0, ilen = variables.length; i < ilen; i += 1) {
        var v = variables[i];
        this.variable_offset[v] = this.nameset_offset;
        var values = this._normalizeVariableValue(Item, v);
        if (this.name.strings["suppress-min"] && values.length >= this.name.strings["suppress-min"]) {
            values = [];
        }
        if (this.name.strings["suppress-max"] && values.length <= this.name.strings["suppress-max"]) {
            values = [];
        }
        this._getFreeters(v, values);
        this._getPersonsAndInstitutions(v, values);
        if (this.state.opt.development_extensions.spoof_institutional_affiliations) {
            if (this.name.strings["suppress-min"] === 0) {
                this.freeters[v] = [];
                for (j = 0, jlen = this.persons[v].length; j < jlen; j += 1) {
                    this.persons[v][j] = [];
                }
            } else if (this.institution.strings["suppress-min"] === 0) {
                this.institutions[v] = [];
                this.freeters[v] = this.freeters[v].concat(this.persons[v]);
                for (j = 0, jlen = this.persons[v].length; j < jlen; j += 1) {
                    for (var k = 0, klen = this.persons[v][j].length; k < klen; k += 1) {
                        this.freeters[v].push(this.persons[v][j][k]);
                    }
                }
                this.persons[v] = [];
            }
        }
    }
};

CSL.NameOutput.prototype._normalizeVariableValue = function (Item, variable) {
    var names;
    if ("string" === typeof Item[variable] || "number" === typeof Item[variable]) {
        CSL.debug("name variable \"" + variable + "\" is string or number, not array. Attempting to fix.");
        names = [{literal: Item[variable] + ""}];
    } else if (!Item[variable]) {
        names = [];
    } else if ("number" !== typeof Item[variable].length) {
        CSL.debug("name variable \"" + variable + "\" is object, not array. Attempting to fix.");
        Item[variable] = [Item[variable]];
        names = Item[variable].slice();
    } else {
        names = Item[variable].slice();
    }
    return names;
};

CSL.NameOutput.prototype._getFreeters = function (v, values) {
    this.freeters[v] = [];
    var i, value;
    if (this.state.opt.development_extensions.spoof_institutional_affiliations) {
        for (i=values.length-1;i>-1;i--) {
            if (this.isPerson(values[i])) {
                value = this._checkNickname(values.pop());
                if (value) {
                    this.freeters[v].push(value);
                }
            } else {
                break;
            }
        }
    } else {
        for (i=values.length-1;i>-1;i--) {
            value = values.pop();
            if (this.isPerson(value)) {
                value = this._checkNickname(value);
            }
            this.freeters[v].push(value);
        }
    }
    this.freeters[v].reverse();
    if (this.freeters[v].length) {
        this.nameset_offset += 1;
    }
};

CSL.NameOutput.prototype._getPersonsAndInstitutions = function (v, values) {
    this.persons[v] = [];
    this.institutions[v] = [];
    if (!this.state.opt.development_extensions.spoof_institutional_affiliations) return;
    var persons = [];
    var has_affiliates = false;
    var first = true;
    for (var i = values.length - 1; i > -1; i += -1) {
        if (this.isPerson(values[i])) {
            var value = this._checkNickname(values[i]);
            if (value) {
                persons.push(value);
            }
        } else {
            has_affiliates = true;
            this.institutions[v].push(values[i]);
            if (!first) {
                persons.reverse();
                this.persons[v].push(persons);
                persons = [];
            }
            first = false;
        }
    }
    if (has_affiliates) {
        persons.reverse();
        this.persons[v].push(persons);
        this.persons[v].reverse();
        this.institutions[v].reverse();
    }
};

CSL.NameOutput.prototype._clearValues = function (values) {
    for (var i = values.length - 1; i > -1; i += -1) {
        values.pop();
    }
};

CSL.NameOutput.prototype._checkNickname = function (name) {
    if (["interview", "personal_communication"].indexOf(this.Item.type) > -1) {
        var author = "";
        author = CSL.Util.Names.getRawName(name);
        if (author && this.state.sys.getAbbreviation && !(this.item && this.item["suppress-author"])) {
            this.state.transform.loadAbbreviation("default", "nickname", author);
            // XXX Why does this have to happen here?
            var myLocalName = this.state.transform.abbrevs["default"].nickname[author];
            if (myLocalName) {
                if (myLocalName === "!here>>>") {
                    name = false;
                } else {
                    name = {family:myLocalName,given:''};
                }
            }
        }
    }
    return name;
};
