CSL.Engine.prototype.setOutputFormat = function (mode) {
    this.opt.mode = mode;
    this.fun.decorate = CSL.Mode(mode);
    if (!this.output[mode]) {
        this.output[mode] = {};
        this.output[mode].tmp = {};
    }
};

CSL.Engine.prototype.getSortFunc = function () {
    return function (a,b) {
        a = a.split("-");
        b = b.split("-");
        if (a.length < b.length) {
            return 1
        } else if (a.length > b.length) {
            return -1
        } else {
            a = a.slice(-1)[0];
            b = b.slice(-1)[0];
            if (a.length < b.length) {
                return 1;
            } else if (a.length > b.length) {
                return -1;
            } else {
                return 0;
            }
        }
    };
};

CSL.Engine.prototype.setLangTagsForCslSort = function (tags) {
    var i, ilen;
    if (tags) {
        this.opt['locale-sort'] = [];
        for (i = 0, ilen = tags.length; i < ilen; i += 1) {
            this.opt['locale-sort'].push(tags[i]);
        }
    }
    this.opt['locale-sort'].sort(this.getSortFunc());
};
    
CSL.Engine.prototype.setLangTagsForCslTransliteration = function (tags) {
    var i, ilen;
    this.opt['locale-translit'] = [];
    if (tags) {
        for (i = 0, ilen = tags.length; i < ilen; i += 1) {
            this.opt['locale-translit'].push(tags[i]);
        }
    }
    this.opt['locale-translit'].sort(this.getSortFunc());
};
    
CSL.Engine.prototype.setLangTagsForCslTranslation = function (tags) {
    var i, ilen;
    this.opt['locale-translat'] = [];
    if (tags) {
        for (i = 0, ilen = tags.length; i < ilen; i += 1) {
            this.opt['locale-translat'].push(tags[i]);
        }
    }
    this.opt['locale-translat'].sort(this.getSortFunc());
};

CSL.Engine.prototype.setLangPrefsForCites = function (obj, conv) {
    var opt = this.opt['cite-lang-prefs'];
    if (!conv) {
        conv = function (key) {
            return key.toLowerCase();
        };
    }
    var segments = ['Persons', 'Institutions', 'Titles', 'Journals', 'Publishers', 'Places'];
    // Set values in place
    for (var i = 0, ilen = segments.length; i < ilen; i += 1) {
        var clientSegment = conv(segments[i]);
        var citeprocSegment = segments[i].toLowerCase();
        if (!obj[clientSegment]) {
            continue;
        }
        //
        // Normalize the sequence of secondary and tertiary
        // in the provided obj segment list.
        //
        var supplements = [];
        while (obj[clientSegment].length > 1) {
            supplements.push(obj[clientSegment].pop());
        }
        var sortval = {orig:1,translit:2,translat:3};
        if (supplements.length === 2 && sortval[supplements[0]] < sortval[supplements[1]]) {
            supplements.reverse();
        }
        while (supplements.length) {
            obj[clientSegment].push(supplements.pop());
        }
        //
        // normalization done.
        //
        var lst = opt[citeprocSegment];
        while (lst.length) {
            lst.pop();
        }
        for (var j = 0, jlen = obj[clientSegment].length; j < jlen; j += 1) {
            lst.push(obj[clientSegment][j]);
        }
    }
};

CSL.Engine.prototype.setLangPrefsForCiteAffixes = function (affixList) {
    if (affixList && affixList.length === 48) {
        var affixes = this.opt.citeAffixes;
        var count = 0;
        var settings = ["persons", "institutions", "titles", "journals", "publishers", "places"];
        var forms = ["translit", "orig", "translit", "translat"];
        var value;
        for (var i = 0, ilen = settings.length; i < ilen; i += 1) {
            for (var j = 0, jlen = forms.length; j < jlen; j += 1) {
                value = "";
                if ((count % 8) === 4) {
                    if (!affixes[settings[i]]["locale-"+forms[j]].prefix
                        && !affixes[settings[i]]["locale-"+forms[j]].suffix) {

                        value = affixList[count] ? affixList[count] : "";
                        affixes[settings[i]]["locale-" + forms[j]].prefix = value;
                        value = affixList[count] ? affixList[count + 1] : "";
                        affixes[settings[i]]["locale-" + forms[j]].suffix = value;
                    }
                } else {
                    value = affixList[count] ? affixList[count] : "";
                    affixes[settings[i]]["locale-" + forms[j]].prefix = value;
                    value = affixList[count] ? affixList[count + 1] : "";
                    affixes[settings[i]]["locale-" + forms[j]].suffix = value;
                }
                count += 2;
            }
        }
        this.opt.citeAffixes = affixes;
    }
};

CSL.Engine.prototype.setAutoVietnameseNamesOption = function (arg) {
    if (arg) {
        this.opt["auto-vietnamese-names"] = true;
    } else {
        this.opt["auto-vietnamese-names"] = false;
    }
};

CSL.Engine.prototype.setAbbreviations = function (arg) {
    if (this.sys.setAbbreviations) {
        this.sys.setAbbreviations(arg);
    }
};

CSL.Engine.prototype.setSuppressTrailingPunctuation = function (arg) {
    this.citation.opt.suppressTrailingPunctuation = !!arg;
};
