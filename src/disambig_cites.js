
CSL.Disambiguation = function (state) {
    this.state = state;
    this.sys = this.state.sys;
    this.registry = state.registry.registry;
    this.ambigcites = state.registry.ambigcites;
    this.configModes();
    this.debug = false;
};

CSL.Disambiguation.prototype.run = function(akey) {
    if (!this.modes.length) {
        return;
    }
    this.akey = akey;
    if (this.initVars(akey)) {
        this.runDisambig();
    }
};

CSL.Disambiguation.prototype.runDisambig = function () {
    var ismax;
    this.initGivens = true;
    //
    // Length of list may change during processing
    while (this.lists.length) {
        this.gnameset = 0;
        this.gname = 0;
        this.clashes = [1, 0];
        // each list is scanned repeatedly until all
        // items either succeed or ultimately fail.
        while(this.lists[0][1].length) {
            this.listpos = 0;
            if (!this.base) {
                this.base = this.lists[0][0];
            }
            ismax = this.incrementDisambig();
            this.scanItems(this.lists[0]);
            this.evalScan(ismax);
        }
        this.lists = this.lists.slice(1);
    }
};

CSL.Disambiguation.prototype.scanItems = function (list) {
    var pos, len, otherItem;
    this.Item = list[1][0];
    this.ItemCite = CSL.getAmbiguousCite.call(this.state, this.Item, this.base, true);

    this.scanlist = list[1];
    this.partners = [];
    this.partners.push(this.Item);
    this.nonpartners = [];
    var clashes = 0;

    for (pos = 1, len = list[1].length; pos < len; pos += 1) {
        otherItem = list[1][pos];
        var otherItemCite = CSL.getAmbiguousCite.call(this.state, otherItem, this.base, true);
        if (this.ItemCite === otherItemCite) {
            clashes += 1;
            this.partners.push(otherItem);
        } else {
            this.nonpartners.push(otherItem);
        }
    }
    this.clashes[0] = this.clashes[1];
    this.clashes[1] = clashes;
};

CSL.Disambiguation.prototype.evalScan = function (maxed) {
    this[this.modes[this.modeindex]](maxed);
    if (maxed) {
        if (this.modeindex < this.modes.length - 1) {
            this.modeindex += 1;
        } else {
            this.lists[this.listpos + 1] = [this.base, []];
        }
    }
};

CSL.Disambiguation.prototype.disNames = function (ismax) {
    var i, ilen;
    
    // New design
    // this.base is a forward-only counter. Values are never
    // reduced, and the counter object is never overwritten.
    // It is methodically pushed forward in single-unit increments
    // in incrementDisambig() until disNames() wipes out the list.

    // this.betterbase is cloned from this.base exactly once,
    // at the start of a disambiguation run. Whenever an operation
    // results in improvement, the just-incremented elements
    // identified as this.base.names[this.gnameset] (number of
    // names)and as this.base.givens[this.gnameset][this.gname]
    // (level of given name) are copied from this.base.

    // The this.base object is used to control disambiguation
    // renderings. These will be more fully expanded than the final
    // text, but the flip side of the fact that the extra data does
    // not contribute anything to disambiguation is that leaving
    // it in does no harm -- think of it as the Cold Dark Matter of
    // disambiguation.

    if (this.clashes[1] === 0 && this.nonpartners.length === 1) {
        this.captureStepToBase();
        this.state.registry.registerAmbigToken(this.akey, "" + this.nonpartners[0].id, this.betterbase);
        this.state.registry.registerAmbigToken(this.akey, "" + this.partners[0].id, this.betterbase);
        this.lists[this.listpos] = [this.betterbase, []];
    } else if (this.clashes[1] === 0) {
        this.captureStepToBase();
        this.state.registry.registerAmbigToken(this.akey, "" + this.partners[0].id, this.betterbase);
        this.lists[this.listpos] = [this.betterbase, this.nonpartners];
        if (this.nonpartners.length) {
            this.initGivens = true;
        }
    } else if (this.nonpartners.length === 1) {
        this.captureStepToBase();
        this.state.registry.registerAmbigToken(this.akey, "" + this.nonpartners[0].id, this.betterbase);
        //this.lists[this.listpos] = [this.betterbase, this.partners];
        this.lists[this.listpos] = [this.betterbase, this.partners];
    } else if (this.clashes[1] < this.clashes[0]) {
        this.captureStepToBase();
        this.lists[this.listpos] = [this.betterbase, this.partners];
        this.lists.push([this.betterbase, this.nonpartners]);
    } else {
        if (ismax) {
            this.lists[this.listpos] = [this.betterbase, this.nonpartners];
            this.lists.push([this.betterbase, this.partners]);
            if (this.modeindex === this.modes.length - 1) {
                for (i = 0, ilen = this.partners.length; i < ilen; i += 1) {
                    this.state.registry.registerAmbigToken(this.akey, "" + this.partners[i].id, this.betterbase);
                }
                this.lists[this.listpos] = [this.betterbase, []];
            }
        }
    }
};

CSL.Disambiguation.prototype.disExtraText = function () {
    var done = false, i, ilen, base;

    if (this.clashes[1] === 0 && this.nonpartners.length < 2) {
        done = true;
    }

    // If first encounter in this cycle and multiple modes are
    // available, decrement mode and reset base
    if (!done && (!this.base.disambiguate || this.state.tmp.disambiguate_count !== this.state.tmp.disambiguate_maxMax)) {
        // Rerun everything on each subcycle? This doesn't work currently.
        //this.initVars(this.akey)
        this.modeindex = 0;
        this.base.disambiguate = this.state.tmp.disambiguate_count;
        this.betterbase.disambiguate = this.state.tmp.disambiguate_count;
        if (!this.base.disambiguate) {
            // Evaluate here?
            this.initGivens = true;
            // If disambiguate is false set to true
            this.base.disambiguate = 1;
            // There may be changes
            for (i = 0, ilen = this.lists[this.listpos][1].length; i < ilen; i += 1) {
                this.state.tmp.taintedItemIDs[this.lists[this.listpos][1][i].id] = true;
            }
        } else {
            this.disNames();
        }
    } else if (done || this.state.tmp.disambiguate_count === this.state.tmp.disambiguate_maxMax) {
        if (done || this.modeindex === this.modes.length - 1) {
            // If this is the end, disambiguation failed.
            // Discard disambiguate=true (?) and set parameters
            base = this.lists[this.listpos][0];
            for (i = 0, ilen = this.lists[this.listpos][1].length; i < ilen; i += 1) {
                this.state.tmp.taintedItemIDs[this.lists[this.listpos][1][i].id] = true;
                this.state.registry.registerAmbigToken(this.akey, "" + this.lists[this.listpos][1][i].id, base);
            }
            this.lists[this.listpos] = [this.betterbase, []];
        } else {
            // If this is followed by year-suffix, keep
            // parameters and set disambiguate=true since it MIGHT
            // include the date, needed for year-suffix.
            // This may be a bit over-aggressive for cases in which the
            // disambiguate condition does not add the date
            this.modeindex = this.modes.length - 1;
            base = this.lists[this.listpos][0];
            base.disambiguate = true;
            for (i = 0, ilen = this.lists[this.listpos][1].length; i < ilen; i += 1) {
                // Always tainting here might be a little over-aggressive, but a taint may be required.
                this.state.tmp.taintedItemIDs[this.lists[this.listpos][1][i].id] = true;
                this.state.registry.registerAmbigToken(this.akey, "" + this.lists[this.listpos][1][i].id, base);
            }
        }
    }
};

CSL.Disambiguation.prototype.disYears = function () {
    var pos, len, tokens, token;
    tokens = [];
    var base = this.lists[this.listpos][0];
    if (this.clashes[1]) {
        // That is, if the initial increment on the ambigs group returns no
        // clashes, don't apply suffix. The condition is a necessary failsafe.
		// In original submission order
		for (var i = 0, ilen = this.state.registry.mylist.length; i < ilen; i += 1) {
			var origid = this.state.registry.mylist[i];
			for (var j = 0, jlen = this.lists[this.listpos][1].length; j < jlen; j += 1) {
				token = this.lists[this.listpos][1][j];
				// Warning: token.id can be number. This should be fixed at a higher level in citeproc-js if poss.
				if (token.id == origid) {
					tokens.push(this.registry[token.id]);
					break;
				}
			}
		}
    }
    tokens.sort(this.state.registry.sorter.compareKeys);
    for (pos = 0, len = tokens.length; pos < len; pos += 1) {
        base.year_suffix = ""+pos;
        var oldBase = this.state.registry.registry[tokens[pos].id].disambig;
        this.state.registry.registerAmbigToken(this.akey, "" + tokens[pos].id, base);
        if (CSL.ambigConfigDiff(oldBase,base)) {
            this.state.tmp.taintedItemIDs[tokens[pos].id] = true;
        }
    }
    this.lists[this.listpos] = [this.betterbase, []];
};

CSL.Disambiguation.prototype.incrementDisambig = function () {
    if (this.initGivens) {
        this.initGivens = false;
        return false;
    }
    var maxed = false;
    var increment_names = true;
    if ("disNames" === this.modes[this.modeindex]) {
        // this.gnameset: the index pos of the current nameset
        // this.gname: the index pos of the current name w/in the current nameset
        
        // Stages:
        // - Increment givenname (optional)
        // - Add a name (optional)
        // - Move to next nameset

        // Incrementing is done forward-only on this.base. Values
        // that improve disambiguation results are copied to
        // this.betterbase, which is used to set the disambig parameters
        // in the processor registry.
        

        // Increment
        // Max val is always true if a level is inactive.
        increment_names = false;
        if ("number" !== typeof this.givensMax) {
            increment_names = true;
        }
        var increment_namesets = false;
        if ("number" !== typeof this.namesMax) {
            increment_namesets = true;
        }
        if ("number" === typeof this.givensMax) {
            if (this.base.givens.length && this.base.givens[this.gnameset][this.gname] < this.givensMax) {
                this.base.givens[this.gnameset][this.gname] += 1;
            } else {
                increment_names = true;
            }
        }
        if ("number" === typeof this.namesMax 
            && increment_names) {
            if (this.state.opt["disambiguate-add-names"]) {
                increment_namesets = false;
                if (this.gname < this.namesMax) {
                    this.base.names[this.gnameset] += 1;
                    this.gname += 1;
                } else {
                    increment_namesets = true;
                }
            } else {
                increment_namesets = true;
            }
        }
        if ("number" === typeof this.namesetsMax && increment_namesets) {
            if (this.gnameset < this.namesetsMax) {
                this.gnameset += 1;
                this.base.names[this.gnameset] = 1;
                this.gname = 0;
            }
        }
        if (("number" !== typeof this.namesetsMax || this.namesetsMax === -1 || this.gnameset === this.namesetsMax)
            && (!this.state.opt["disambiguate-add-names"] || "number" !== typeof this.namesMax || this.gname === this.namesMax)
            && ("number" != typeof this.givensMax || "undefined" === typeof this.base.givens[this.gnameset] || "undefined" === typeof this.base.givens[this.gnameset][this.gname] || this.base.givens[this.gnameset][this.gname] === this.givensMax)) {
  
            maxed = true;
        }
    } else if ("disExtraText" === this.modes[this.modeindex]) {
        this.base.disambiguate += 1;
        this.betterbase.disambiguate += 1;
    }
    return maxed;
};

CSL.Disambiguation.prototype.initVars = function (akey) {
    var i, ilen, myIds, myItemBundles, myItems;
    this.lists = [];
    this.base = false;
    this.betterbase = false;
    this.akey = akey;

    this.maxNamesByItemId = {};


    myItemBundles = [];
    myIds = this.ambigcites[akey];
    if (!myIds || !myIds.length) {
        return false;
    }
    var myItem = this.state.retrieveItem("" + myIds[0]);
    this.getCiteData(myItem);
    this.base = CSL.getAmbigConfig.call(this.state);
    if (myIds && myIds.length > 1) {
        myItemBundles.push([this.maxNamesByItemId[myItem.id], myItem]);
        // Build a composite list of Items and associated
        // max names. This is messy, but it's the only
        // way to get the items sorted by the number of names
        // to be disambiguated. If they are in descending order
        // with name expansions, the processor will hang.
        for (i = 1, ilen = myIds.length; i < ilen; i += 1) {
            myItem = this.state.retrieveItem("" + myIds[i]);
            this.getCiteData(myItem, this.base);
            myItemBundles.push([this.maxNamesByItemId[myItem.id], myItem]);
        }
        myItemBundles.sort(
            function (a, b) {
                if (a[0] > b[0]) {
                    return 1;
                } else if (a[0] < b[0]) {
                    return -1;
                } else {
                    if (a[1].id > b[1].id) {
                        return 1;
                    } else if (a[1].id < b[1].id) {
                        return -1;
                    } else {
                        return 0;
                    }
                }
            }
        );
        myItems = [];
        for (i = 0, ilen = myItemBundles.length; i < ilen; i += 1) {
            myItems.push(myItemBundles[i][1]);
        }
        this.lists.push([this.base, myItems]);
        this.Item = this.lists[0][1][0];
    } else {
        this.Item = this.state.retrieveItem("" + myIds[0]);
    }

    this.modeindex = 0;

    this.namesMax = this.maxNamesByItemId[this.Item.id][0];
    // FIXME: This is definitely a bug. Else will never run here
    // if (this.state.citation.opt["disambiguate-add-names"] || true) {
    //     this.namesMax = this.maxNamesByItemId[this.Item.id][0];
    // } else {
    //     var namesMax = this.base.names[0];
    //     for (var i=1,ilen=this.base.names.length;i<ilen;i+=1){
    //         namesMax = Math.max(namesMax,this.base.names.names[i]);
    //     }
    // }


    this.padBase(this.base);
    this.padBase(this.betterbase);
    this.base.year_suffix = false;
    this.base.disambiguate = false;
    this.betterbase.year_suffix = false;
    this.betterbase.disambiguate = false;
    if (this.state.citation.opt["givenname-disambiguation-rule"] === "by-cite"
       && this.state.opt["disambiguate-add-givenname"]) {
        this.givensMax = 2;
    }
    return true;
};


CSL.Disambiguation.prototype.padBase = function (base) {
    for (var i = 0, ilen = base.names.length; i < ilen; i += 1) {
        if (!base.givens[i]) {
            base.givens[i] = [];
        }
        for (var j=0,jlen=base.names[i];j<jlen;j+=1) {
            if (!base.givens[i][j]) {
                base.givens[i][j] = 0;
            }
        }
    }
}

/**
 * Set available modes for disambiguation
 */
CSL.Disambiguation.prototype.configModes = function () {
    var dagopt, gdropt;
    // Modes are function names prototyped to this instance.
    this.modes = [];
    dagopt = this.state.opt["disambiguate-add-givenname"];
    gdropt = this.state.citation.opt["givenname-disambiguation-rule"];
    if (this.state.opt['disambiguate-add-names'] || (dagopt && gdropt === "by-cite")) {
        this.modes.push("disNames");
    }
    if (this.state.opt.has_disambiguate) {
        this.modes.push("disExtraText");
    }
    if (this.state.opt["disambiguate-add-year-suffix"]) {
        this.modes.push("disYears");
    }
};

CSL.Disambiguation.prototype.getCiteData = function(Item, base) {
    var i, ilen;
    // Initialize base if first set item seen
    if (!this.maxNamesByItemId[Item.id]) {
        CSL.getAmbiguousCite.call(this.state, Item, base);
        base = CSL.getAmbigConfig.call(this.state);
        this.maxNamesByItemId[Item.id] = CSL.getMaxVals.call(this.state);
        this.state.registry.registry[Item.id].disambig.givens = this.state.tmp.disambig_settings.givens.slice();
        // Slice the nested lists as well. Without this, disambiguate_YearSuffixFiftyTwoEntriesByCite fails.
        for (i=0,ilen=this.state.registry.registry[Item.id].disambig.givens.length;i<ilen;i+=1) {
            this.state.registry.registry[Item.id].disambig.givens[i] = this.state.tmp.disambig_settings.givens[i].slice();
        }
        this.namesetsMax = this.state.registry.registry[Item.id].disambig.names.length - 1;
        if (!this.base) {
            this.base = base;
            this.betterbase = CSL.cloneAmbigConfig(base);
        }
        if (base.names.length < this.base.names.length) {
            // I don't know what would happen with discrepancies in the number
            // of namesets rendered on items, so we use the fewer of the two
            // and limit the other to that size.
            this.base = base;
        }
        // Padding. Within namesets, we use the longer of the two throughout.
        for (i = 0, ilen = base.names.length; i < ilen; i += 1) {
            if (base.names[i] > this.base.names[i]) {
                // XXX The old must have been wrong surely. The new, I'm not sure.
                //this.base.givens[i] = this.base.givens[i].concat(this.base.givens[i].slice(this.base.names[i]));
                this.base.givens[i] = base.givens[i].slice();
                this.base.names[i] = base.names[i];
                this.betterbase.names = this.base.names.slice();
                this.betterbase.givens = this.base.givens.slice();
                this.padBase(this.base);
                this.padBase(this.betterbase);
            }
        }
        // This shouldn't be necessary
        // getAmbiguousCite() should return a valid and complete
        // givens segment under all conditions, but it does not
        // do so for institution authors, so we clean up after it
        // here.
        // Relevant test: sort_ChicagoYearSuffix2
        this.betterbase.givens = this.base.givens.slice();
        for (var j = 0, jlen = this.base.givens.length; j < jlen; j += 1) {
            this.betterbase.givens[j] = this.base.givens[j].slice();
        }
    }
};

CSL.Disambiguation.prototype.captureStepToBase = function() {
    // Be paranoid about the presence of givens
    if (this.state.citation.opt["givenname-disambiguation-rule"] === "by-cite"
        && this.base.givens && this.base.givens.length) {
        if ("undefined" !== typeof this.base.givens[this.gnameset][this.gname]) {
            this.betterbase.givens[this.gnameset][this.gname] = this.base.givens[this.gnameset][this.gname];
        }
    }
    this.betterbase.names[this.gnameset] = this.base.names[this.gnameset];
};
