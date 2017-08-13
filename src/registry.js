
//
// Time for a rewrite of this module.
//
// Simon has pointed out that list and hash behavior can
// be obtained by ... just using a list and a hash.  This
// is faster for batched operations, because sorting is
// greatly optimized.  Since most of the interaction
// with plugins at runtime will involve batches of
// references, there will be solid gains if the current,
// one-reference-at-a-time approach implemented here
// can be replaced with something that leverages the native
// sort method of the Array() type.
//
// That's going to take some redesign, but it will simplify
// things in the long run, so it might as well happen now.
//
// We'll keep makeCitationCluster and makeBibliography as
// simple methods that return a string.  Neither should
// have any effect on internal state.  This will be a change
// in behavior for makeCitationCluster.
//
// A new updateItems command will be introduced, to replace
// insertItems.  It will be a simple list of IDs, in the
// sequence of first reference in the document.
//
// The calling application should always invoke updateItems
// before makeCitationCluster.
//

//
// should allow batched registration of items by
// key.  should behave as an update, with deletion
// of items and the tainting of disambiguation
// partner sets affected by a deletes and additions.
//
//
// we'll need a reset method, to clear the decks
// in the citation area and start over.

/**
 * Registry of cited items.
 * <p>This is a persistent store of disambiguation and
 * sort order information relating to individual items
 * for which rendering is requested.  Item data is stored
 * in a hash, with the item key as hash key, for quick
 * retrieval.  A virtual sequence within the hashed store
 * is maintained on the fly as items are added to the
 * store, using <code>*_next</code> and <code>*_prev</code>
 * attributes on each item.  A separate hash of items
 * based on their undisambiguated cite form is
 * maintained, and the item id list and disambiguation
 * level for each set of disambiguation partners is shared
 * through the registry item.</p>
 * @class
 */
CSL.Registry = function (state) {
    var ret, i, ilen;
    this.debug = false;
    this.state = state;
    this.registry = {};
    this.reflist = [];
    this.refhash = {};
    this.namereg = new CSL.Registry.NameReg(state);
    this.citationreg = new CSL.Registry.CitationReg(state);
    // See CSL.NameOutput.prototype.outputNames
    // and CSL.Registry.prototype.doinserts
    this.authorstrings = {};

    //
    // shared scratch vars
    this.mylist = [];
    this.myhash = {};
    this.deletes = [];
    this.inserts = [];
    this.uncited = {};
    this.refreshes = {};
    this.akeys = {};
    this.oldseq = {};
    this.return_data = {};
    //
    // each ambig is a list of the ids of other objects
    // that have the same base-level rendering
    this.ambigcites = {};
    this.ambigresets = {};
    this.sorter = new CSL.Registry.Comparifier(state, "bibliography_sort");
    //this.modes = CSL.getModes.call(this.state);
    //this.checkerator = new CSL.Checkerator();

    this.getSortedIds = function () {
        ret = [];
        for (i = 0, ilen = this.reflist.length; i < ilen; i += 1) {
            ret.push("" + this.reflist[i].id);
        }
        return ret;
    };

    this.getSortedRegistryItems = function () {
        ret = [];
        for (i = 0, ilen = this.reflist.length; i < ilen; i += 1) {
            ret.push(this.reflist[i]);
        }
        return ret;
    };
};

//
// Here's the sequence of operations to be performed on
// update:
//
//  1.  (o) [init] Receive list as function argument, store as hash and as list.
//  2.  (o) [init] Initialize refresh list.  Never needs sorting, only hash required.

//  3.  (o) [dodeletes] Delete loop.
//  3a. (o) [dodeletes] Delete names in items to be deleted from names reg.
//  3b. (o) [dodeletes] Complement refreshes list with items affected by
//      possible name changes.  We'll actually perform the refresh once
//      all of the necessary data and parameters have been established
//      in the registry.
//  3c. (o) [dodeletes] Delete all items to be deleted from their disambig pools.
//  3d. (o) [dodeletes] Delete all items in deletion list from hash.

//  4.  (o) [doinserts] Insert loop.
//  4a. (o) [doinserts] Retrieve entries for items to insert.
//  4b. (o) [doinserts] Generate ambig key.
//  4c. (o) [doinserts] Add names in items to be inserted to names reg
//      (implicit in getAmbiguousCite).
//  4d. (o) [doinserts] Record ambig pool key on akey list (used for updating further
//      down the chain).
//  4e. (o) [doinserts] Create registry token.
//  4f. (o) [doinserts] Add item ID to hash.
//  4g. (o) [doinserts] Set and record the base token to hold disambiguation
//      results ("disambig" in the object above).
//  5.  (o) [rebuildlist] Create "new" list of hash pointers, in the order given
//          in the argument to the update function.
//  6.  (o) [rebuildlist] Apply citation numbers to new list.
//  7.  (o) [dorefreshes] Refresh items requiring update.



//  5. (o) [delnames] Delete names in items to be deleted from names reg, and obtain IDs
//         of other items that would be affected by changes around that surname.
//  6. (o) [delnames] Complement delete and insert lists with items affected by
//         possible name changes.
//  7. (o) [delambigs] Delete all items to be deleted from their disambig pools.
//  8. (o) [delhash] Delete all items in deletion list from hash.

//  9. (o) [addtohash] Retrieve entries for items to insert.
// 10. (o) [addtohash] Add items to be inserted to their disambig pools.
// 11. (o) [addtohash] Add names in items to be inserted to names reg
//         (implicit in getAmbiguousCite).
// 12. (o) [addtohash] Create registry token for each item to be inserted.
// 13. (o) [addtohash] Add items for insert to hash.

// 14. (o) [buildlist] Create "new" list of hash pointers, in the order given in the argument
//         to the update function.
// 15. (o) [renumber] Apply citation numbers to new list.
// 16. (o) [setdisambigs] Set disambiguation parameters on each inserted item token.
// 17. (o) [setsortkeys] Set sort keys on each item token.
// 18. (o) [sorttokens] Resort token list
// 19. (o) [renumber] Reset citation numbers on list items
//

CSL.Registry.prototype.init = function (itemIDs, uncited_flag) {
    var i, ilen;
    this.oldseq = {};
    //  1. Receive list as function argument, store as hash and as list.
    //
    // Result:
    //   this.mylist: a list of all itemIDs of referenced items, cited and uncited.
    //   this.myhash: a hash of index positions in this.mylist.
    //   this.uncited: hash of uncited itemIDs.
    //
    // Proceed as follows.
    //
    if (uncited_flag) {
        // If uncited_flag is non-nil, add any missing itemIDs to this.mylist
        // from itemIDs input list, and set the itemIDs in itemIDs on this.uncited.
        this.uncited = {};
        for (i=0,ilen=itemIDs.length;i<ilen; i += 1) {
            if (!this.myhash[itemIDs[i]]) {
                this.mylist.push("" + itemIDs[i]);
            }
            this.uncited[itemIDs[i]] = true;
            this.myhash[itemIDs[i]] = true;
        }
    } else {
        // If uncited_flag is nil, remove duplicate itemIDs from itemIDs input
        // list, set the result on this.mylist, and add missing itemIDs to
        // this.mylist from itemIDs input list.
        for (var key in this.uncited) {
            itemIDs.push(key);
        }
        var myhash = {};
        for (i=itemIDs.length-1;i>-1; i += -1) {
            if (myhash[itemIDs[i]]) {
                itemIDs = itemIDs.slice(0, i).concat(itemIDs.slice(i + 1));
            } else {
                myhash[itemIDs[i]] = true;
            }
        }
        this.mylist = [];
        for (i=0,ilen=itemIDs.length;i<ilen;i+=1) {
            this.mylist.push("" + itemIDs[i]);
        }
        this.myhash = myhash;
    }
    //
    //  2. Initialize refresh list.  Never needs sorting, only hash required.
    //
    this.refreshes = {};
    this.touched = {};
    this.ambigsTouched = {};
    this.ambigresets = {};
};

CSL.Registry.prototype.dopurge = function (myhash) {
    // Remove any uncited items not in myhash
    for (var i=this.mylist.length-1;i>-1;i+=-1) {
        // Might not want to be quite this restrictive.
        if (this.citationreg.citationsByItemId) {
            if (!this.citationreg.citationsByItemId[this.mylist[i]] && !myhash[this.mylist[i]]) {
                delete this.myhash[this.mylist[i]];
                this.mylist = this.mylist.slice(0,i).concat(this.mylist.slice(i+1));
            }
        }
    }
    this.dodeletes(this.myhash);
};

CSL.Registry.prototype.dodeletes = function (myhash) {
    var otheritems, key, ambig, pos, len, items, kkey, mypos, id;
    if ("string" === typeof myhash) {
        myhash = {};
        myhash[myhash] = true;
    }
    //
    //  3. Delete loop.
    //
    for (key in this.registry) {
        if (!myhash[key]) {
            // skip items explicitly marked as uncited
            if (this.uncited[key]) {
                continue;
            }
            //
            //  3a. Delete names in items to be deleted from names reg.
            //
            otheritems = this.namereg.delitems(key);
            //
            //  3b. Complement refreshes list with items affected by
            //      possible name changes.  We'll actually perform the refresh once
            //      all of the necessary data and parameters have been established
            //      in the registry.
            //
            for (kkey in otheritems) {
                this.refreshes[kkey] = true;
            }
            //
            //  3c. Delete all items to be deleted from their disambig pools.
            //
            ambig = this.registry[key].ambig;
            mypos = this.ambigcites[ambig].indexOf(key);
            if (mypos > -1) {
                items = this.ambigcites[ambig].slice();
                this.ambigcites[ambig] = items.slice(0, mypos).concat(items.slice(mypos+1, items.length));
                this.ambigresets[ambig] = this.ambigcites[ambig].length;
            }
            //
            // XX. What we've missed is to provide an update of all
            // items sharing the same ambig  += -1 the remaining items in
            // ambigcites.  So let's do that here, just in case the
            // names update above doesn't catch them all.
            //
            len = this.ambigcites[ambig].length;
            for (pos = 0; pos < len; pos += 1) {
                id = "" + this.ambigcites[ambig][pos];
                this.refreshes[id] = true;
            }
            //
            // 3d-0. Remove parallel id references and realign
            // parallel ID refs.
            //
            if (this.registry[key].siblings) {
                if (this.registry[key].siblings.length == 1) {
                    var loneSiblingID = this.registry[key].siblings[0];
                    this.registry[loneSiblingID].master = true;
                    this.registry[loneSiblingID].siblings.pop();
                    this.registry[loneSiblingID].parallel = false;
                } else if (this.registry[key].siblings.length > 1) {
                    var removeIDs = [key];
                    var k, klen;
                    if (this.registry[key].master) {
                        var newmasterID = this.registry[key].siblings[0];
                        var newmaster = this.registry[newmasterID];
                        newmaster.master = true;
                        newmaster.parallel = false;
                        removeIDs.push(newmasterID);
                        for (k = 0, klen = this.registry[key].siblings.length; k < klen; k += 1) {
                            this.registry[this.registry[key].siblings[k]].parallel = newmasterID;
                        }
                    }
                    var buffer = [];
                    for (k = this.registry[key].siblings.length - 1; k > -1; k += -1) {
                        var siblingID = this.registry[key].siblings.pop();
                        if (removeIDs.indexOf(siblingID) === -1) {
                            buffer.push(siblingID)
                        }
                    }
                    for (k = buffer.length - 1; k > -1; k += -1) {
                        this.registry[key].siblings.push(buffer[k]);
                    }
                }
            }
            //
            //  3d. Delete all items in deletion list from hash.
            //
            delete this.registry[key];
            delete this.refhash[key];

            // For processCitationCluster()
            this.return_data.bibchange = true;
        }
    }
    // Disabled.  See formats.js for code.
    // this.state.fun.decorate.items_delete( this.state.output[this.state.opt.mode].tmp, myhash );
};

CSL.Registry.prototype.doinserts = function (mylist) {
    var item, Item, akey, newitem, abase, i, ilen;
    if ("string" === typeof mylist) {
        mylist = [mylist];
    }
    //
    //  4. Insert loop.
    //
    for (i = 0, ilen = mylist.length; i < ilen; i += 1) {
        item = mylist[i];
        if (!this.registry[item]) {
            //
            //  4a. Retrieve entries for items to insert.
            //
            Item = this.state.retrieveItem(item);

            //
            //  4b. Generate ambig key.
            //
            // AND
            //
            //  4c. Add names in items to be inserted to names reg
            //      (implicit in getAmbiguousCite).
            //
            akey = CSL.getAmbiguousCite.call(this.state, Item);
            this.ambigsTouched[akey] = true;
            //
            //  4d. Record ambig pool key on akey list (used for updating further
            //      down the chain).
            //
            if (!Item.legislation_id) {
                this.akeys[akey] = true;
            }
            //
            //  4e. Create registry token.
            //
            newitem = {
                "id": "" + item,
                "seq": 0,
                "offset": 0,
                "sortkeys": false,
                "ambig": false,
                "rendered": false,
                "disambig": false,
                "ref": Item
            };
            //
            //
            //  4f. Add item ID to hash.
            //
            this.registry[item] = newitem;
            //
            //  4f(a). Add first reference note number
            //         (this may be redundant)
            if (this.citationreg.citationsByItemId && this.citationreg.citationsByItemId[item]) {
                this.registry[item]["first-reference-note-number"] = this.citationreg.citationsByItemId[item][0].properties.noteIndex;
            }

            //
            //  4g. Set and record the base token to hold disambiguation
            //      results ("disambig" in the object above).
            //
            abase = CSL.getAmbigConfig.call(this.state);
            this.registerAmbigToken(akey, item, abase);

            //if (!this.ambigcites[akey]){
            //    this.ambigcites[akey] = [];
            //}
            //CSL.debug("Run: "+item+"("+this.ambigcites[akey]+")");
            //if (this.ambigcites[akey].indexOf(item) === -1){
            //    CSL.debug("  Add: "+item);
            //    this.ambigcites[akey].push(item);
            //}
            //
            //  4h. Make a note that this item needs its sort keys refreshed.
            //
            this.touched[item] = true;
            // For processCitationCluster()
            this.return_data.bibchange = true;
        }
    }
    // Disabled.  See formats.js for code.
    // this.state.fun.decorate.items_add( this.state.output[this.state.opt.mode].tmp, mylist );
};

/*
// No longer required.
CSL.Registry.prototype.douncited = function () {
    var pos, len;
    var cited_len = this.mylist.length - this.uncited.length;
    for (pos = 0, len = cited_len; pos < len; pos += 1) {
        this.registry[this.mylist[pos]].uncited = false;
    }
    for (pos = cited_len, len = this.mylist.length; pos < len; pos += 1) {
        this.registry[this.mylist[pos]].uncited = true;
    }
};
*/

CSL.Registry.prototype.rebuildlist = function () {
    var len, pos, item;
    //
    //  5. Create "new" list of hash pointers, in the order given in the argument
    //     to the update function.
    //
    this.reflist = [];
    //
    //  6. Apply citation numbers to new list,
    //     saving off old sequence numbers as we go.
    //
    // count = 1;
    if (this.state.opt.citation_number_sort_direction === CSL.DESCENDING
       && this.state.opt.citation_number_sort_used) {
        //this.mylist.reverse();
    }
    len = this.mylist.length;
    for (pos = 0; pos < len; pos += 1) {
        item = this.mylist[pos];
        this.reflist.push(this.registry[item]);
        this.oldseq[item] = this.registry[item].seq;
        this.registry[item].seq = (pos + 1);
        // count += 1;
    }
    if (this.state.opt.citation_number_sort_direction === CSL.DESCENDING
       && this.state.opt.citation_number_sort_used) {
        //this.mylist.reverse();
    }
};

/*
 * Okay, at this point we should have a numbered list
 * of registry tokens in the notional order requested,
 * with sequence numbers to reconstruct the ordering
 * if the list is remangled.  So far so good.
 */

CSL.Registry.prototype.dorefreshes = function () {
    var key, regtoken, Item, akey, abase;
    //
    //  7. Refresh items requiring update.
    //
    // It looks like we need to do four things on each cite for refresh:
    // (1) Generate the akey for the cite.
    // (2) Register it on the ambig token.
    // (3) Register the akey in this.akeys
    // (4) Register the item ID in this.touched
    //
    for (key in this.refreshes) {
        regtoken = this.registry[key];
        if (!regtoken) {
            continue;
        }
        regtoken.sortkeys = undefined;
        Item = this.state.retrieveItem(key);
        akey = regtoken.ambig;

        if ("undefined" === typeof akey) {
            this.state.tmp.disambig_settings = false;
            akey = CSL.getAmbiguousCite.call(this.state, Item);
            abase = CSL.getAmbigConfig.call(this.state);
            this.registerAmbigToken(akey, key, abase);
        }
        for (var akkey in this.ambigresets) {
            if (this.ambigresets[akkey] === 1) {
                var loneKey = this.ambigcites[akey][0];
                Item = this.state.retrieveItem(loneKey);
                this.registry[loneKey].disambig = new CSL.AmbigConfig;
                this.state.tmp.disambig_settings = false;
                akey = CSL.getAmbiguousCite.call(this.state, Item);
                abase = CSL.getAmbigConfig.call(this.state);
                this.registerAmbigToken(akey, loneKey, abase);
            }
        }
        this.state.tmp.taintedItemIDs[key] = true;
        this.ambigsTouched[akey] = true;
        if (!Item.legislation_id) {
            this.akeys[akey] = true;
        }
        this.touched[key] = true;
    }
};

/*
 * Main disambiguation  += -1 can everything for disambiguation be
 * crunched into this function?
 */
CSL.Registry.prototype.setdisambigs = function () {
    var akey;
    //
    // Okay, more changes.  Here is where we resolve all disambiguation
    // issues for cites touched by the update.  The this.ambigcites set is
    // based on the complete short form of citations, and is the basis on
    // which names are added and minimal adding of initials or given names
    // is performed.
    //

    //
    // we'll save a list of leftovers for each disambig pool.
    this.leftovers = [];
    //
    //  8.  Set disambiguation parameters on each inserted item token.
    //
    for (akey in this.ambigsTouched) {
        //
        // Disambiguation is fully encapsulated.
        // Disambiguator will run only if there are multiple
        // items, and at least one disambiguation mode is
        // in effect.
        this.state.disambiguate.run(akey);
    }
    this.ambigsTouched = {};
    this.akeys = {};
};



CSL.Registry.prototype.renumber = function () {
    var len, pos, item;
    //
    // 19. Reset citation numbers on list items
    //
    if (this.state.opt.citation_number_sort_direction === CSL.DESCENDING
       && this.state.opt.citation_number_sort_used) {
        //this.reflist.reverse();
    }
    len = this.reflist.length;
    for (pos = 0; pos < len; pos += 1) {
        item = this.reflist[pos];
        // save the overhead of rerenderings if citation-number is not
        // used in the style.
        item.seq = (pos + 1);
        // update_mode is set to CSL.NUMERIC if citation-number is rendered
        // in citations.
        if (this.state.opt.update_mode === CSL.NUMERIC && item.seq != this.oldseq[item.id]) {
            this.state.tmp.taintedItemIDs[item.id] = true;
        }
        if (this.state.opt.bib_mode === CSL.NUMERIC && item.seq != this.oldseq[item.id]) {
            this.return_data.bibchange = true;
        }
    }
    if (this.state.opt.citation_number_sort_direction === CSL.DESCENDING
       && this.state.opt.citation_number_sort_used) {
        this.reflist.reverse();
    }
};

CSL.Registry.prototype.setsortkeys = function () {
    var key;
    //
    // 17. Set sort keys on each item token.
    //
    for (var i = 0, ilen = this.mylist.length; i < ilen; i += 1) {
        key = this.mylist[i];
        // The last of these conditions may create some thrashing on styles that do not require sorting.
        if (this.touched[key] || this.state.tmp.taintedItemIDs[key] || !this.registry[key].sortkeys) {
            this.registry[key].sortkeys = CSL.getSortKeys.call(this.state, this.state.retrieveItem(key), "bibliography_sort");
        }
    }
};

CSL.Registry.prototype.sorttokens = function () {
    //
    // 18. Resort token list.
    //
    this.reflist.sort(this.sorter.compareKeys);
};

/**
 * Compare two sort keys
 * <p>Nested, because keys are an array.</p>
 */
CSL.Registry.Comparifier = function (state, keyset) {
    var sort_directions, len, pos, compareKeys;
    var sortCompare = CSL.getSortCompare(state.opt["default-locale-sort"]);
    sort_directions = state[keyset].opt.sort_directions;
    this.compareKeys = function (a, b) {
        len = a.sortkeys ? a.sortkeys.length : 0;
        for (pos = 0; pos < len; pos += 1) {
            //
            // for ascending sort 1 uses 1, -1 uses -1.
            // For descending sort, the values are reversed.
            //
            // Need to handle undefined values.  No way around it.
            // So have to screen .localeCompare (which is also
            // needed) from undefined values.  Everywhere, in all
            // compares.
            //
            var cmp = 0;
            if (a.sortkeys[pos] === b.sortkeys[pos]) {
                cmp = 0;
            } else if ("undefined" === typeof a.sortkeys[pos]) {
                cmp = sort_directions[pos][1];
            } else if ("undefined" === typeof b.sortkeys[pos]) {
                cmp = sort_directions[pos][0];
            } else {
                // cmp = a.sortkeys[pos].localeCompare(b.sortkeys[pos]);
                cmp = sortCompare(a.sortkeys[pos], b.sortkeys[pos]);
            }
            if (0 < cmp) {
                return sort_directions[pos][1];
            } else if (0 > cmp) {
                return sort_directions[pos][0];
            }
        }
        if (a.seq > b.seq) {
            return 1;
        } else if (a.seq < b.seq) {
            return -1;
        }
        return 0;
    };
    compareKeys = this.compareKeys;
    this.compareCompositeKeys = function (a, b) {
        return compareKeys(a[1], b[1]);
    };
};


/**
 * Compare two disambiguation tokens by their registry sort order
 * <p>Disambiguation lists need to be sorted this way, to
 * obtain the correct year-suffix when that's used.</p>
 */
CSL.Registry.prototype.compareRegistryTokens = function (a, b) {
    if (a.seq > b.seq) {
        return 1;
    } else if (a.seq < b.seq) {
        return -1;
    }
    return 0;
};

CSL.Registry.prototype.registerAmbigToken = function (akey, id, ambig_config) {
    //SNIP-START
    if (!this.registry[id]) {
        CSL.debug("Warning: unregistered item: itemID=("+id+"), akey=("+akey+")");
    }
    //SNIP-END
    // Taint if number of names to be included has changed
    if (this.registry[id] && this.registry[id].disambig && this.registry[id].disambig.names) {
        for (var i = 0, ilen = ambig_config.names.length; i < ilen; i += 1) {
            var new_names_params = ambig_config.names[i];
            var old_names_params = this.registry[id].disambig.names[i];
            if (new_names_params !== old_names_params) {
                this.state.tmp.taintedItemIDs[id] = true;
            } else if (ambig_config.givens[i]) {
                // Compare givenses only if the number of names is aligned.
                for (var j=0,jlen=ambig_config.givens[i].length;j<jlen;j+=1) {
                    var new_gnames_params = ambig_config.givens[i][j];
                    var old_gnames_params = this.registry[id].disambig.givens[i][j];
                    if (new_gnames_params !== old_gnames_params) {
                        this.state.tmp.taintedItemIDs[id] = true;
                    }
                }
            }
        }
    }

    if (!this.ambigcites[akey]) {
        this.ambigcites[akey] = [];
    }
    if (this.ambigcites[akey].indexOf("" + id) === -1) {
        this.ambigcites[akey].push("" + id);
    }
    this.registry[id].ambig = akey;
    this.registry[id].disambig = CSL.cloneAmbigConfig(ambig_config);
};


/**
 * Get the sort key of an item, without decorations
 * <p>This is used internally by the Registry.</p>
 */
CSL.getSortKeys = function (Item, key_type) {
    var area, root, extension, strip_prepositions, len, pos;
    area = this.tmp.area;
    root = this.tmp.root;
    extension = this.tmp.extension;
    strip_prepositions = CSL.Util.Sort.strip_prepositions;
    this.tmp.area = key_type;
    // Gawdawful, this.
    this.tmp.root = key_type.indexOf("_") > -1 ? key_type.slice(0,-5) : key_type;
    this.tmp.extension = "_sort";
    this.tmp.disambig_override = true;
    this.tmp.disambig_request = false;
    this.parallel.use_parallels = (this.parallel.use_parallels === true || this.parallel.use_parallels === null) ? null : false;
    this.tmp.suppress_decorations = true;
    CSL.getCite.call(this, Item);
    this.tmp.suppress_decorations = false;
    this.parallel.use_parallels = this.parallel.use_parallels === null ? true : false;
    this.tmp.disambig_override = false;
    len = this[key_type].keys.length;
    for (pos = 0; pos < len; pos += 1) {
        this[key_type].keys[pos] = strip_prepositions(this[key_type].keys[pos]);
    }
    this.tmp.area = area;
    this.tmp.root = root;
    this.tmp.extension = extension;
    return this[key_type].keys;
};

