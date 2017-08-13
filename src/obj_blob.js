
CSL.Blob = function (str, token, levelname) {
    var len, pos, key;
    this.levelname = levelname;
    //print(levelname);
    if (token) {
        this.strings = {"prefix":"","suffix":""};
        for (key in token.strings) {
            if (token.strings.hasOwnProperty(key)) {
                this.strings[key] = token.strings[key];
            }
        }
        this.decorations = [];
        if (token.decorations === undefined) {
            len = 0;
        } else {
            len = token.decorations.length;
        }
        for (pos = 0; pos < len; pos += 1) {
            this.decorations.push(token.decorations[pos].slice());
        }
    } else {
        this.strings = {};
        this.strings.prefix = "";
        this.strings.suffix = "";
        this.strings.delimiter = "";
        this.decorations = [];
    }
    if ("string" === typeof str) {
        this.blobs = str;
    } else if (str) {
        this.blobs = [str];
    } else {
        this.blobs = [];
    }
    this.alldecor = [this.decorations];
};


CSL.Blob.prototype.push = function (blob) {
    if ("string" === typeof this.blobs) {
        throw "Attempt to push blob onto string object";
    } else if (false !== blob) {
        blob.alldecor = blob.alldecor.concat(this.alldecor);
        this.blobs.push(blob);
    }
};
