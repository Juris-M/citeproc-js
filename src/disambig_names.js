
CSL.Registry.NameReg = function (state) {
    var pkey, ikey, skey, dagopt, gdropt, ret, items, strip_periods, set_keys, evalname, delitems, addname, key, myitems, i, ilen;
    this.state = state;
    this.namereg = {};
    this.nameind = {};
    // used for restoring state following preview
    this.nameindpkeys = {};
    //
    // family, initials form, fullname (with given stripped of periods)
    //
    // keys registered, indexed by ID
    this.itemkeyreg = {};

    strip_periods = function (str) {
        if (!str) {
            str = "";
        }
        return str.replace(/\./g, " ").replace(/\s+/g, " ").replace(/\s+$/,"");
    };

    set_keys = function (state, itemid, nameobj) {
        pkey = strip_periods(nameobj.family);
        skey = strip_periods(nameobj.given);
        // Drop lowercase suffixes (such as et al.) from given name field
        // for disambiguation purposes.
        var m = skey.match(/[,!]* ([^,]+)$/);
        if (m && m[1] === m[1].toLowerCase()) {
            skey = skey.replace(/[,!]* [^,]+$/, "");
        }
        // The %s terminator enables normal initialization behavior
        // with non-Byzantine names.
        ikey = CSL.Util.Names.initializeWith(state, skey, "%s");
        if (state.citation.opt["givenname-disambiguation-rule"] === "by-cite") {
            pkey = "" + itemid + pkey;
        }
    };

    evalname = function (item_id, nameobj, namenum, request_base, form, initials) {
        var param;
        // XXX THIS CAN NO LONGER HAPPEN
        if (state.tmp.area.slice(0, 12) === "bibliography" && !form) {
            if ("string" === typeof initials) {
                return 1;
            } else {
                return 2;
            }
        }
        var res = state.nameOutput.getName(nameobj, "locale-translit", true);
        nameobj = res.name;
        set_keys(this.state, "" + item_id, nameobj);
        //
        // possible options are:
        //
        // <option disambiguate-add-givenname value="true"/> (a)
        // <option disambiguate-add-givenname value="all-names"/> (a)
        // <option disambiguate-add-givenname value="all-names-with-initials"/> (b)
        // <option disambiguate-add-givenname value="primary-name"/> (d)
        // <option disambiguate-add-givenname value="primary-name-with-initials"/> (e)
        // <option disambiguate-add-givenname value="by-cite"/> (g)
        //
        param = 2;
        dagopt = state.opt["disambiguate-add-givenname"];
        gdropt = state.citation.opt["givenname-disambiguation-rule"];
        var gdropt_orig = gdropt;
        if (gdropt === "by-cite") {
            gdropt = "all-names";
        }
        //
        // set initial value
        //
        if ("short" === form) {
            param = 0;
        } else if ("string" === typeof initials) {
            param = 1;
        }
        //
        // give literals a pass
        if ("undefined" === typeof this.namereg[pkey] || "undefined" === typeof this.namereg[pkey].ikey[ikey]) {
            return param;
        }
        //
        // adjust value upward if appropriate -- only if running
        // a non-names-global disambiguation strategy
        //
        if (gdropt_orig === "by-cite" && param <= request_base) {
            //param = request_base;
            return request_base;
        }
        if (!dagopt) {
            return param;
        }
        if ("string" === typeof gdropt && gdropt.slice(0, 12) === "primary-name" && namenum > 0) {
            return param;
        }
        //
        // the last composite condition is for backward compatibility
        //
        if (!gdropt || gdropt === "all-names" || gdropt === "primary-name") {
            if (this.namereg[pkey].count > 1) {
                param = 1;
            }
            if ((this.namereg[pkey].ikey 
                 && this.namereg[pkey].ikey[ikey].count > 1)
                || (this.namereg[pkey].count > 1 
                    && "string" !== typeof initials)) {

                param = 2;
            }
        } else if (gdropt === "all-names-with-initials" || gdropt === "primary-name-with-initials") {
            if (this.namereg[pkey].count > 1) {
                param = 1;
            } else {
                param = 0;
            }
        }
        if (!state.registry.registry[item_id]) {
            if (form == "short") {
                return 0;
            } else if ("string" == typeof initials) {
                return 1;
            }
        } else {
            return param;
        }
    };

    //
    // The operation of this function does not show up in the
    // standard test suite, but it has been hand-tested with
    // a print trace, and seems to work okay.
    //
    delitems = function (ids) {
        var pos, len, posB, id, fullkey;
        if ("string" === typeof ids || "number" === typeof ids) {
            ids = ["" + ids];
        }
        // ret carries the IDs of other items using this name.
        ret = {};
        len = ids.length;
        for (pos = 0; pos < len; pos += 1) {
            id = "" + ids[pos];
            if (!this.nameind[id]) {
                continue;
            }
            for (fullkey in this.nameind[id]) {
                if (this.nameind[id].hasOwnProperty(fullkey)) {
                    key = fullkey.split("::");
                    pkey = key[0];
                    ikey = key[1];
                    skey = key[2];
                    // Skip names that have been deleted already.
                    // Needed to clear integration DisambiguateAddGivenname1.txt
                    // and integration DisambiguateAddGivenname2.txt
                    if ("undefined" === typeof this.namereg[pkey]) {
                        continue;
                    }

                    // ????
                    //posA = this.namereg[pkey].items.indexOf(posA);

                    items = this.namereg[pkey].items;
                    // This was really, really unperceptive. They key elements
                    // have absolutely nothing to do with whether there was ever
                    // a registration at each key level.
                    if (skey && this.namereg[pkey].ikey[ikey] && this.namereg[pkey].ikey[ikey].skey[skey]) {
                        myitems = this.namereg[pkey].ikey[ikey].skey[skey].items;
                        posB = myitems.indexOf("" + id);
                        if (posB > -1) {
                            this.namereg[pkey].ikey[ikey].skey[skey].items = myitems.slice(0, posB).concat(myitems.slice([(posB + 1)]));
                        }
                        if (this.namereg[pkey].ikey[ikey].skey[skey].items.length === 0) {
                            delete this.namereg[pkey].ikey[ikey].skey[skey];
                            this.namereg[pkey].ikey[ikey].count += -1;
                            if (this.namereg[pkey].ikey[ikey].count < 2) {
                                for (i = 0, ilen = this.namereg[pkey].ikey[ikey].items.length; i < ilen; i += 1) {
                                    state.tmp.taintedItemIDs[this.namereg[pkey].ikey[ikey].items[i]] = true;
                                }
                            }
                        }
                    }
                    if (ikey && this.namereg[pkey].ikey[ikey]) {
                        posB = this.namereg[pkey].ikey[ikey].items.indexOf("" + id);
                        if (posB > -1) {
                            items = this.namereg[pkey].ikey[ikey].items.slice();
                            this.namereg[pkey].ikey[ikey].items = items.slice(0, posB).concat(items.slice([posB + 1]));
                        }
                        if (this.namereg[pkey].ikey[ikey].items.length === 0) {
                            delete this.namereg[pkey].ikey[ikey];
                            this.namereg[pkey].count += -1;
                            if (this.namereg[pkey].count < 2) {
                                for (i = 0, ilen = this.namereg[pkey].items.length; i < ilen; i += 1) {
                                    state.tmp.taintedItemIDs[this.namereg[pkey].items[i]] = true;
                                }
                            }
                        }
                    }
                    if (pkey) {
                        posB = this.namereg[pkey].items.indexOf("" + id);
                        if (posB > -1) {
                            items = this.namereg[pkey].items.slice();
                            this.namereg[pkey].items = items.slice(0, posB).concat(items.slice([posB + 1], items.length));
                        }
                        if (this.namereg[pkey].items.length < 2) {
                            delete this.namereg[pkey];
                        }
                    }
                    delete this.nameind[id][fullkey];
                }
            }
            delete this.nameind[id];
            delete this.nameindpkeys[id];
        }
        return ret;
    };
    //
    // Run ALL
    // renderings with disambiguate-add-givenname set to a value
    // with the by-cite behaviour, and then set the names-based
    // expanded form when the final makeCitationCluster rendering
    // is output.  This could be done with a single var set on
    // the state object in the execution wrappers that run the
    // style.
    //
    addname = function (item_id, nameobj, pos) {
        var i, ilen;
        var res = state.nameOutput.getName(nameobj, "locale-translit", true);
        nameobj = res.name;

        if (state.citation.opt["givenname-disambiguation-rule"]
            && state.citation.opt["givenname-disambiguation-rule"].slice(0, 8) === "primary-"
            && pos !== 0) {
                return;
        }
        //CSL.debug("INS");
        set_keys(this.state, "" + item_id, nameobj);
        // pkey, ikey and skey should be stored in separate cascading objects.
        // there should also be a kkey, on each, which holds the item ids using
        // that form of the name.
        //
        // (later note: well, we seem to have slipped a notch here.
        // Adding lists of IDs all over the place here makes no sense;
        // the lists need to include _only_ the items currently rendered
        // at the given level, and the place to do that is in evalname,
        // and in delnames, not here.)
        if (pkey) {
            if ("undefined" === typeof this.namereg[pkey]) {
                this.namereg[pkey] = {};
                this.namereg[pkey].count = 0;
                this.namereg[pkey].ikey = {};
                this.namereg[pkey].items = [item_id];
            } else if (this.namereg[pkey].items.indexOf(item_id) === -1) {
                this.namereg[pkey].items.push(item_id);
            }
//            if (this.namereg[pkey].items.indexOf(item_id) === -1) {
//                this.namereg[pkey].items.push(item_id);
//            }
        }
        if (pkey && ikey) {
            if ("undefined" === typeof this.namereg[pkey].ikey[ikey]) {
                this.namereg[pkey].ikey[ikey] = {};
                this.namereg[pkey].ikey[ikey].count = 0;
                this.namereg[pkey].ikey[ikey].skey = {};
                this.namereg[pkey].ikey[ikey].items = [item_id];
                this.namereg[pkey].count += 1;
                if (this.namereg[pkey].count === 2) {
                    for (i = 0, ilen = this.namereg[pkey].items.length; i < ilen; i += 1) {
                        state.tmp.taintedItemIDs[this.namereg[pkey].items[i]] = true;
                    }
                }
            } else if (this.namereg[pkey].ikey[ikey].items.indexOf(item_id) === -1) {
                this.namereg[pkey].ikey[ikey].items.push(item_id);
            }
//            if (this.namereg[pkey].ikey[ikey].items.indexOf(item_id) === -1) {
//                this.namereg[pkey].ikey[ikey].items.push(item_id);
//            }
        }
        if (pkey && ikey && skey) {
            if ("undefined" === typeof this.namereg[pkey].ikey[ikey].skey[skey]) {
                this.namereg[pkey].ikey[ikey].skey[skey] = {};
                this.namereg[pkey].ikey[ikey].skey[skey].items = [item_id];
                this.namereg[pkey].ikey[ikey].count += 1;
                if (this.namereg[pkey].ikey[ikey].count === 2) {
                    for (i = 0, ilen = this.namereg[pkey].ikey[ikey].items.length; i < ilen; i += 1) {
                        state.tmp.taintedItemIDs[this.namereg[pkey].ikey[ikey].items[i]] = true;
                    }
                }
            } else if (this.namereg[pkey].ikey[ikey].skey[skey].items.indexOf(item_id) === -1) {
                this.namereg[pkey].ikey[ikey].skey[skey].items.push(item_id);
            }
//            if (this.namereg[pkey].ikey[ikey].skey[skey].items.indexOf(item_id) === -1) {
//                this.namereg[pkey].ikey[ikey].skey[skey].items.push(item_id);
//            }
        }
        if ("undefined" === typeof this.nameind[item_id]) {
            this.nameind[item_id] = {};
            this.nameindpkeys[item_id] = {};
        }
        //CSL.debug("INS-A");
        if (pkey) {
            this.nameind[item_id][pkey + "::" + ikey + "::" + skey] = true;
            this.nameindpkeys[item_id][pkey] = this.namereg[pkey];
        }
        //CSL.debug("INS-B");
    };
    this.addname = addname;
    this.delitems = delitems;
    this.evalname = evalname;
};
