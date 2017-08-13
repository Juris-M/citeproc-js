
CSL.NameOutput.prototype.joinPersons = function (blobs, pos, j, tokenname) {
    var ret;
    if (!tokenname) {
        tokenname = "name";
    }
    if ("undefined" === typeof j) {
        if (this.etal_spec[pos] && this.etal_spec[pos].freeters === 1) {
           ret = this._joinEtAl(blobs, tokenname);
        } else if (this.etal_spec[pos] && this.etal_spec[pos].freeters === 2) {
            ret = this._joinEllipsis(blobs, tokenname);
        } else if (!this.state.tmp.sort_key_flag) {
            ret = this._joinAnd(blobs, tokenname);
        } else {
            ret = this._join(blobs, " ");
        }
    } else {
        if (this.etal_spec[pos].persons[j] === 1) {
            ret = this._joinEtAl(blobs, tokenname);
        } else if (this.etal_spec[pos].persons[j] === 2) {
            ret = this._joinEllipsis(blobs, tokenname);
        } else if (!this.state.tmp.sort_key_flag) {
            ret = this._joinAnd(blobs, tokenname);
        } else {
            ret = this._join(blobs, " ");
        }
    }
    return ret;
};


CSL.NameOutput.prototype.joinInstitutionSets = function (blobs, pos) {
    var ret;
    if (this.etal_spec[pos].institutions === 1) {
        ret = this._joinEtAl(blobs, "institution");
    } else if (this.etal_spec[pos].institutions === 2) {
        ret = this._joinEllipsis(blobs, "institution");
    } else {
        ret = this._joinAnd(blobs, "institution");
    }
    return ret;
};


CSL.NameOutput.prototype.joinPersonsAndInstitutions = function (blobs) {
    //
    return this._join(blobs, this.state.tmp.name_delimiter);
};

// LEGACY
// This should go away eventually
CSL.NameOutput.prototype.joinFreetersAndInstitutionSets = function (blobs) {
    // Nothing, one or two, never more
    var ret = this._join(blobs, "[never here]", this["with"].single, this["with"].multiple);
    //var ret = this._join(blobs, "");
    return ret;
};

CSL.NameOutput.prototype._joinEtAl = function (blobs, tokenname) {
    //
    var blob = this._join(blobs, this.state.tmp.name_delimiter);
    
    // notSerious
    this.state.output.openLevel(this._getToken(tokenname));
    // Delimiter is applied from separately saved source in this case,
    // for discriminate application of single and multiple joins.
    this.state.output.current.value().strings.delimiter = "";
    this.state.output.append(blob, "literal", true);
    if (blobs.length > 1) {
        this.state.output.append(this["et-al"].multiple, "literal", true);
    } else if (blobs.length === 1) {
        this.state.output.append(this["et-al"].single, "literal", true);
    }
    this.state.output.closeLevel();
    return this.state.output.pop();
};


CSL.NameOutput.prototype._joinEllipsis = function (blobs, tokenname) {
    return this._join(blobs, this.state.tmp.name_delimiter, this.name.ellipsis.single, this.name.ellipsis.multiple, tokenname);
};


CSL.NameOutput.prototype._joinAnd = function (blobs, tokenname) {
    return this._join(blobs, this.state.inheritOpt(this[tokenname], "delimiter", (tokenname + "-delimiter"), ", "), this[tokenname].and.single, this[tokenname].and.multiple, tokenname);
};


CSL.NameOutput.prototype._join = function (blobs, delimiter, single, multiple) {
    var i, ilen;
    if (!blobs) {
        return false;
    }
    // Eliminate false and empty blobs
    for (i = blobs.length - 1; i > -1; i += -1) {
        if (!blobs[i] || blobs[i].length === 0 || !blobs[i].blobs.length) {
            blobs = blobs.slice(0, i).concat(blobs.slice(i + 1));
        }
    }
    // XXXX This needs some attention before moving further.
    // Code is not sufficiently transparent.
    if (!blobs.length) {
        return false;
    } else if (single && blobs.length === 2) {
        // Clone to avoid corruption of style by affix migration during output
        if (single) {
            single = new CSL.Blob(single.blobs,single);
        }
        blobs = [blobs[0], single, blobs[1]];
    } else {
        var delimiter_offset;
        if (multiple) {
            delimiter_offset = 2;
        } else {
            delimiter_offset = 1;
        }
        // It kind of makes sense down to here.
        for (i = 0, ilen = blobs.length - delimiter_offset; i < ilen; i += 1) {
            blobs[i].strings.suffix += delimiter;
        }
        if (blobs.length > 1) {
            var blob = blobs.pop();
            if (multiple) {
                // Clone to avoid corruption of style by affix migration during output
                multiple = new CSL.Blob(multiple.blobs,multiple);
                blobs.push(multiple);
            } else {
                // Clone to avoid corruption of style by affix migration during output
                if (single) {
                    single = new CSL.Blob(single.blobs,single);
                }
                blobs.push(single);
            }
            blobs.push(blob);
        }
    }

    //this.state.output.openLevel(this._getToken(tokenname));
    this.state.output.openLevel();

    //this.state.output.openLevel(this._getToken("empty"));
    // Delimiter is applied from separately saved source in this case,
    // for discriminate application of single and multiple joins.
    if (single && multiple) {
        this.state.output.current.value().strings.delimiter = "";
    }
    for (i = 0, ilen = blobs.length; i < ilen; i += 1) {
        this.state.output.append(blobs[i], false, true);
    }
    this.state.output.closeLevel();
    return this.state.output.pop();
};


CSL.NameOutput.prototype._getToken = function (tokenname) {
    var token = this[tokenname];
    if (tokenname === "institution") {
        var newtoken = new CSL.Token();
        // Which, hmm, is the same thing as "empty"
        // Oh, well.
        //newtoken.strings.prefix = token.prefix;
        //newtoken.strings.suffix = token.suffix;
        return newtoken;
    }
    return token;
};
