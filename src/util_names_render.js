/*global CSL: true */

CSL.NameOutput.prototype.renderAllNames = function () {
    // Note that et-al/ellipsis parameters are set on the basis
    // of rendering order through the whole cite.
    var pos;
    for (var i = 0, ilen = this.variables.length; i < ilen; i += 1) {
        var v = this.variables[i];

        if (this.freeters[v].length || this.institutions[v].length) {
            if (!this.state.tmp.group_context.tip.condition) {
                this.state.tmp.just_did_number = false;
            }
        }
        
        pos = this.nameset_base + i;
        if (this.freeters[v].length) {
            this.freeters[v] = this._renderNames(v, this.freeters[v], pos);
        }
        for (var j = 0, jlen = this.institutions[v].length; j < jlen; j += 1) {
            this.persons[v][j] = this._renderNames(v, this.persons[v][j], pos, j);
        }
    }
    this.renderInstitutionNames();
};

CSL.NameOutput.prototype.renderInstitutionNames = function () {
    // Institutions are split to string list as
    // this.institutions[v]["long"] and this.institutions[v]["short"]
    for (var i = 0, ilen = this.variables.length; i < ilen; i += 1) {
        var v = this.variables[i];
        for (var j = 0, jlen = this.institutions[v].length; j < jlen; j += 1) {
            var institution;

            var name = this.institutions[v][j];

            // XXX Start here for institutions
            // Figure out the three segments: primary, secondary, tertiary
            var j, jlen, localesets;
            if (this.state.tmp.extension) {
                localesets = ["sort"];
            } else if (name.isInstitution || name.literal) {
                // Will never hit this in this function, but preserving
                // in case we factor this out.
                localesets = this.state.opt['cite-lang-prefs'].institutions;
            } else {
                localesets = this.state.opt['cite-lang-prefs'].persons;
            }

            var slot = {primary:'locale-orig',secondary:false,tertiary:false};
	        if (localesets) {
		        var slotnames = ["primary", "secondary", "tertiary"];
		        for (var k = 0, klen = slotnames.length; k < klen; k += 1) {
			        if (localesets.length - 1 <  k) {
				        break;
			        }
                    if (localesets[k]) {
			            slot[slotnames[k]] = 'locale-' + localesets[k];
                    }
		        }
	        } else {
		        slot.primary = 'locale-translat';
	        }
	        if (this.state.tmp.area !== "bibliography"
		        && !(this.state.tmp.area === "citation"
			         && this.state.opt.xclass === "note"
			         && this.item && !this.item.position)) {
                
		        slot.secondary = false;
		        slot.tertiary = false;
	        }
            // Get normalized name object for a start.
            // true invokes fallback
            this.setRenderedName(name);

            // XXXX FROM HERE (instututions)
            var institution = this._renderInstitutionName(v, name, slot, j);

            //this.institutions[v][j] = this._join(institution, "");
            this.institutions[v][j] = institution;
        }
    }
};

CSL.NameOutput.prototype._renderInstitutionName = function (v, name, slot, j) {
    var secondary, tertiary, long_style, short_style, institution, institution_short, institution_long;
    var res = this.getName(name, slot.primary, true);
    var primary = res.name;
    var usedOrig = res.usedOrig;
    if (primary) {
        //print("primary, v, j = "+primary+", "+v+", "+j);
        primary = this.fixupInstitution(primary, v, j);
    }
	secondary = false;
	if (slot.secondary) {
        res = this.getName(name, slot.secondary, false, usedOrig);
        var secondary = res.name;
        usedOrig = res.usedOrig;
        if (secondary) {
			secondary = this.fixupInstitution(secondary, v, j);
        }
	}
    //Zotero.debug("XXX [2] secondary: "+secondary["long"].literal+", slot.secondary: "+slot.secondary);
	tertiary = false;
	if (slot.tertiary) {
        res = this.getName(name, slot.tertiary, false, usedOrig);
        tertiary = res.name;
        if (tertiary) {
			tertiary = this.fixupInstitution(tertiary, v, j);
        }
	}
    var n = {
        l: {
            pri: false,
            sec: false,
            ter: false
        },
        s: {
            pri: false,
            sec: false,
            ter: false
        }
    };
    if (primary) {
        n.l.pri = primary["long"];
        n.s.pri = primary["short"].length ? primary["short"] : primary["long"];
    }
    if (secondary) {
        n.l.sec = secondary["long"];
        n.s.sec = secondary["short"].length ? secondary["short"] : secondary["long"];
    }
    if (tertiary) {
        n.l.ter = tertiary["long"];
        n.s.ter = tertiary["short"].length ? tertiary["short"] : tertiary["long"];
    }
    switch (this.institution.strings["institution-parts"]) {
    case "short":
        // No multilingual for pure short form institution names.
        if (primary["short"].length) {
            short_style = this._getShortStyle();
            institution = [this._composeOneInstitutionPart([n.s.pri, n.s.sec, n.s.ter], slot, short_style, v)];
        } else {
            // Fail over to long.
            long_style = this._getLongStyle(primary, v, j);
            institution = [this._composeOneInstitutionPart([n.l.pri, n.l.sec, n.l.ter], slot, long_style, v)];
        }
        break;
    case "short-long":
        long_style = this._getLongStyle(primary, v, j);
        short_style = this._getShortStyle();
        institution_short = this._renderOneInstitutionPart(primary["short"], short_style);
        // true is to include multilingual supplement
        institution_long = this._composeOneInstitutionPart([n.l.pri, n.l.sec, n.l.ter], slot, long_style, v);
        institution = [institution_short, institution_long];
        break;
    case "long-short":
        long_style = this._getLongStyle(primary, v, j);
        short_style = this._getShortStyle();
        institution_short = this._renderOneInstitutionPart(primary["short"], short_style);
        // true is to include multilingual supplement
        institution_long = this._composeOneInstitutionPart([n.l.pri, n.l.sec, n.l.ter], slot, long_style, v);
        institution = [institution_long, institution_short];
        break;
    default:
        long_style = this._getLongStyle(primary, v, j);
        // true is to include multilingual supplement
        institution = [this._composeOneInstitutionPart([n.l.pri, n.l.sec, n.l.ter], slot, long_style, v)];
        break;
    }
    var blob = this._join(institution, " ");
    if (blob) {
        blob.isInstitution = true;
    }
    this.state.tmp.name_node.children.push(blob);
    return blob;
};

CSL.NameOutput.prototype._composeOneInstitutionPart = function (names, slot, style) {
    var primary = false, secondary = false, tertiary = false, primary_tok, secondary_tok, tertiary_tok;
    if (names[0]) {
        primary_tok = CSL.Util.cloneToken(style);
        if (this.state.opt.citeAffixes[slot.primary]){
            if ("<i>" === this.state.opt.citeAffixes.institutions[slot.primary].prefix) {
                var hasItalic = false;
                for (var i = 0, ilen = primary_tok.decorations.length; i < ilen; i += 1) {
                    if (style.decorations[i][0] === "@font-style"
                        && primary_tok.decorations[i][1] === "italic") {
                        hasItalic = true;
                    }
                }
                if (!hasItalic) {
                    primary_tok.decorations.push(["@font-style", "italic"]);
                }
            }
        }
        primary = this._renderOneInstitutionPart(names[0], primary_tok);
     }
    if (names[1]) {
        secondary = this._renderOneInstitutionPart(names[1], style);
    }
    if (names[2]) {
        tertiary = this._renderOneInstitutionPart(names[2], style);
    }
    // Compose
    var institutionblob;
    if (secondary || tertiary) {
        this.state.output.openLevel("empty");

        this.state.output.append(primary);

        secondary_tok = CSL.Util.cloneToken(style);
        if (slot.secondary) {
            secondary_tok.strings.prefix = this.state.opt.citeAffixes.institutions[slot.secondary].prefix;
            secondary_tok.strings.suffix = this.state.opt.citeAffixes.institutions[slot.secondary].suffix;
            // Add a space if empty
            if (!secondary_tok.strings.prefix) {
                secondary_tok.strings.prefix = " ";
            }
        }
        var secondary_outer = new CSL.Token();
        secondary_outer.decorations.push(["@font-style", "normal"]);
        secondary_outer.decorations.push(["@font-weight", "normal"]);
        this.state.output.openLevel(secondary_outer);
        this.state.output.append(secondary, secondary_tok);
        this.state.output.closeLevel();

        tertiary_tok = CSL.Util.cloneToken(style);
        if (slot.tertiary) {
            tertiary_tok.strings.prefix = this.state.opt.citeAffixes.institutions[slot.tertiary].prefix;
            tertiary_tok.strings.suffix = this.state.opt.citeAffixes.institutions[slot.tertiary].suffix;
            // Add a space if empty
            if (!tertiary_tok.strings.prefix) {
                tertiary_tok.strings.prefix = " ";
            }
        }
        var tertiary_outer = new CSL.Token();
        tertiary_outer.decorations.push(["@font-style", "normal"]);
        tertiary_outer.decorations.push(["@font-weight", "normal"]);
        this.state.output.openLevel(tertiary_outer);
        this.state.output.append(tertiary, tertiary_tok);
        this.state.output.closeLevel();

        this.state.output.closeLevel();

        institutionblob = this.state.output.pop();
    } else {
        institutionblob = primary;
    }
    return institutionblob;
};

CSL.NameOutput.prototype._renderOneInstitutionPart = function (blobs, style) {
    for (var i = 0, ilen = blobs.length; i < ilen; i += 1) {
        if (blobs[i]) {
            var str = blobs[i];
            // XXXXX Cut-and-paste code in multiple locations. This code block should be
            // collected in a function.
            // Tag: strip-periods-block
            if (this.state.tmp.strip_periods) {
                str = str.replace(/\./g, "");
            } else {
                for (var j = 0, jlen = style.decorations.length; j < jlen; j += 1) {
                    if ("@strip-periods" === style.decorations[j][0] && "true" === style.decorations[j][1]) {
                        str = str.replace(/\./g, "");
                        break;
                    }
                }
            }
            //this.state.output.append(blobs[i], style, true);
            this.state.tmp.group_context.tip.variable_success = true;
            this.state.tmp.can_substitute.replace(false, CSL.LITERAL);
            if (str === "!here>>>") {
                blobs[i] = false;
            } else {
                this.state.output.append(str, style, true);
                blobs[i] = this.state.output.pop();
            }
        }
    }
    if ("undefined" === typeof this.institution.strings["part-separator"]) {
        this.institution.strings["part-separator"] = this.state.tmp.name_delimiter;
    }
    return this._join(blobs, this.institution.strings["part-separator"]);
};

CSL.NameOutput.prototype._renderNames = function (v, values, pos, j) {
    //
    var ret = false;
    if (values.length) {
        var names = [];
        for (var i = 0, ilen = values.length; i < ilen; i += 1) {
            var name = values[i];
            
            // XXX We'll start here with attempts.
            // Figure out the three segments: primary, secondary, tertiary
            var ret, localesets;
            
            if (this.state.tmp.extension) {
                localesets = ["sort"];
            } else if (name.isInstitution || name.literal) {
                // Will never hit this in this function, but preserving
                // in case we factor this out.
                localesets = this.state.opt['cite-lang-prefs'].institutions;
            } else {
                localesets = this.state.opt['cite-lang-prefs'].persons;
            }
            var slot = {primary:'locale-orig',secondary:false,tertiary:false};
	        if (localesets) {
		        var slotnames = ["primary", "secondary", "tertiary"];
		        for (var k = 0, klen = slotnames.length; k < klen; k += 1) {
			        if (localesets.length - 1 <  k) {
				        break;
			        }
			        slot[slotnames[k]] = 'locale-' + localesets[k];
		        }
	        } else {
		        slot.primary = 'locale-translat';
	        }
	        if (this.state.tmp.sort_key_flag || (this.state.tmp.area !== "bibliography"
		        && !(this.state.tmp.area === "citation"
			         && this.state.opt.xclass === "note"
			         && this.item && !this.item.position))) {
                
		        slot.secondary = false;
		        slot.tertiary = false;
	        }

            // primary
            // true is for fallback
            this.setRenderedName(name);

            if (!name.literal && !name.isInstitution) {
                var nameBlob = this._renderPersonalName(v, name, slot, pos, i, j);
                var nameToken = CSL.Util.cloneToken(this.name);
                this.state.output.append(nameBlob, nameToken, true);
                names.push(this.state.output.pop());
            } else {
                names.push(this._renderInstitutionName(v, name, slot, j));
            }
        }
        //ret = this._join(names, "");
        ret = this.joinPersons(names, pos, j);
    }
    return ret;
};


CSL.NameOutput.prototype._renderPersonalName = function (v, name, slot, pos, i, j) {
    // XXXX FROM HERE (persons)

    var res = this.getName(name, slot.primary, true);
    var primary = this._renderOnePersonalName(res.name, pos, i, j);
	var secondary = false;
	if (slot.secondary) {
        res = this.getName(name, slot.secondary, false, res.usedOrig);
        if (res.name) {
			secondary = this._renderOnePersonalName(res.name, pos, i, j);
        }
	}
	var tertiary = false;
	if (slot.tertiary) {
        res = this.getName(name, slot.tertiary, false, res.usedOrig);
        if (res.name) {
			tertiary = this._renderOnePersonalName(res.name, pos, i, j);
        }
	}
    // Now compose them to a unit
    var personblob;
    if (secondary || tertiary) {

        this.state.output.openLevel("empty");

        this.state.output.append(primary);

        var secondary_tok = new CSL.Token();
        if (slot.secondary) {
            secondary_tok.strings.prefix = this.state.opt.citeAffixes.persons[slot.secondary].prefix;
            secondary_tok.strings.suffix = this.state.opt.citeAffixes.persons[slot.secondary].suffix;
            // Add a space if empty
            if (!secondary_tok.strings.prefix) {
                secondary_tok.strings.prefix = " ";
            }
        }
        this.state.output.append(secondary, secondary_tok);

        var tertiary_tok = new CSL.Token();
        if (slot.tertiary) {
            tertiary_tok.strings.prefix = this.state.opt.citeAffixes.persons[slot.tertiary].prefix;
            tertiary_tok.strings.suffix = this.state.opt.citeAffixes.persons[slot.tertiary].suffix;
            // Add a space if empty
            if (!tertiary_tok.strings.prefix) {
                tertiary_tok.strings.prefix = " ";
            }
        }
        this.state.output.append(tertiary, tertiary_tok);

        this.state.output.closeLevel();

        personblob = this.state.output.pop();
    } else {
        personblob = primary;
    }
    return personblob;
};

/** Japanese */
CSL.NameOutput.prototype._isJapanese = function(name) 
{
    /**
    0: Not japanese
    1: Japanese
    */
    var ret = 0;
    var top_locale;
    if(name.multi && name.multi.main) {
        top_locale = name.multi.main.slice(0, 2);
    } else if (this.Item.language) {
        top_locale = this.Item.language.slice(0, 2);
    }
    if(top_locale==="ja") {
        ret = 1;
    }
    return ret;
}

CSL.NameOutput.prototype._isKatakana = function (name) {
    // 0 =　katakana + kanji || hiragana => Normal Japanese
    // 1 = katakana or katakana + initial.
    var ret = 0;
    var fullname = name.family.replace(/\"/g, '');
    if(name.given)
    {
        fullname = name.family.replace(/\"/g, '')+name.given.replace(/\"/g, '');
    }
    
    if(fullname.match(CSL.KATAKANA_REGEXP)) {
        ret = 1;
    }
    else if(name.family.replace(/\"/g, '').match(CSL.KATAKANA_REGEXP) && name.given.match(CSL.STARTSWITH_KATAKANA_REGEXP))
    {
        /**
        Initial in given name
        */
        ret = 1;
    }
    return ret;
}

/***/

CSL.NameOutput.prototype._isRomanesque = function (name) {
    // 0 = entirely non-romanesque
    // 1 = mixed content
    // 2 = pure romanesque
    var ret = 2;
    if (!name.family.replace(/\"/g, '').match(CSL.ROMANESQUE_REGEXP)) {
        ret = 0;
    }
    if (!ret && name.given && name.given.match(CSL.STARTSWITH_ROMANESQUE_REGEXP)) {
        ret = 1;
    }
    var top_locale;
    
    if (ret == 2) {
        if (name.multi && name.multi.main) {
            top_locale = name.multi.main.slice(0, 2);
        } else if (this.Item.language) {
            top_locale = this.Item.language.slice(0, 2);
        }
        if (["ja", "zh"].indexOf(top_locale) > -1) {
            ret = 1;
        }
    }
    //print("name: "+name.given+", multi: "+name.multi+", ret: "+ret);
    return ret;
};

/**
It would be great if this function was renamed something like _renderCJK(language, name, non_dropping_particle, given, family, sort_sep) in the future. Japanese should work as long as family and given are provided.
*/
CSL.NameOutput.prototype._renderJapaneseName = function (japanese, katakana, family, given, i, j, sort_sep) {
    var blob;
    /**
    katakana-display
    "legacy-order": セイメイ 
    "normal-order": メイ、セイ and セイ・メイ (Family, Given and Given・Family)
    */
    
    /**
    Take care of "and", which will not be displayed for Japanese. It will be likely "symbol", used for English names
    Leave delimiter only
    This is a hacky way to override "name.and". Looking for a better idea.
    */
    this.name.and.single.strings.prefix="";
    this.name.and.single.strings.suffix="";
    this.name.and.single.blobs=this.name.strings.delimiter;
    
    this.name.and.multiple.blobs=this.name.strings.delimiter;
    this.name.and.multiple.strings.prefix="";
    this.name.and.multiple.strings.suffix="";
    
    if(katakana===1 && this.state.opt["katakana-display"]!=="legacy-order")
    {
        if (this.state.inheritOpt(this.name, "name-as-sort-order") === "all" || (this.state.inheritOpt(this.name, "name-as-sort-order") === "first" && i === 0 && (j === 0 || "undefined" === typeof j)))
        {
            blob = this._join([family, given], sort_sep);
        }
        else
        {
            blob = this._join([given, family], "・");
        }
    }
    
    /**
    1. Some styles in Japanese require space between Family and Given. We should allow affixing in Japanese too.
    2. This should be the default but if it leads to issues for existing Japanese styles, we could add a global option to activate it as well. e.g. kanji-display: ["legacy-order", "normal-order"]. It depends on how much we can "pollute" the global options :D 
    */
    else if(japanese===1)
    {
        /*
        Romanesque names will not lead here even if language-name is ja
        */
        
        if(this.family && this.family.strings) {
            family.strings.prefix = this.family.strings.prefix;
            family.strings.suffix = this.family.strings.suffix;
        }
        if(this.given && this.given.strings) {
            given.strings.prefix = this.given.strings.prefix;
            given.strings.suffix = this.given.strings.suffix;
        }
        blob = this._join([family, given], "");
    }
    return blob;
}

CSL.NameOutput.prototype._renderOnePersonalName = function (value, pos, i, j) {
    var name = value;
    var dropping_particle = this._droppingParticle(name, pos, j);
    var family = this._familyName(name);
    var non_dropping_particle = this._nonDroppingParticle(name);
    var givenInfo = this._givenName(name, pos, i);
    var given = givenInfo.blob;
    var suffix = this._nameSuffix(name);
    if (given === false) {
        dropping_particle = false;
        suffix = false;
    }
    var sort_sep = this.state.inheritOpt(this.name, "sort-separator");
    
    if (!sort_sep) {
        sort_sep = "";
    }
    var suffix_sep;
    if (name["comma-suffix"]) {
        suffix_sep = ", ";
    } else {
        suffix_sep = " ";
    }
    var romanesque = this._isRomanesque(name);
    var katakana = this._isKatakana(name);
    var japanese = this._isJapanese(name);
    
    function hasJoiningPunctuation(blob) {
        if (!blob) {
            return false;
        } else if ("string" === typeof blob.blobs) {
            if (["\u2019", "\'", "-", " "].indexOf(blob.blobs.slice(-1)) > -1) {
                return true;
            } else {
                return false;
            }
        } else {
            return hasJoiningPunctuation(blob.blobs[blob.blobs.length-1]);
        }
    }
    
    var has_hyphenated_non_dropping_particle = hasJoiningPunctuation(non_dropping_particle);

    var nbspace;
    if (["fr", "ru", "cs"].indexOf(this.state.opt["default-locale"][0].slice(0, 2)) > -1) {
        nbspace = "\u00a0";
    } else {
        nbspace = " ";
    }
    
    /**
    Keep roman rendering if name is Romanesque but language is Japanese
    The style may still depend on language to render other parts
    */
    if((romanesque===2 || romanesque===1) && japanese===1){
        japanese = 0;
        romanesque = 2;
    }
    
    var blob, merged, first, second;
        
    if (romanesque === 0) {
        if((katakana===1 && this.state.opt["katakana-display"]!=="legacy-order") || japanese===1){
            blob = this._renderJapaneseName(japanese, katakana, family, given, i, j, sort_sep);
        } else {
            // XXX handle affixes for given and family
            blob = this._join([non_dropping_particle, family, given], "");
        }
    }
    else if((katakana===1 && this.state.opt["katakana-display"]!=="legacy-order") || japanese===1){
        /*
        Sometimes katakana can be partially romanesque when mixed with initials.
        Initializing katakana is difficult programatically.
        */
        blob = this._renderJapaneseName(japanese, katakana, family, given, i, j, sort_sep);
    } else if (romanesque === 1 || name["static-ordering"]) { // entry likes sort order
        merged = this._join([non_dropping_particle, family], nbspace);
        blob = this._join([merged, given], " ");
    } else if (name["reverse-ordering"]) { // entry likes reverse order
        merged = this._join([non_dropping_particle, family], nbspace);
        blob = this._join([given, merged], " ");
    } else if (this.state.tmp.sort_key_flag) {
        // ok with no affixes here
        if (this.state.opt["demote-non-dropping-particle"] === "never") {
            merged = this._join([non_dropping_particle, family], nbspace);
            merged = this._join([merged, dropping_particle], " ");
            merged = this._join([merged, given], this.state.opt.sort_sep);
            blob = this._join([merged, suffix], " ");
        } else {
            second = this._join([given, dropping_particle, non_dropping_particle], " ");
            merged = this._join([family, second], this.state.opt.sort_sep);
            blob = this._join([merged, suffix], " ");
        }
    } else if (this.state.inheritOpt(this.name, "name-as-sort-order") === "all" || (this.state.inheritOpt(this.name, "name-as-sort-order") === "first" && i === 0 && (j === 0 || "undefined" === typeof j))) {
        //
        // Discretionary sort ordering and inversions
        //
        if (["Lord", "Lady"].indexOf(name.given) > -1) {
            sort_sep = ", ";
        }

        // XXX Needs a more robust solution than this
        // XXX See https://forums.zotero.org/discussion/30974/any-idea-why-an-a-author-comes-last-in-the-bibliography/#Item_30

        //if (["always", "display-and-sort"].indexOf(this.state.opt["demote-non-dropping-particle"]) > -1 && !has_hyphenated_non_dropping_particle) {
        if (["always", "display-and-sort"].indexOf(this.state.opt["demote-non-dropping-particle"]) > -1) {
            // Drop non-dropping particle
            //second = this._join([given, dropping_particle, non_dropping_particle], " ");
            second = this._join([given, dropping_particle], (name["comma-dropping-particle"] + " "));
        
            // This would be a problem with al-Ghazali. Avoided by has_hyphenated_non_dropping_particle check above.
            second = this._join([second, non_dropping_particle], " ");
            if (second && this.given) {
                second.strings.prefix = this.given.strings.prefix;
                second.strings.suffix = this.given.strings.suffix;
            }
            if (family && this.family) {
                family.strings.prefix = this.family.strings.prefix;
                family.strings.suffix = this.family.strings.suffix;
            }
            merged = this._join([family, second], sort_sep);
            blob = this._join([merged, suffix], sort_sep);
        } else {
            // Don't drop particle.
            // Don't do this
            //if (this.state.tmp.area === "bibliography" && !this.state.tmp.term_predecessor && non_dropping_particle) {
            //    if (!has_hyphenated_non_dropping_particle) {
            //        non_dropping_particle.blobs = CSL.Output.Formatters["capitalize-first"](this.state, non_dropping_particle.blobs)
            //    }
            //}
            if (has_hyphenated_non_dropping_particle) {
                first = this._join([non_dropping_particle, family], "");
            } else {
                first = this._join([non_dropping_particle, family], nbspace);
            }
            if (first && this.family) {
                first.strings.prefix = this.family.strings.prefix;
                first.strings.suffix = this.family.strings.suffix;
            }

            second = this._join([given, dropping_particle], (name["comma-dropping-particle"] + " "));
            //second = this._join([given, dropping_particle], " ");
            if (second && this.given) {
                second.strings.prefix = this.given.strings.prefix;
                second.strings.suffix = this.given.strings.suffix;
            }

            merged = this._join([first, second], sort_sep);
            blob = this._join([merged, suffix], sort_sep);
        }
        blob.isInverted = true;
    } else { // plain vanilla
        if (name["dropping-particle"] && name.family && !name["non-dropping-particle"]) {
            var dp = name["dropping-particle"];
            var apostrophes = ["'","\u02bc","\u2019","-"];
            if (apostrophes.indexOf(dp.slice(-1)) > -1 && dp.slice(0, -1) !== "de") {
                family = this._join([dropping_particle, family], "");
                dropping_particle = false;
            }
        }

        if (has_hyphenated_non_dropping_particle) {
            second = this._join([non_dropping_particle, family], "");
            second = this._join([dropping_particle, second], nbspace);
        } else {
            second = this._join([dropping_particle, non_dropping_particle, family], nbspace);
        }
        second = this._join([second, suffix], suffix_sep);
        if (second && this.family) {
            second.strings.prefix = this.family.strings.prefix;
            second.strings.suffix = this.family.strings.suffix;
        }
        if (given && this.given) {
            given.strings.prefix = this.given.strings.prefix;
            given.strings.suffix = this.given.strings.suffix;
        }
        if (second.strings.prefix) {
            name["comma-dropping-particle"] = "";
        }

        var space;
        if (this.state.inheritOpt(this.name, "initialize-with")
            && this.state.inheritOpt(this.name, "initialize-with").match(/[\u00a0\ufeff]/)
            && givenInfo.initializationLevel === 1) {
            
            space = nbspace;
        } else {
            space = " ";
        }
        blob = this._join([given, second], (name["comma-dropping-particle"] + space));
    }
    // XXX Just generally assume for the present that personal names render something
    this.state.tmp.group_context.tip.variable_success = true;
    this.state.tmp.can_substitute.replace(false, CSL.LITERAL);
    this.state.tmp.term_predecessor = true;
    // notSerious
    //this.state.output.append(blob, "literal", true);
    //var ret = this.state.output.pop();
    this.state.tmp.name_node.children.push(blob);
    return blob;
};

/*
        // Do not include given name, dropping particle or suffix in strict short form of name

        // initialize if appropriate
*/

// Input names should be touched by _normalizeNameInput()
// exactly once: this is not idempotent.
CSL.NameOutput.prototype._normalizeNameInput = function (value) {
    var name = {
        literal:value.literal,
        family:value.family,
        isInstitution:value.isInstitution,
        given:value.given,
        suffix:value.suffix,
        "comma-suffix":value["comma-suffix"],
        "non-dropping-particle":value["non-dropping-particle"],
        "dropping-particle":value["dropping-particle"],
        "static-ordering":value["static-ordering"],
        "static-particles":value["static-particles"],
        "reverse-ordering":value["reverse-ordering"],
        "full-form-always": value["full-form-always"],
        "parse-names":value["parse-names"],
        "comma-dropping-particle": "",
        block_initialize:value.block_initialize,
        multi:value.multi
    };
    this._parseName(name);
    return name;
};

// _transformNameset() replaced with enhanced transform.name().

CSL.NameOutput.prototype._stripPeriods = function (tokname, str) {
    var decor_tok = this[tokname + "_decor"];
    if (str) {
        if (this.state.tmp.strip_periods) {
            str = str.replace(/\./g, "");
        } else  if (decor_tok) {
            for (var i = 0, ilen = decor_tok.decorations.length; i < ilen; i += 1) {
                if ("@strip-periods" === decor_tok.decorations[i][0] && "true" === decor_tok.decorations[i][1]) {
                    str = str.replace(/\./g, "");
                    break;
                }
            }
        }
    }
    return str;
};

CSL.NameOutput.prototype._nonDroppingParticle = function (name) {
    var ndp = name["non-dropping-particle"];
    if (ndp && this.state.tmp.sort_key_flag) {
        ndp = ndp.replace(/[\'\u2019]/, "");
    }
    var str = this._stripPeriods("family", ndp);
    if (this.state.output.append(str, this.family_decor, true)) {
        return this.state.output.pop();
    }
    return false;
};

CSL.NameOutput.prototype._droppingParticle = function (name, pos, j) {
    var dp = name["dropping-particle"];
    if (dp && this.state.tmp.sort_key_flag) {
        dp = dp.replace(/[\'\u2019]/, "");
    }
    var str = this._stripPeriods("given", dp);
    if (name["dropping-particle"] && name["dropping-particle"].match(/^et.?al[^a-z]$/)) {
        if (this.state.inheritOpt(this.name, "et-al-use-last")) {
            if ("undefined" === typeof j) { 
                this.etal_spec[pos].freeters = 2;
            } else {
                this.etal_spec[pos].persons = 2;
            }
        } else {
            if ("undefined" === typeof j) { 
                this.etal_spec[pos].freeters = 1;
            } else {
                this.etal_spec[pos].persons = 1;
            }
        }
        name["comma-dropping-particle"] = "";
    } else if (this.state.output.append(str, this.given_decor, true)) {
        return this.state.output.pop();
    }
    return false;
};

CSL.NameOutput.prototype._familyName = function (name) {
    var str = this._stripPeriods("family", name.family);
    if (this.state.output.append(str, this.family_decor, true)) {
        return this.state.output.pop();
    }
    return false;
};

CSL.NameOutput.prototype._givenName = function (name, pos, i) {
    var ret;
    // citation
    //   use disambig as-is
    // biblography
    //   use disambig only if it boosts over the default
    //   SO WHAT IS THE DEFAULT?
    //   A: If "form" is short, it's 0.
    //      If "form" is long, initialize-with exists (and initialize is not false) it's 1
    //      If "form" is long, and initialize_with does not exist, it's 2.
    var formIsShort = this.state.inheritOpt(this.name, "form", "name-form", "long") !== "long";
    var initializeIsTurnedOn = this.state.inheritOpt(this.name, "initialize") !== false;
    var hasInitializeWith = "string" === typeof this.state.inheritOpt(this.name, "initialize-with") && !name.block_initialize;
    var defaultLevel;
    var useLevel;
    if (name["full-form-always"]) {
        useLevel = 2;
    } else {
        if (formIsShort) {
            defaultLevel = 0;
        } else if (hasInitializeWith) {
            defaultLevel = 1;
        } else {
            defaultLevel = 2;
        }
        var requestedLevel = this.state.tmp.disambig_settings.givens[pos][i];
        if (requestedLevel > defaultLevel) {
            useLevel = requestedLevel;
        } else {
            useLevel = defaultLevel;
        }
    }
    var gdropt = this.state.citation.opt["givenname-disambiguation-rule"];
   if (gdropt && gdropt.slice(-14) === "-with-initials") {
        hasInitializeWith = true;
    }
    if (name.family && useLevel === 1) {
        if (hasInitializeWith) {
            var initialize_with = this.state.inheritOpt(this.name, "initialize-with", false, "");
            name.given = CSL.Util.Names.initializeWith(this.state, name.given, initialize_with, !initializeIsTurnedOn);
        } else {
            name.given = CSL.Util.Names.unInitialize(this.state, name.given);
        }
    } else if (useLevel === 0) {
        return {
            blob: false
        }
    } else if (useLevel === 2) {
        name.given = CSL.Util.Names.unInitialize(this.state, name.given);
    }

    var str = this._stripPeriods("given", name.given);
    var rendered = this.state.output.append(str, this.given_decor, true);
    if (rendered) {
        ret = this.state.output.pop();
	    return {
            blob: ret,
            initializationLevel: useLevel
        };
    }
    return {
        blob: false
    };
};

CSL.NameOutput.prototype._nameSuffix = function (name) {

    var str = name.suffix, ret;

    if (str && "string" === typeof this.state.inheritOpt(this.name, "initialize-with")) {
        str = CSL.Util.Names.initializeWith(this.state, str, this.state.inheritOpt(this.name, "initialize-with"), true);
    }

    str = this._stripPeriods("family", str);
    var toSuffix = '';
    if (str && str.slice(-1) === '.') {
	str = str.slice(0, -1);
	toSuffix = '.';
    }
    var rendered = this.state.output.append(str, "empty", true);
    if (rendered) {
        ret = this.state.output.pop();
	ret.strings.suffix = toSuffix + ret.strings.suffix;
	return ret;
    }
    return false;
};

CSL.NameOutput.prototype._getLongStyle = function (name) {
    var long_style;
    if (name["short"].length) {
        if (this.institutionpart["long-with-short"]) {
            long_style = this.institutionpart["long-with-short"];
        } else {
            long_style = this.institutionpart["long"];
        }
    } else {
        long_style = this.institutionpart["long"];
    }
    if (!long_style) {
        long_style = new CSL.Token();
    }
    return long_style;
};

CSL.NameOutput.prototype._getShortStyle = function () {
    var short_style;
    if (this.institutionpart["short"]) {
        short_style = this.institutionpart["short"];
    } else {
        short_style = new CSL.Token();
    }
    return short_style;
};

CSL.NameOutput.prototype._parseName = function (name) {
    if (!name["parse-names"] && "undefined" !== typeof name["parse-names"]) {
        return name;
    }
    if (name.family && !name.given && name.isInstitution) {
        name.literal = name.family;
        name.family = undefined;
        name.isInstitution = undefined;
    }
    var noparse;
    if (name.family 
        && (name.family.slice(0, 1) === '"' && name.family.slice(-1) === '"')
        || (!name["parse-names"] && "undefined" !== typeof name["parse-names"])) {

        name.family = name.family.slice(1, -1);
        noparse = true;
        name["parse-names"] = 0;
    } else {
        noparse = false;
    }
    if (this.state.opt.development_extensions.parse_names) {
        if (!name["non-dropping-particle"] && name.family && !noparse && name.given) {
            if (!name["static-particles"]) {
                CSL.parseParticles(name, true);
            }
        }
    }
};

/*
 * Return a single name object
  */

// The interface is a mess, but this should serve.

CSL.NameOutput.prototype.getName = function (name, slotLocaleset, fallback, stopOrig) {

    // Needs to tell us whether we used orig or not.
    
    if (stopOrig && slotLocaleset === 'locale-orig') {
        return {name:false,usedOrig:stopOrig};
    }

    // Normalize to string
    if (!name.family) {
        name.family = "";
    }
    if (!name.given) {
        name.given = "";
    }

    // Recognized params are:
    //  block-initialize
    //  transliterated
    //  static-ordering
    //  full-form-always
    // All default to false, except for static-ordering, which is initialized
    // with a sniff.
    var name_params = {};
    // Determines the default static-order setting based on the characters
    // used in the headline field. Will be overridden by locale-based
    // parameters evaluated against explicit lang tags set on the (sub)field.
    name_params["static-ordering"] = this.getStaticOrder(name);

    var foundTag = true;
    var langTag;
    if (slotLocaleset !== 'locale-orig') {
        foundTag = false;
        if (name.multi) {
            var langTags = this.state.opt[slotLocaleset];
            for (var i = 0, ilen = langTags.length; i < ilen; i += 1) {
                langTag = langTags[i];
                if (name.multi._key[langTag]) {
                    foundTag = true;
                    var isInstitution = name.isInstitution;
                    name = name.multi._key[langTag];
                    name.isInstitution = isInstitution;
                    // Set name formatting params
                    name_params = this.getNameParams(langTag);
                    name_params.transliterated = true;
                    break;
                }
            }
        }
    }

    if (!foundTag) {
        langTag = false;
        if (name.multi && name.multi.main) {
            langTag = name.multi.main;
        } else if (this.Item.language) {
            langTag = this.Item.language;
        }
        if (langTag) {
            name_params = this.getNameParams(langTag);
        }
    }

    if (!fallback && !foundTag) {
        return {name:false,usedOrig:stopOrig};
    }
    
    // Normalize to string (again)
    if (!name.family) {
        name.family = "";
    }
    if (!name.given) {
        name.given = "";
    }
    if (name.literal) {
        delete name.family;
        delete name.given;
    }
    // var clone the item before writing into it
    name = {
        family:name.family,
        given:name.given,
        "non-dropping-particle":name["non-dropping-particle"],
        "dropping-particle":name["dropping-particle"],
        suffix:name.suffix,
        "static-ordering":name_params["static-ordering"],
        "static-particles":name["static-particles"],
        "reverse-ordering":name_params["reverse-ordering"],
        "full-form-always": name_params["full-form-always"],
        "parse-names":name["parse-names"],
        "comma-suffix":name["comma-suffix"],
        "comma-dropping-particle":name["comma-dropping-particle"],
        transliterated: name_params.transliterated,
        block_initialize: name_params["block-initialize"],
        literal:name.literal,
        isInstitution:name.isInstitution,
        multi:name.multi
    };
    
    if (!name.literal && (!name.given && name.family && name.isInstitution)) {
        name.literal = name.family;
    }
    if (name.literal) {
        delete name.family;
        delete name.given;
    }
    name = this._normalizeNameInput(name);
    var usedOrig;
    if (stopOrig) {
        usedOrig = stopOrig;
    } else {
        usedOrig = !foundTag;
    }
    return {name:name,usedOrig:usedOrig};
};

CSL.NameOutput.prototype.getNameParams = function (langTag) {
    var ret = {};
    var langspec = CSL.localeResolve(this.Item.language, this.state.opt["default-locale"][0]);
    var try_locale = this.state.locale[langspec.best] ? langspec.best : this.state.opt["default-locale"][0];
    var name_as_sort_order = this.state.locale[try_locale].opts["name-as-sort-order"];
    var name_as_reverse_order = this.state.locale[try_locale].opts["name-as-reverse-order"];
    var name_never_short = this.state.locale[try_locale].opts["name-never-short"];
    var field_lang_bare = langTag.split("-")[0];
    if (name_as_sort_order && name_as_sort_order[field_lang_bare]) {
        ret["static-ordering"] = true;
        ret["reverse-ordering"] = false;
    }
    if (name_as_reverse_order && name_as_reverse_order[field_lang_bare]) {
        ret["reverse-ordering"] = true;
        ret["static-ordering"] = false;
    }
    if (name_never_short && name_never_short[field_lang_bare]) {
        ret["full-form-always"] = true;
    }
    
    if (ret["static-ordering"]) {
        ret["block-initialize"] = true;
    }
    return ret;
};

CSL.NameOutput.prototype.setRenderedName = function (name) {
    if (this.state.tmp.area === "bibliography") {
        var strname = "";
        for (var j=0,jlen=CSL.NAME_PARTS.length;j<jlen;j+=1) {
            if (name[CSL.NAME_PARTS[j]]) {
                strname += name[CSL.NAME_PARTS[j]];
            }
        }
        this.state.tmp.rendered_name.push(strname);
    }
};

CSL.NameOutput.prototype.fixupInstitution = function (name, varname, listpos) {
    if (!name.literal && name.family) {
        name.literal = name.family;
        delete name.family;
    }
    var longNameStr = name.literal;
    var shortNameStr = longNameStr;
    var ret = {
        "long": longNameStr.split(/\s*\|\s*/),
        "short": shortNameStr.split(/\s*\|\s*/),
    };
    if (this.state.sys.getAbbreviation) {
        // Normalize longNameStr and shortNameStr
        if (this.institution.strings.form === "short") {
            let jurisdiction = this.Item.jurisdiction;
            jurisdiction = this.state.transform.loadAbbreviation(jurisdiction, "institution-entire", longNameStr, this.Item.language);
            if (this.state.transform.abbrevs[jurisdiction]["institution-entire"][longNameStr]) {
                longNameStr = this.state.transform.abbrevs[jurisdiction]["institution-entire"][longNameStr];
            } else {
                jurisdiction = this.Item.jurisdiction;
                jurisdiction = this.state.transform.loadAbbreviation(jurisdiction, "institution-part", longNameStr, this.Item.language);
                if (this.state.transform.abbrevs[jurisdiction]["institution-part"][longNameStr]) {
                    longNameStr = this.state.transform.abbrevs[jurisdiction]["institution-part"][longNameStr];
                }
            }
            longNameStr = this._quashChecks(jurisdiction, longNameStr);
        }
        if (["short", "short-long", "long-short"].indexOf(this.institution.strings["institution-parts"]) > -1) {
            let jurisdiction = this.Item.jurisdiction;
            jurisdiction = this.state.transform.loadAbbreviation(jurisdiction, "institution-part", shortNameStr, this.Item.language);
            if (this.state.transform.abbrevs[jurisdiction]["institution-part"][shortNameStr]) {
                shortNameStr = this.state.transform.abbrevs[jurisdiction]["institution-part"][shortNameStr];
            }
            shortNameStr = this._quashChecks(jurisdiction, shortNameStr);
            if (["short-long", "long-short"].indexOf(this.institution.strings["institution-parts"]) > -1) {
                if (shortNameStr === longNameStr) {
                    shortNameStr = "";
                }
            }
        }
        // Split abbreviated strings
        // For pure long, split and we're done.
        ret["long"] = longNameStr.split(/\s*\|\s*/);
        // For short, split and then try abbrev with institution-part on each element
        ret["short"] = shortNameStr.split(/\s*\|\s*/);
        if (["short", "short-long", "long-short"].indexOf(this.institution.strings["institution-parts"]) > -1) {
            for (var j=ret["short"].length-1; j>-1; j--) {
                let jurisdiction = this.Item.jurisdiction;
                var abbrevKey = ret["short"][j];
                jurisdiction = this.state.transform.loadAbbreviation(jurisdiction, "institution-part", abbrevKey, this.Item.language);
                if (this.state.transform.abbrevs[jurisdiction]["institution-part"][abbrevKey]) {
                    ret["short"][j] = this.state.transform.abbrevs[jurisdiction]["institution-part"][abbrevKey];
                }
                if (ret["short"][j].indexOf("|") > -1) {
                    let retShort = ret["short"];
                    let splitShort = retShort[j].split(/\s*\|\s*/);
                    ret["short"] = retShort.slice(0, j).concat(splitShort).concat(retShort.slice(j+1));
                }
            }
        }
        if (this.state.opt.development_extensions.legacy_institution_name_ordering) {
            ret["short"].reverse();
        }
        ret["short"] = this._trimInstitution(ret["short"]);
        if (this.institution.strings["reverse-order"]) {
            ret["short"].reverse();
        }
        // trimmer is not available in getAmbiguousCite
        if (!this.state.tmp.just_looking) {
            if (this.Item.jurisdiction) {
                let jurisdiction = this.Item.jurisdiction;
                var trimmer = this.state.tmp.abbrev_trimmer;
                if (trimmer && trimmer[jurisdiction] && trimmer[jurisdiction][varname]) {
                    for (var i=0,ilen=ret["short"].length;i<ilen;i++) {
                        var frag = ret["short"][i];
                        ret["short"][i] = frag.replace(trimmer[jurisdiction][varname], "").trim();
                    }
                }
            }
        }
    }
    if (this.state.opt.development_extensions.legacy_institution_name_ordering) {
        ret["long"].reverse();
    }
    ret["long"] = this._trimInstitution(ret["long"]);
    if (this.institution.strings["reverse-order"]) {
        ret["long"].reverse();
    }

    return ret;
};


CSL.NameOutput.prototype.getStaticOrder = function (name, refresh) {
    var static_ordering_val = false;
    if (!refresh && name["static-ordering"]) {
        static_ordering_val = true;
    } else if (this._isRomanesque(name) === 0) {
        static_ordering_val = true;
    } else if ((!name.multi || !name.multi.main) && this.Item.language && ['vi', 'hu'].indexOf(this.Item.language) > -1) {
        static_ordering_val = true;
    } else if (name.multi && name.multi.main && ['vi', 'hu'].indexOf(name.multi.main.slice(0,2)) > -1) {
        static_ordering_val = true;
    } else {
        if (this.state.opt['auto-vietnamese-names']
            && (CSL.VIETNAMESE_NAMES.exec(name.family + " " + name.given)
                && CSL.VIETNAMESE_SPECIALS.exec(name.family + name.given))) {
            
            static_ordering_val = true;
        }
    }
    return static_ordering_val;
};

CSL.NameOutput.prototype._quashChecks = function (jurisdiction, str) {
    var str = this.state.transform.quashCheck(jurisdiction, str);
    // If the abbreviation has date cut-offs, find the most recent
    // abbreviation within scope.
    var lst = str.split(/>>[0-9]{4}>>/);
    var m = str.match(/>>([0-9]{4})>>/);
    str = lst.pop();
    var date = this.Item["original-date"] ? this.Item["original-date"] : this.Item["issued"];
    if (date) {
        date = parseInt(date.year, 10);
        date = isNaN(date) ? false : date;
    }
    if (date) {
        if (lst.length > 0) {
            for (var k=m.length-1; k>0; k--) {
                if (date >= parseInt(m[k], 10)) {
                    break;
                }
                str = lst.pop();
            }
        }
        str = str.replace(/\s*\|\s*/g, "|");
    }
    return str;
}

CSL.NameOutput.prototype._trimInstitution = function (subunits) {
	// Oh! Good catch in the tests. This happens before abbrevs.
    // Won't work that way. Need to do abbrev substitute first,
    // and apply this separately to long and to short.
    var use_first = false;
    var stop_last = false;
    var use_last = false;
    var stop_first = false;
    var s = subunits.slice();
    if (this.institution) {
        // If use_first, apply stop_last, then apply use_first;
        // If use_last, apply stop_first, then apply use_last;
        if ("undefined" !== typeof this.institution.strings["use-first"]) {
            // this.state.sys.print("use-first OK");
            use_first = this.institution.strings["use-first"];
        }
        if ("undefined" !== typeof this.institution.strings["use-last"]) {
            // this.state.sys.print("use-last OK");
            use_last = this.institution.strings["use-last"];
        }
        if ("undefined" !== typeof this.institution.strings["stop-first"]) {
            // this.state.sys.print("stop-first OK");
            stop_first = this.institution.strings["stop-first"];
        }
        if ("undefined" !== typeof this.institution.strings["stop-last"]) {
            stop_last = this.institution.strings["stop-last"];
        }

        if (use_first) {
            if (stop_last) {
                s = s.slice(0, stop_last * -1);
            }
            s = s.slice(0, use_first);
        }
        
        if (use_last) {
            var ss = subunits.slice();
            if (use_first) {
                stop_first = use_first;
            } else {
                s = [];
            }
            if (stop_first) {
                ss = ss.slice(stop_first);
            }
            ss = ss.slice(use_last * -1);
            s = s.concat(ss);
        }
        subunits = s;
    }
    return subunits;
};
