
/**
 * An output instance object representing a number or a range
 *
 * with attributes next and start, and
 * methods isRange(), renderStart(), renderEnd() and renderRange().
 * At render time, the output queue will perform optional
 * collapsing of these objects in the queue, according to
 * configurable options, and apply any decorations registered
 * in the object to the output elements.
 * @namespace Range object and friends.
 */

CSL.NumericBlob = function (particle, num, mother_token, id) {
    // item id is used to assure that prefix delimiter is invoked only
    // when joining blobs across items
    this.id = id;
    this.alldecor = [];
    this.num = num;
    this.particle = particle;
    this.blobs = num.toString();
    this.status = CSL.START;
    this.strings = {};
    if (mother_token) {
        this.gender = mother_token.gender;
        this.decorations = mother_token.decorations;
        this.strings.prefix = mother_token.strings.prefix;
        this.strings.suffix = mother_token.strings.suffix;
        this.strings["text-case"] = mother_token.strings["text-case"];
        this.successor_prefix = mother_token.successor_prefix;
        this.range_prefix = mother_token.range_prefix;
        this.splice_prefix = mother_token.splice_prefix;
        this.formatter = mother_token.formatter;
        if (!this.formatter) {
            this.formatter =  new CSL.Output.DefaultFormatter();
        }
        if (this.formatter) {
            this.type = this.formatter.format(1);
        }
    } else {
        this.decorations = [];
        this.strings.prefix = "";
        this.strings.suffix = "";
        this.successor_prefix = "";
        this.range_prefix = "";
        this.splice_prefix = "";
        this.formatter = new CSL.Output.DefaultFormatter();
    }
};


CSL.NumericBlob.prototype.setFormatter = function (formatter) {
    this.formatter = formatter;
    this.type = this.formatter.format(1);
};


CSL.Output.DefaultFormatter = function () {};

CSL.Output.DefaultFormatter.prototype.format = function (num) {
    return num.toString();
};

CSL.NumericBlob.prototype.checkNext = function (next,start) {
    if (start) {
        this.status = CSL.START;
        if ("object" === typeof next) {
            if (next.num === (this.num + 1)) {
                next.status = CSL.SUCCESSOR;
            } else {
                next.status = CSL.SEEN;
            }
        }
    } else if (! next || !next.num || this.type !== next.type || next.num !== (this.num + 1)) {
        if (this.status === CSL.SUCCESSOR_OF_SUCCESSOR) {
            this.status = CSL.END;
        }
        if ("object" === typeof next) { 
           next.status = CSL.SEEN;
        }
    } else { // next number is in the sequence
        if (this.status === CSL.START || this.status === CSL.SEEN) {
            next.status = CSL.SUCCESSOR;
        } else if (this.status === CSL.SUCCESSOR || this.status === CSL.SUCCESSOR_OF_SUCCESSOR) {
            if (this.range_prefix) {
                next.status = CSL.SUCCESSOR_OF_SUCCESSOR;
                this.status = CSL.SUPPRESS;
            } else {
                next.status = CSL.SUCCESSOR;
            }
        }
        // wakes up the correct delimiter.
        //if (this.status === CSL.SEEN) {
        //    this.status = CSL.SUCCESSOR;
        //}
    }
};


CSL.NumericBlob.prototype.checkLast = function (last) {
    // Used to adjust final non-range join
    if (this.status === CSL.SEEN 
    || (last.num !== (this.num - 1) && this.status === CSL.SUCCESSOR)) {
        this.status = CSL.SUCCESSOR;
        return true;
    }
    return false;
};
