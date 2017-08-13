
CSL.PublisherOutput = function (state, group_tok) {
    this.state = state;
    this.group_tok = group_tok;
    this.varlist = [];
};

CSL.PublisherOutput.prototype.render = function () {
    this.clearVars();
    this.composeAndBlob();
    this.composeElements();
    this.composePublishers();
    this.joinPublishers();
};


// XXX Figure out how to adapt this to the House of Lords / House of Commons
// joint committee case

// name_delimiter
// delimiter_precedes_last
// and

CSL.PublisherOutput.prototype.composeAndBlob = function () {
    this.and_blob = {};
    var and_term = false;
    if (this.group_tok.strings.and === "text") {
        and_term = this.state.getTerm("and");
    } else if (this.group_tok.strings.and === "symbol") {
        and_term = "&";
    }
    var tok = new CSL.Token();
    tok.strings.suffix = " ";
    tok.strings.prefix = " ";
    this.state.output.append(and_term, tok, true);
    var no_delim = this.state.output.pop();

    tok.strings.prefix = this.group_tok.strings["subgroup-delimiter"];
    this.state.output.append(and_term, tok, true);
    var with_delim = this.state.output.pop();
    
    this.and_blob.single = false;
    this.and_blob.multiple = false;
    if (and_term) {
        if (this.group_tok.strings["subgroup-delimiter-precedes-last"] === "always") {
            this.and_blob.single = with_delim;
        } else if (this.group_tok.strings["subgroup-delimiter-precedes-last"] === "never") {
            this.and_blob.single = no_delim;
            this.and_blob.multiple = no_delim;
        } else {
            this.and_blob.single = no_delim;
            this.and_blob.multiple = with_delim;
        }
    }
};


CSL.PublisherOutput.prototype.composeElements = function () {
    for (var i = 0, ilen = 2; i < ilen; i += 1) {
        var varname = ["publisher", "publisher-place"][i];
        for (var j = 0, jlen = this["publisher-list"].length; j < jlen; j += 1) {
            var str = this[varname + "-list"][j];
            var tok = this[varname + "-token"];
            // notSerious
            this.state.output.append(str, tok, true);
            this[varname + "-list"][j] = this.state.output.pop();
        }
    }
};


CSL.PublisherOutput.prototype.composePublishers = function () {
    var blobs;
    for (var i = 0, ilen = this["publisher-list"].length; i < ilen; i += 1) {
        blobs = [this[this.varlist[0] + "-list"][i], this[this.varlist[1] + "-list"][i]];
        this["publisher-list"][i] = this._join(blobs, this.group_tok.strings.delimiter);
    }
};


CSL.PublisherOutput.prototype.joinPublishers = function () {
    var blobs = this["publisher-list"];
    var publishers = this._join(blobs, this.group_tok.strings["subgroup-delimiter"], this.and_blob.single, this.and_blob.multiple, this.group_tok);
    this.state.output.append(publishers, "literal");
};


// blobs, delimiter, single, multiple, tokenname
// Tokenname is a key at top level of this object.
CSL.PublisherOutput.prototype._join = CSL.NameOutput.prototype._join;
CSL.PublisherOutput.prototype._getToken = CSL.NameOutput.prototype._getToken;


CSL.PublisherOutput.prototype.clearVars = function () {
    this.state.tmp["publisher-list"] = false;
    this.state.tmp["publisher-place-list"] = false;
    this.state.tmp["publisher-group-token"] = false;
    this.state.tmp["publisher-token"] = false;
    this.state.tmp["publisher-place-token"] = false;
};
