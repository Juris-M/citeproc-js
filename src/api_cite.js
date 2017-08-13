CSL.Engine.prototype.previewCitationCluster = function (citation, citationsPre, citationsPost, newMode) {
    // Generate output for a hypothetical citation at the current position,
    // Leave the registry in the same state in which it was found.
    //print("################### previewCitationCluster() #################");
    var oldMode = this.opt.mode;
    this.setOutputFormat(newMode);

    var ret = this.processCitationCluster(citation, citationsPre, citationsPost, CSL.PREVIEW);

    this.setOutputFormat(oldMode);
    return ret[1];
};

CSL.Engine.prototype.appendCitationCluster = function (citation) {
    var citationsPre = [];
    var len = this.registry.citationreg.citationByIndex.length;
    for (var pos = 0; pos < len; pos += 1) {
        var c = this.registry.citationreg.citationByIndex[pos];
        citationsPre.push(["" + c.citationID, c.properties.noteIndex]);
    }
    // Drop the data segment to return a list of pos/string pairs.
    return this.processCitationCluster(citation, citationsPre, [])[1];
};


CSL.Engine.prototype.processCitationCluster = function (citation, citationsPre, citationsPost, flag) {
    var c, i, ilen, j, jlen, k, klen, n, nlen, key, Item, item, noteCitations, textCitations, m, citationsInNote;
    this.debug = false;
    this.tmp.loadedItemIDs = {};
    
    // Revert citation dereference from 2ffc4664ae
    //citation = JSON.parse(JSON.stringify(citation));
    
    //print("################### processCitationCluster() #################");
    this.tmp.citation_errors = [];
    var return_data = {"bibchange": false};

    // make sure this citation has a unique ID, and register it in citationById.
    this.setCitationId(citation);

    var oldCitationList;
    var oldItemList;
    var oldAmbigs;
    if (flag === CSL.PREVIEW) {
        //SNIP-START
        if (this.debug) {
            CSL.debug("****** start state save *********");
        }
        //SNIP-END
        //
        // Simplify.

        // Take a slice of existing citations.
        oldCitationList = this.registry.citationreg.citationByIndex.slice();

        // Take a slice of current items, for later use with update.
        oldItemList = this.registry.reflist.slice();

        // Make a list of preview citation ref objects
        var newCitationList = citationsPre.concat([["" + citation.citationID, citation.properties.noteIndex]]).concat(citationsPost);

        // Make a full list of desired ids, for use in preview update,
        // and a hash list of same while we're at it.
        var newItemIds = {};
        var newItemIdsList = [];
        for (i = 0, ilen = newCitationList.length; i < ilen; i += 1) {
            c = this.registry.citationreg.citationById[newCitationList[i][0]];
            for (j = 0, jlen = c.citationItems.length; j < jlen; j += 1) {
                newItemIds[c.citationItems[j].id] = true;
                newItemIdsList.push("" + c.citationItems[j].id);
            }
        }

        // Clone and save off disambigs of items that will be lost.
        oldAmbigs = {};
        for (i = 0, ilen = oldItemList.length; i < ilen; i += 1) {
            if (!newItemIds[oldItemList[i].id]) {
                var oldAkey = this.registry.registry[oldItemList[i].id].ambig;
                var ids = this.registry.ambigcites[oldAkey];
                if (ids) {
                    for (j = 0, jlen = ids.length; j < jlen; j += 1) {
                        oldAmbigs[ids[j]] = CSL.cloneAmbigConfig(this.registry.registry[ids[j]].disambig);
                    }
                }
            }
        }

        // Update items.  This will produce the base name data and sort things.
        // Possibly unnecessary?
        //this.updateItems(this.registry.mylist.concat(tmpItems));

        //SNIP-START
        if (this.debug) {
            CSL.debug("****** end state save *********");
        }
        //SNIP-END
    }

    this.tmp.taintedCitationIDs = {};
    var sortedItems = [];

    // Styles that use note backreferencing with a by-cite
    // givenname disambiguation rule include the note number
    // in the cite for disambiguation purposes. Correct resolution
    // of disambiguate="true" conditions on first-reference cites 
    // in certain editing scenarios (e.g. where a cite is moved across
    // notes) requires that disambiguation be rerun on cites
    // affected by the edit.
    var rerunAkeys = {};

    // retrieve item data and compose items for use in rendering
    // attach pointer to item data to shared copy for good measure
    for (i = 0, ilen = citation.citationItems.length; i < ilen; i += 1) {
        // Protect against caller-side overwrites to locator strings etc
        item = {};
        for (key in citation.citationItems[i]) {
            item[key] = citation.citationItems[i][key];
        }
        Item = this.retrieveItem("" + item.id);
        if (Item.id) {
            this.transform.loadAbbreviation("default", "hereinafter", Item.id);
        }
        item = CSL.parseLocator.call(this, item);
        if (this.opt.development_extensions.static_statute_locator) {
            this.remapSectionVariable([[Item,item]]);
        }
        if (this.opt.development_extensions.locator_label_parse) {
            if (item.locator && ["bill","gazette","legislation","regulation","treaty"].indexOf(Item.type) === -1 && (!item.label || item.label === 'page')) {
                m = CSL.LOCATOR_LABELS_REGEXP.exec(item.locator);
                if (m) {
                    var tryLabel = CSL.LOCATOR_LABELS_MAP[m[2]];
                    if (this.getTerm(tryLabel)) {
                        item.label = tryLabel;
                        item.locator = m[3];
                    }
                }
            }
        }
        var newitem = [Item, item];
        sortedItems.push(newitem);
        citation.citationItems[i].item = Item;
    }

    // ZZZ sort stuff moved from here.

    // attach the sorted list to the citation item
    citation.sortedItems = sortedItems;

    // build reconstituted citations list in current document order
    var citationByIndex = [];
    for (i = 0, ilen = citationsPre.length; i < ilen; i += 1) {
        c = citationsPre[i];
        //CSL.debug("  -- attempting to access Pre citation with ID: ("+c[0]+")");
        this.registry.citationreg.citationById[c[0]].properties.noteIndex = c[1];
        citationByIndex.push(this.registry.citationreg.citationById[c[0]]);
    }
    citationByIndex.push(citation);
    for (i = 0, ilen = citationsPost.length; i < ilen; i += 1) {
        c = citationsPost[i];
        //CSL.debug("  -- attempting to access Post citation with ID: ("+c[0]+")");
        this.registry.citationreg.citationById[c[0]].properties.noteIndex = c[1];
        citationByIndex.push(this.registry.citationreg.citationById[c[0]]);
    }
    this.registry.citationreg.citationByIndex = citationByIndex;

    //
    // The processor provides three facilities to support
    // updates following position reevaluation.
    //
    // (1) The updateItems() function reports tainted ItemIDs
    // to state.tmp.taintedItemIDs.
    //
    // (2) The processor memos the type of style referencing as
    // CSL.NONE, CSL.NUMERIC or CSL.POSITION in state.opt.update_mode.
    //
    // XXXX: NO LONGER
    // (3) For citations containing cites with backreference note numbers,
    // a string image of the rendered citation is held in
    // citation.properties.backref_citation, and a list of
    // ItemIDs to be used to update the backreference note numbers
    // is memoed at citation.properties.backref_index.  When such
    // citations change position, they can be updated with a
    // series of simple find and replace operations, without
    // need for rerendering.
    //

    //
    // Position evaluation!
    //
    // set positions in reconstituted list, noting taints
    this.registry.citationreg.citationsByItemId = {};
    if (this.opt.update_mode === CSL.POSITION) {
        textCitations = [];
        noteCitations = [];
        citationsInNote = {};
    }
    var update_items = [];
    for (i = 0, ilen = citationByIndex.length; i < ilen; i += 1) {
        citationByIndex[i].properties.index = i;
        for (j = 0, jlen = citationByIndex[i].sortedItems.length; j < jlen; j += 1) {
            item = citationByIndex[i].sortedItems[j];
            if (!this.registry.citationreg.citationsByItemId[item[1].id]) {
                this.registry.citationreg.citationsByItemId[item[1].id] = [];
                update_items.push("" + item[1].id);
            }
            if (this.registry.citationreg.citationsByItemId[item[1].id].indexOf(citationByIndex[i]) === -1) {
                this.registry.citationreg.citationsByItemId[item[1].id].push(citationByIndex[i]);
            }
        }
        if (this.opt.update_mode === CSL.POSITION) {
            if (citationByIndex[i].properties.noteIndex) {
                noteCitations.push(citationByIndex[i]);
            } else {
                citationByIndex[i].properties.noteIndex = 0;
                textCitations.push(citationByIndex[i]);
            }
        }
    }
    //
    // update bibliography items here
    //
    if (flag !== CSL.ASSUME_ALL_ITEMS_REGISTERED) {
        //SNIP-START
        if (this.debug) {
            CSL.debug("****** start update items *********");
        }
        //SNIP-END
        // true signals implicit updateItems (will not rerun sys.retrieveItem())
        this.updateItems(update_items, null, null, true);
        //SNIP-START
        if (this.debug) {
            CSL.debug("****** endo update items *********");
        }
        //SNIP-END
    }

    if (!this.opt.citation_number_sort && sortedItems && sortedItems.length > 1 && this.citation_sort.tokens.length > 0) {
        for (i = 0, ilen = sortedItems.length; i < ilen; i += 1) {
            sortedItems[i][1].sortkeys = CSL.getSortKeys.call(this, sortedItems[i][0], "citation_sort");
        }

        /* 
         * Grouped sort stuff (start)
         */

        if (this.opt.grouped_sort &&  !citation.properties.unsorted) {
            // Insert authorstring as key.
            // Note the position of each ID that correspond to the relevant
            // object in the myblobs list.
            for (i = 0, ilen = sortedItems.length; i < ilen; i += 1) {
                var sortkeys = sortedItems[i][1].sortkeys;
                this.tmp.authorstring_request = true;
                // Run getAmbiguousCite() with the current disambig
                // parameters, and pick up authorstring from the registry.
                var mydisambig = this.registry.registry[sortedItems[i][0].id].disambig;
                
                this.tmp.authorstring_request = true;
                CSL.getAmbiguousCite.call(this, sortedItems[i][0], mydisambig);
                var authorstring = this.registry.authorstrings[sortedItems[i][0].id];
                this.tmp.authorstring_request = false;

                sortedItems[i][1].sortkeys = [authorstring].concat(sortkeys);
            }

            sortedItems.sort(this.citation.srt.compareCompositeKeys);
            // Replace authorstring key in items with same (authorstring) with the 
            // keystring of first normal key. This forces grouped sorts,
            // as discussed here:
            // https://github.com/citation-style-language/schema/issues/40
            var lastauthor = false;
            var thiskey = false;
            var thisauthor = false;
            for (i = 0, ilen = sortedItems.length; i < ilen; i += 1) {
                if (sortedItems[i][1].sortkeys[0] !== lastauthor) {
                    thisauthor = sortedItems[i][1].sortkeys[0];
                    thiskey =  sortedItems[i][1].sortkeys[1];
                }
                sortedItems[i][1].sortkeys[0] = "" + thiskey + i;
                lastauthor = thisauthor;
            }
        }
        /*
         * Grouped sort stuff (end)
         */

        if (!citation.properties.unsorted) {
            sortedItems.sort(this.citation.srt.compareCompositeKeys);
        }
    }

    var citations;
    if (this.opt.update_mode === CSL.POSITION) {
        for (i = 0; i < 2; i += 1) {
            citations = [textCitations, noteCitations][i];
            var first_ref = {};
            var last_ref = {};
            for (j = 0, jlen = citations.length; j < jlen; j += 1) {
                var onecitation = citations[j];
                if (!citations[j].properties.noteIndex) {
                    citations[j].properties.noteIndex = 0;
                }
                citations[j].properties.noteIndex = parseInt(citations[j].properties.noteIndex, 10);
                if (j > 0 && citations[j - 1].properties.noteIndex > citations[j].properties.noteIndex) {
                    citationsInNote = {};
                    first_ref = {};
                    last_ref = {};
                }
                for (k = 0, klen = onecitation.sortedItems.length; k < klen; k += 1) {
                    if (!this.registry.registry[onecitation.sortedItems[k][1].id].parallel) {
                        if (!citationsInNote[onecitation.properties.noteIndex]) {
                            citationsInNote[onecitation.properties.noteIndex] = 1;
                        } else {
                            citationsInNote[onecitation.properties.noteIndex] += 1;
                        }
                    }
                }
                // Set the following:
                //
                // (1) position as required (as per current Zotero)
                // (2) first-reference-note-number as required (on onecitation item)
                // (3) near-note as required (on onecitation item, according to
                //     state.opt["near-note-distance"] parameter)
                // (4) state.registry.citationreg.citationsByItemId.
                //
                // Any state changes caused by unsetting or resetting should
                // trigger a single entry for the citations in
                // state.tmp.taintedCitationIDs (can block on presence of
                // state.registry.citationreg.citationsByItemId).
                //
                for (k = 0, klen = citations[j].sortedItems.length; k < klen; k += 1) {
                    item = citations[j].sortedItems[k];
                    var myid = item[0].id;
                    var mylocator = item[1].locator;
                    var mylabel = item[1].label;
                    if (item[0].legislation_id) {
                        myid = item[0].legislation_id;
                    }
                    var incitationid;
                    if (k > 0) {
                        // incitationid is only reached in the else branch
                        // following "undefined" === typeof first_ref[myid]
                        // below
                        if (onecitation.sortedItems[k - 1][0].legislation_id) {
                            incitationid = onecitation.sortedItems[k - 1][0].legislation_id;
                        } else {
                            incitationid = onecitation.sortedItems[k - 1][1].id;
                        }
                    }
                    // Don't touch item data of other cites when previewing
                    if (flag === CSL.PREVIEW) {
                        if (onecitation.citationID != citation.citationID) {
                            if ("undefined" === typeof first_ref[item[1].id]) {
                                first_ref[myid] = onecitation.properties.noteIndex;
                                last_ref[myid] = onecitation.properties.noteIndex;
                            } else {
                                last_ref[myid] = onecitation.properties.noteIndex;
                            }
                            continue;
                        }
                    }
                    var oldvalue = {};
                    oldvalue.position = item[1].position;
                    oldvalue["first-reference-note-number"] = item[1]["first-reference-note-number"];
                    oldvalue["near-note"] = item[1]["near-note"];
                    item[1]["first-reference-note-number"] = 0;
                    item[1]["near-note"] = false;
                    if (this.registry.citationreg.citationsByItemId[myid]) {
                        if (this.opt.xclass === 'note' && this.opt.has_disambiguate) {
                            var oldCount = this.registry.registry[myid]["citation-count"]
                            var newCount = this.registry.citationreg.citationsByItemId[myid].length;
                            this.registry.registry[myid]["citation-count"] = this.registry.citationreg.citationsByItemId[myid].length;
                            var l, llen;
                            if ("number" === typeof oldCount) {
                                var oldCountCheck = (oldCount < 2);
                                var newCountCheck = (newCount < 2);
                                if (oldCountCheck !== newCountCheck) {
                                    for (l=0,llen=this.registry.citationreg.citationsByItemId[myid].length;l<llen;l++) {
                                        rerunAkeys[this.registry.registry[myid].ambig] = true;
                                        this.tmp.taintedCitationIDs[this.registry.citationreg.citationsByItemId[myid][l].citationID] = true;
                                    }
                                }
                            } else {
                                for (l=0,llen=this.registry.citationreg.citationsByItemId[myid].length;l<llen;l++) {
                                    rerunAkeys[this.registry.registry[myid].ambig] = true;
                                    this.tmp.taintedCitationIDs[this.registry.citationreg.citationsByItemId[myid][l].citationID] = true;
                                }
                            }
                        }
                    }
                    var oldlastid;

                    if ("undefined" === typeof first_ref[myid]) {
                        first_ref[myid] = onecitation.properties.noteIndex;
                        if (this.registry.registry[myid]) {
                            this.registry.registry[myid]['first-reference-note-number'] = onecitation.properties.noteIndex;
                        }
                        last_ref[myid] = onecitation.properties.noteIndex;
                        item[1].position = CSL.POSITION_FIRST;
                    } else {
                        //
                        // backward-looking position evaluation happens here.
                        //
                        //
                        //
                        var ibidme = false;
                        var suprame = false;
                        // XXX Ugly, but This is used in the second else-if branch condition below.
                        if (j > 0) {
                            oldlastid =  citations[j - 1].sortedItems.slice(-1)[0][1].id;
                            if (citations[j - 1].sortedItems[0].slice(-1)[0].legislation_id) {
                                oldlastid = citations[j - 1].sortedItems[0].slice(-1)[0].legislation_id;
                            }
                        }
                        if (j > 0 && parseInt(k, 10) === 0 && citations[j - 1].properties.noteIndex !== citations[j].properties.noteIndex) {
                            // Case 1: source in previous onecitation
                            // (1) Threshold conditions
                            //     (a) there must be a previous onecitation with one item
                            //     (b) this item must be the first in this onecitation
                            //     (c) the previous onecitation must contain a reference
                            //         to the same item ...
                            //     (d) the note numbers must be the same or consecutive.
                            // (this has some jiggery-pokery in it for parallels)
                            var items = citations[(j - 1)].sortedItems;
                            var useme = false;
                            // XXX Can oldid be equated with oldlastid, I wonder ...
                            var oldid = citations[j - 1].sortedItems[0][0].id;
                            if (citations[j - 1].sortedItems[0][0].legislation_id) {
                                oldid = citations[j - 1].sortedItems[0][0].legislation_id;
                            }
                            if ((oldid  == myid && citations[j - 1].properties.noteIndex >= (citations[j].properties.noteIndex - 1)) || citations[j - 1].sortedItems[0][1].id == this.registry.registry[item[1].id].parallel) {
                                if (citationsInNote[citations[j - 1].properties.noteIndex] === 1 || citations[j - 1].properties.noteIndex === 0) {
                                    useme = true;
                                }
                            }
                            for (n = 0, nlen = items.slice(1).length; n < nlen; n += 1) {
                                var itmp = items.slice(1)[n];
                                // XXXXX: This test can't be right.  parallel stores an ID ... ?
                                if (!this.registry.registry[itmp[1].id].parallel || this.registry.registry[itmp[1].id].parallel == this.registry.registry[itmp[1].id]) {
                                    // Does fire in some tests, as a matching undefined
                                    // No apparent side effects of turning it off, though.
                                    // For future consideration.
                                    useme = false;
                                }
                            }
                            if (useme) {
                                ibidme = true;
                            } else {
                                suprame = true;
                            }
                        } else if (k > 0 && incitationid == myid) {
                            // Case 2: immediately preceding source in this onecitation
                            // (1) Threshold conditions
                            //     (a) there must be an imediately preceding reference to  the
                            //         same item in this onecitation; and
                            ibidme = true;
                        } else if (k === 0 && citations[j - 1].properties.noteIndex == citations[j].properties.noteIndex
                                   && citations[j - 1].sortedItems.length 
                                   && oldlastid == myid) {
                            // ... in case there are separate citations in the same note ...
                            // Case 2 [take 2]: immediately preceding source in this onecitation
                            // (1) Threshold conditions
                            //     (a) there must be an imediately preceding reference to  the
                            //         same item in this onecitation; and
                            ibidme = true;
                        } else {
                            // everything else is definitely subsequent
                            suprame = true;
                        }
                        // conditions
                        var prev, prev_locator, prev_label, curr_locator, curr_label;
                        if (ibidme) {
                            if (k > 0) {
                                prev = onecitation.sortedItems[(k - 1)][1];
                            } else {
                                prev = citations[(j - 1)].sortedItems[0][1];
                            }
                            if (prev.locator) {
                                if (prev.label) {
                                    prev_label = prev.label;
                                } else {
                                    prev_label = "";
                                }
                                prev_locator = "" + prev.locator + prev_label;
                            } else {
                                prev_locator = prev.locator;
                            }
                            if (mylocator) {
                                if (mylabel) {
                                    curr_label = mylabel;
                                } else {
                                    curr_label = "";
                                }
                                curr_locator = "" + mylocator + curr_label;
                            } else {
                                curr_locator = mylocator;
                            }
                        }
                        // triage
                        if (ibidme && prev_locator && !curr_locator) {
                            ibidme = false;
                            suprame = true;

                        }
                        if (ibidme) {
                            if (!prev_locator && curr_locator) {
                                //     (a) if the previous onecitation had no locator
                                //         and this onecitation has one, use ibid+pages
                                item[1].position = CSL.POSITION_IBID_WITH_LOCATOR;
                            } else if (!prev_locator && !curr_locator) {
                                //     (b) if the previous onecitation had no locator
                                //         and this onecitation also has none, use ibid
                                item[1].position = CSL.POSITION_IBID;
                                //print("setting ibid in cmd_cite()");
                            } else if (prev_locator && curr_locator === prev_locator) {
                                //     (c) if the previous onecitation had a locator
                                //         (page number, etc.) and this onecitation has
                                //         a locator that is identical, use ibid

                                item[1].position = CSL.POSITION_IBID;
                                //print("setting ibid in cmd_cite() [2]");
                            } else if (prev_locator && curr_locator && curr_locator !== prev_locator) {
                                //     (d) if the previous onecitation had a locator,
                                //         and this onecitation has one that differs,
                                //         use ibid+pages
                                item[1].position = CSL.POSITION_IBID_WITH_LOCATOR;
                            } else {
                                //     (e) if the previous onecitation had a locator
                                //         and this onecitation has none, use subsequent
                                //
                                //     ... and everything else would be subsequent also
                                ibidme = false; // just to be clear
                                suprame = true;
                            }
                        }
                        if (suprame) {
                            item[1].position = CSL.POSITION_SUBSEQUENT;
                        }
                        if (suprame || ibidme) {
                            if (first_ref[myid] != onecitation.properties.noteIndex) {
                                item[1]["first-reference-note-number"] = first_ref[myid];
                                if (this.registry.registry[myid]) {
                                    // This is either the earliest recorded number, or the number of the current citation, whichever is smaller.
                                    var oldFirst = this.registry.citationreg.citationsByItemId[myid][0].properties.noteIndex;
                                    var newFirst = onecitation.properties.noteIndex;
                                    this.registry.registry[myid]['first-reference-note-number'] = newFirst < oldFirst ? newFirst: oldFirst;
                                }
                            }
                        }
                    }
                    if (onecitation.properties.noteIndex) {
                        var note_distance = parseInt(onecitation.properties.noteIndex, 10) - parseInt(last_ref[myid], 10);
                        if (item[1].position !== CSL.POSITION_FIRST 
                            && note_distance <= this.citation.opt["near-note-distance"]) {
                            item[1]["near-note"] = true;
                        }
                        last_ref[myid] = onecitation.properties.noteIndex;
                    }
                    if (onecitation.citationID != citation.citationID) {
                        for (n = 0, nlen = CSL.POSITION_TEST_VARS.length; n < nlen; n += 1) {
                            var param = CSL.POSITION_TEST_VARS[n];
                            if (item[1][param] !== oldvalue[param]) {
                                if (this.registry.registry[myid]) {
                                    if (param === 'first-reference-note-number') {
                                        rerunAkeys[this.registry.registry[myid].ambig] = true;
                                        this.tmp.taintedItemIDs[myid] = true;
                                    }
                                }
                                this.tmp.taintedCitationIDs[onecitation.citationID] = true;
                            }
                        }
                    }
                    if (this.sys.variableWrapper) {
                        item[1].index = onecitation.properties.index;
                        item[1].noteIndex = onecitation.properties.noteIndex;
                    }
                }
            }
        }
    }
    if (this.opt.citation_number_sort && sortedItems && sortedItems.length > 1 && this.citation_sort.tokens.length > 0) {
        if (!citation.properties.unsorted) {
            for (i = 0, ilen = sortedItems.length; i < ilen; i += 1) {
                sortedItems[i][1].sortkeys = CSL.getSortKeys.call(this, sortedItems[i][0], "citation_sort");
            }
            sortedItems.sort(this.citation.srt.compareCompositeKeys);
        }
    }
    for (key in this.tmp.taintedItemIDs) {
        if (this.tmp.taintedItemIDs.hasOwnProperty(key)) {
            citations = this.registry.citationreg.citationsByItemId[key];
            // Current citation may be tainted but will not exist
            // during previewing.
            if (citations) {
                for (i = 0, ilen = citations.length; i < ilen; i += 1) {
                    this.tmp.taintedCitationIDs[citations[i].citationID] = true;
                }
            }
        }
    }

    var ret = [];
    if (flag === CSL.PREVIEW) {
        // If previewing, return only a rendered string
        //SNIP-START
        if (this.debug) {
            CSL.debug("****** start run processor *********");
        }
        //SNIP-END
        try {
            ret = this.process_CitationCluster.call(this, citation.sortedItems, citation.citationID);
        } catch (e) {
            CSL.error("Error running CSL processor for preview: "+e);
        }
            
        //SNIP-START
        if (this.debug) {
            CSL.debug("****** end run processor *********");
            CSL.debug("****** start state restore *********");
        }
        //SNIP-END
        // Wind out anything related to new items added for the preview.
        // This means (1) names, (2) disambig state for affected items,
        // (3) keys registered in the ambigs pool arrays, and (4) registry
        // items.
        //

        // restore sliced citations
        this.registry.citationreg.citationByIndex = oldCitationList;
        this.registry.citationreg.citationById = {};
        for (i = 0, ilen = oldCitationList.length; i < ilen; i += 1) {
            this.registry.citationreg.citationById[oldCitationList[i].citationID] = oldCitationList[i];
        }

        //SNIP-START
        if (this.debug) {
            CSL.debug("****** start final update *********");
        }
        //SNIP-END
        var oldItemIds = [];
        for (i = 0, ilen = oldItemList.length; i < ilen; i += 1) {
            oldItemIds.push("" + oldItemList[i].id);
        }
        this.updateItems(oldItemIds, null, null, true);
        //SNIP-START
        if (this.debug) {
            CSL.debug("****** end final update *********");
        }
        //SNIP-END
        // Roll back disambig states
        for (key in oldAmbigs) {
            if (oldAmbigs.hasOwnProperty(key)) {
                this.registry.registry[key].disambig = oldAmbigs[key];
            }
        }
        //SNIP-START
        if (this.debug) {
            CSL.debug("****** end state restore *********");
        }
        //SNIP-END
    } else {
        // Rerun cites that have moved across citations or had a change
        // in their number of subsequent references, so that disambiguate
        // and subsequent-reference-count conditions are applied
        // correctly in output.
        for (var rerunAkey in rerunAkeys) {
            this.disambiguate.run(rerunAkey, citation);
        }
        // Run taints only if not previewing
        //
        // Push taints to the return object
        //
        var obj;
        for (key in this.tmp.taintedCitationIDs) {
            if (key == citation.citationID) {
                continue;
            }
            var mycitation = this.registry.citationreg.citationById[key];
            if (!mycitation.properties.unsorted) {
                for (i = 0, ilen = mycitation.sortedItems.length; i < ilen; i += 1) {
                    mycitation.sortedItems[i][1].sortkeys = CSL.getSortKeys.call(this, mycitation.sortedItems[i][0], "citation_sort");
                }
                mycitation.sortedItems.sort(this.citation.srt.compareCompositeKeys);
            }
            // For error reporting
            this.tmp.citation_pos = mycitation.properties.index;
            this.tmp.citation_note_index = mycitation.properties.noteIndex;
            this.tmp.citation_id = "" + mycitation.citationID;
            obj = [];
            obj.push(mycitation.properties.index);
            obj.push(this.process_CitationCluster.call(this, mycitation.sortedItems, mycitation.citationID));
            obj.push(mycitation.citationID);
            ret.push(obj);
        }
        this.tmp.taintedItemIDs = {};
        this.tmp.taintedCitationIDs = {};

        // For error reporting again
        this.tmp.citation_pos = citation.properties.index;
        this.tmp.citation_note_index = citation.properties.noteIndex;
        this.tmp.citation_id = "" + citation.citationID;

        obj = [];
        obj.push(citationsPre.length);
        obj.push(this.process_CitationCluster.call(this, sortedItems, citation.citationID));
        obj.push(citation.citationID);
        ret.push(obj);
        //
        // note for posterity: Rhino and Spidermonkey produce different
        // sort results for items with matching keys.  That discrepancy
        // turned up a subtle bug in the parallel detection code, trapped
        // at line 266, above, and in line 94 of util_parallel.js.
        //
        ret.sort(function (a, b) {
            if (a[0] > b[0]) {
                return 1;
            } else if (a[0] < b[0]) {
                return -1;
            } else {
                return 0;
            }
        });
        //
        // In normal rendering, return is a list of two-part arrays, with the first element
        // a citation index number, and the second the text to be inserted.
        //
    }
    return_data.citation_errors = this.tmp.citation_errors.slice();
    return [return_data, ret];
};

CSL.Engine.prototype.process_CitationCluster = function (sortedItems, citationID) {
    var str;
    this.parallel.StartCitation(sortedItems);
    str = CSL.getCitationCluster.call(this, sortedItems, citationID);
    return str;
};

CSL.Engine.prototype.makeCitationCluster = function (rawList) {
    var inputList, newitem, str, pos, len, item, Item;
    inputList = [];
    len = rawList.length;
    for (pos = 0; pos < len; pos += 1) {
        item = {};
        for (var key in rawList[pos]) {
            item[key] = rawList[pos][key];
        }
        Item = this.retrieveItem("" + item.id);
        // Code block is copied from processCitationCluster() above
        if (this.opt.development_extensions.locator_label_parse) {
            if (item.locator && ["bill","gazette","legislation","regulation","treaty"].indexOf(Item.type) === -1 && (!item.label || item.label === 'page')) {
                var m = CSL.LOCATOR_LABELS_REGEXP.exec(item.locator);
                if (m) {
                    var tryLabel = CSL.LOCATOR_LABELS_MAP[m[2]];
                    if (this.getTerm(tryLabel)) {
                        item.label = tryLabel;
                        item.locator = m[3];
                    }
                }
            }
        }
        if (item.locator) {
            item.locator = ("" + item.locator).replace(/\s+$/, '');
        }
        newitem = [Item, item];
        inputList.push(newitem);
    }
    if (this.opt.development_extensions.static_statute_locator) {
        this.remapSectionVariable(inputList);
    }
    if (inputList && inputList.length > 1 && this.citation_sort.tokens.length > 0) {
        len = inputList.length;
        for (pos = 0; pos < len; pos += 1) {
            inputList[pos][1].sortkeys = CSL.getSortKeys.call(this, inputList[pos][0], "citation_sort");
        }
        inputList.sort(this.citation.srt.compareCompositeKeys);
    }
    this.tmp.citation_errors = [];
    this.parallel.StartCitation(inputList);
    str = CSL.getCitationCluster.call(this, inputList);
    return str;
};


/**
 * Get the undisambiguated version of a cite, without decorations
 * <p>This is used internally by the Registry.</p>
 *
 * [object] CSL Item
 * [object] disambiguation parameters
 * [boolean] If true, include first-reference-note-number value in cite
 */
CSL.getAmbiguousCite = function (Item, disambig, visualForm, item) {
    var ret;
    var flags = this.tmp.group_context.tip;
    var oldTermSiblingLayer = {
        term_intended: flags.term_intended,
        variable_attempt: flags.variable_attempt,
        variable_success: flags.variable_success,
        output_tip: flags.output_tip,
        label_form: flags.label_form,
        parallel_conditions: flags.parallel_conditions,
        condition: flags.condition,
        force_suppress: flags.force_suppress,
        done_vars: flags.done_vars.slice()
    }
    if (disambig) {
        this.tmp.disambig_request = disambig;
    } else {
        this.tmp.disambig_request = false;
    }
    var itemSupp = {
        position: 1,
        "near-note": true
    };

    if (item) {
        itemSupp.locator = item.locator;
        itemSupp.label = item.label;
    }

    if (this.registry.registry[Item.id] 
        && this.registry.citationreg.citationsByItemId
        && this.registry.citationreg.citationsByItemId[Item.id]
        && this.registry.citationreg.citationsByItemId[Item.id].length 
        && visualForm) {
        if (this.citation.opt["givenname-disambiguation-rule"] === "by-cite") {
            itemSupp['first-reference-note-number'] = this.registry.registry[Item.id]['first-reference-note-number'];
        }
    }
    this.tmp.area = "citation";
    this.tmp.root = "citation";
    this.parallel.use_parallels = (this.parallel.use_parallels === true || this.parallel.use_parallels === null) ? null : false;
    this.tmp.suppress_decorations = true;
    this.tmp.just_looking = true;

    // Do not reset shadow_numbers when running ambiguous cites
    CSL.getCite.call(this, Item, itemSupp, null, false);
    // !!!
    for (var i=0,ilen=this.output.queue.length;i<ilen;i+=1) {
        CSL.Output.Queue.purgeEmptyBlobs(this.output.queue[i]);
    }
    if (this.opt.development_extensions.clean_up_csl_flaws) {
        for (var j=0,jlen=this.output.queue.length;j<jlen;j+=1) {
            this.output.adjust.upward(this.output.queue[j]);
            this.output.adjust.leftward(this.output.queue[j]);
            this.output.adjust.downward(this.output.queue[j]);
            this.output.adjust.fix(this.output.queue[j]);
        }
    }
    ret = this.output.string(this, this.output.queue);
    this.tmp.just_looking = false;
    this.tmp.suppress_decorations = false;
    this.parallel.use_parallels = this.parallel.use_parallels === null ? true : false;
    // Cache the result.
    this.tmp.group_context.replace(oldTermSiblingLayer);
    return ret;
};

/**
 * Return delimiter for use in join
 * <p>Splice evaluation is done during cite
 * rendering, and this method returns the
 * result.  Evaluation requires three items
 * of information from the preceding cite, if
 * one is present: the names used; the years
 * used; and the suffix appended to the
 * citation.  These details are copied into
 * the state object before processing begins,
 * and are cleared by the processor on
 * completion of the run.</p>
 */

CSL.getSpliceDelimiter = function (last_collapsed, pos) {
    if (last_collapsed && ! this.tmp.have_collapsed && "string" === typeof this.citation.opt["after-collapse-delimiter"]) {
        this.tmp.splice_delimiter = this.citation.opt["after-collapse-delimiter"];
    } else if (this.tmp.use_cite_group_delimiter) {
        this.tmp.splice_delimiter = this.citation.opt.cite_group_delimiter;
    } else if (this.tmp.have_collapsed && this.opt.xclass === "in-text" && this.opt.update_mode !== CSL.NUMERIC) {
        this.tmp.splice_delimiter = ", ";
    } else if (this.tmp.cite_locales[pos - 1]) {
        //
        // Must have a value to take effect.  Use zero width space to force empty delimiter.
        var alt_affixes = this.tmp.cite_affixes[this.tmp.area][this.tmp.cite_locales[pos - 1]];
        if (alt_affixes && alt_affixes.delimiter) {
            this.tmp.splice_delimiter = alt_affixes.delimiter;
        }
    } else if (!this.tmp.splice_delimiter) {
        // This happens when no delimiter is set on cs:layout under cs:citation
        this.tmp.splice_delimiter = "";
    }
    // Paranoia
    //if (!this.tmp.splice_delimiter) {
    //    this.tmp.splice_delimiter = "";
    //}
    return this.tmp.splice_delimiter;
};

/*
 * Compose individual cites into a single string, with
 * flexible inter-cite splicing.
 */
CSL.getCitationCluster = function (inputList, citationID) {
    var result, objects, myparams, len, pos, item, last_collapsed, params, composite, compie, myblobs, Item, llen, ppos, obj, preceding_item, txt_esc, error_object;
    inputList = inputList ? inputList : [];
    this.tmp.last_primary_names_string = false;
    txt_esc = CSL.getSafeEscape(this);
    this.tmp.area = "citation";
    this.tmp.root = "citation";
    result = "";
    objects = [];
    this.tmp.last_suffix_used = "";
    this.tmp.last_names_used = [];
    this.tmp.last_years_used = [];
    this.tmp.backref_index = [];
    this.tmp.cite_locales = [];

    this.output.checkNestedBrace = new CSL.checkNestedBrace(this);

    var use_layout_prefix = this.output.checkNestedBrace.update(this.citation.opt.layout_prefix);
    //var use_layout_prefix = this.citation.opt.layout_prefix;

    var suppressTrailingPunctuation = false;
    if (this.opt.xclass === "note" && this.citation.opt.suppressTrailingPunctuation) {
        suppressTrailingPunctuation = true;
    }
    if (citationID) {
        //this.registry.citationreg.citationById[citationID].properties.backref_index = false;
        //this.registry.citationreg.citationById[citationID].properties.backref_citation = false;
        if (this.registry.citationreg.citationById[citationID].properties["suppress-trailing-punctuation"]) {
            suppressTrailingPunctuation = true;
        }
    }

    // Adjust locator positions if that looks like a sensible thing to do.
    if (this.opt.xclass === "note") {
        var parasets = [];
        var lastTitle = false;
        var lastID = false;
        var lst = [];
        for (var i=0, ilen = inputList.length; i < ilen; i += 1) {
            var type = inputList[i][0].type;
            var title = inputList[i][0].title;
            var position = inputList[i][1].position;
            var id = inputList[i][0].id;
            if (title && type === "legal_case" && id !== lastID && position) {
                // Start a fresh sublist if the item title does not match the last one
                if (title !== lastTitle || parasets.length === 0) {
                    lst = [];
                    parasets.push(lst);
                }
                lst.push(inputList[i][1]);
            }
            lastTitle = title;
            lastID = id;
        }
        // We now have a list of sublists, each w/matching titles
        for (i=0, ilen=parasets.length; i < ilen; i += 1) {
            lst = parasets[i];
            if (lst.length < 2) {
                continue;
            }
            // Get the locator in last position, but only if it's the only one in the set.
            var locatorInLastPosition = lst.slice(-1)[0].locator;
            if (locatorInLastPosition) {
                for (var j=0, jlen=lst.length - 1; j < jlen; j += 1) {
                    if (lst[j].locator) {
                        locatorInLastPosition = false;
                    }
                }
            }
            // move the locator here, if it's called for.
            if (locatorInLastPosition) {
                lst[0].locator = locatorInLastPosition;
                delete lst.slice(-1)[0].locator;
                lst[0].label = lst.slice(-1)[0].label;
                if (lst.slice(-1)[0].label) {
                    delete lst.slice(-1)[0].label;
                }
            }
       }
    }

    myparams = [];
    len = inputList.length;
    for (pos = 0; pos < len; pos += 1) {
        Item = inputList[pos][0];
        item = inputList[pos][1];
        item = CSL.parseLocator.call(this, item);
        last_collapsed = this.tmp.have_collapsed;
        params = {};
        
        // Reset shadow_numbers here, suppress reset in getCite()
        this.tmp.shadow_numbers = {};
        if (!this.tmp.just_looking && this.opt.hasPlaceholderTerm) {
            var output = this.output;
            this.output = new CSL.Output.Queue(this);
            this.output.adjust = new CSL.Output.Queue.adjust();
            CSL.getAmbiguousCite.call(this, Item, null, false, item);
            this.output = output;
        }

        this.tmp.in_cite_predecessor = false;
        // true is to block reset of shadow numbers
        if (pos > 0) {
            CSL.getCite.call(this, Item, item, "" + inputList[(pos - 1)][0].id, true);
        } else {
            this.tmp.term_predecessor = false;
            CSL.getCite.call(this, Item, item, null, true);
        }
        // Make a note of any errors
        if (!this.tmp.cite_renders_content) {
            error_object = {
                citationID: "" + this.tmp.citation_id,
                index: this.tmp.citation_pos,
                noteIndex: this.tmp.citation_note_index,
                itemID: "" + Item.id,
                citationItems_pos: pos,
                error_code: CSL.ERROR_NO_RENDERED_FORM
            };
            this.tmp.citation_errors.push(error_object);
        }
        if (pos === (inputList.length - 1)) {
            this.parallel.ComposeSet();
        }
        params.splice_delimiter = CSL.getSpliceDelimiter.call(this, last_collapsed, pos);
        // XXX This appears to be superfluous.
        if (item && item["author-only"]) {
            this.tmp.suppress_decorations = true;
        }

        if (pos > 0) {
            preceding_item = inputList[pos - 1][1];

            // XXX OR if preceding suffix is empty, and the current prefix begins with a full stop.

            var precedingEndsInPeriodOrComma = preceding_item.suffix && [".", ","].indexOf(preceding_item.suffix.slice(-1)) > -1;
            var currentStartsWithPeriodOrComma = !preceding_item.suffix && item.prefix && [".", ","].indexOf(item.prefix.slice(0, 1)) > -1;
            if (precedingEndsInPeriodOrComma || currentStartsWithPeriodOrComma) {
                var spaceidx = params.splice_delimiter.indexOf(" ");
                if (spaceidx > -1 && !currentStartsWithPeriodOrComma) {
                    params.splice_delimiter = params.splice_delimiter.slice(spaceidx);
                } else {
                    params.splice_delimiter = "";
                }
            }
        }
        params.suppress_decorations = this.tmp.suppress_decorations;
        params.have_collapsed = this.tmp.have_collapsed;
        //
        // XXXXX: capture parameters to an array, which
        // will be of the same length as this.output.queue,
        // corresponding to each element.
        //
        myparams.push(params);
    }

    this.tmp.has_purged_parallel = false;
    this.parallel.PruneOutputQueue(this);
    //
    // output.queue is a simple array.  do a slice
    // of it to get each cite item, setting params from
    // the array that was built in the preceding loop.
    //
    myblobs = this.output.queue.slice();

    var suffix = this.citation.opt.layout_suffix;
    var last_locale = this.tmp.cite_locales[this.tmp.cite_locales.length - 1];
    //
    // Must have a value to take effect.  Use zero width space to force empty suffix.
    if (last_locale && this.tmp.cite_affixes[this.tmp.area][last_locale] && this.tmp.cite_affixes[this.tmp.area][last_locale].suffix) {
        suffix = this.tmp.cite_affixes[this.tmp.area][last_locale].suffix;
    }
    if (CSL.TERMINAL_PUNCTUATION.slice(0, -1).indexOf(suffix.slice(0, 1)) > -1) {
        suffix = suffix.slice(0, 1);
    }
    var delimiter = this.citation.opt.layout_delimiter;
    if (!delimiter) {
        delimiter = "";
    }
    if (CSL.TERMINAL_PUNCTUATION.slice(0, -1).indexOf(delimiter.slice(0, 1)) > -1) {
        delimiter = delimiter.slice(0, 1);
    }
    //print("=== FROM CITE ===");
    suffix = this.output.checkNestedBrace.update(suffix);


    for (i=0,ilen=this.output.queue.length;i<ilen;i+=1) {
        CSL.Output.Queue.purgeEmptyBlobs(this.output.queue[i]);
    }
    if (!this.tmp.suppress_decorations && this.output.queue.length) {
        if (!(this.opt.development_extensions.apply_citation_wrapper
              && this.sys.wrapCitationEntry
               && !this.tmp.just_looking
              && this.tmp.area === "citation")) { 

            if (!suppressTrailingPunctuation) {
                this.output.queue[this.output.queue.length - 1].strings.suffix = suffix;
            }
            this.output.queue[0].strings.prefix = use_layout_prefix;
        }
    }
    if (this.opt.development_extensions.clean_up_csl_flaws) {
        for (j=0,jlen=this.output.queue.length;j<jlen;j+=1) {
            //print("OUTPUT[5]: "+JSON.stringify(this.output.queue[j],['strings','prefix','suffix','delimiter','blobs','decorations'],2))
            this.output.adjust.upward(this.output.queue[j]);
            //print("OUTPUT[4]: "+JSON.stringify(this.output.queue[j],['strings','prefix','suffix','delimiter','blobs','decorations'],2))
            this.output.adjust.leftward(this.output.queue[j]);
            //print("OUTPUT[3]: "+JSON.stringify(this.output.queue[j],['strings','prefix','suffix','delimiter','blobs','decorations'],2))
            this.output.adjust.downward(this.output.queue[j]);
            //print("OUTPUT[2]: "+JSON.stringify(this.output.queue[j],['strings','prefix','suffix','delimiter','blobs','decorations'],2))
            this.tmp.last_chr = this.output.adjust.fix(this.output.queue[j]);
            //print("OUTPUT[1]: "+JSON.stringify(this.output.queue[j],['strings','prefix','suffix','delimiter','blobs','decorations','num'],2))
        }
    }
    //print("this.tmp.last_chr="+this.tmp.last_chr);
    for (pos = 0, len = myblobs.length; pos < len; pos += 1) {
        var buffer = [];
        this.output.queue = [myblobs[pos]];
        this.tmp.suppress_decorations = myparams[pos].suppress_decorations;
        this.tmp.splice_delimiter = myparams[pos].splice_delimiter;
        //
        // oh, one last second thought on delimiters ...
        //

        if (myblobs[pos].parallel_delimiter) {
            this.tmp.splice_delimiter = myblobs[pos].parallel_delimiter;
        }
        this.tmp.have_collapsed = myparams[pos].have_collapsed;

        composite = this.output.string(this, this.output.queue);

       
        this.tmp.suppress_decorations = false;
        // meaningless assignment
        // this.tmp.handle_ranges = false;
        if ("string" === typeof composite) {
            this.tmp.suppress_decorations = false;
            return composite;
        }
        if ("object" === typeof composite && composite.length === 0 && !item["suppress-author"]) {
            if (this.tmp.has_purged_parallel) {
                composite.push("");
            } else {
                var errStr = "[CSL STYLE ERROR: reference with no printed form.]";
                var preStr = pos === 0 ? txt_esc(this.citation.opt.layout_prefix) : "";
                var sufStr = pos === (myblobs.length - 1) ? txt_esc(this.citation.opt.layout_suffix) : "";
                composite.push(preStr + errStr + sufStr);
            }
        }
        if (buffer.length && "string" === typeof composite[0]) {
            composite.reverse();
            var tmpstr = composite.pop();
            if (tmpstr && tmpstr.slice(0, 1) === ",") {
                buffer.push(tmpstr);
            } else if ("string" == typeof buffer.slice(-1)[0] && buffer.slice(-1)[0].slice(-1) === ",") {
                buffer.push(" " + tmpstr);
            } else if (tmpstr) {
                buffer.push(txt_esc(this.tmp.splice_delimiter) + tmpstr);
            }
        } else {
            composite.reverse();
            compie = composite.pop();
            if ("undefined" !== typeof compie) {
                if (buffer.length && "string" === typeof buffer[buffer.length - 1]) {
                    buffer[buffer.length - 1] += compie.successor_prefix;
                }
                buffer.push(compie);
            }
        }
        // Seems odd, but this was unnecessary and broken.
        //composite.reverse();
        llen = composite.length;
        for (ppos = 0; ppos < llen; ppos += 1) {
            obj = composite[ppos];
            if ("string" === typeof obj) {
                buffer.push(txt_esc(this.tmp.splice_delimiter) + obj);
                continue;
            }
            compie = composite.pop();
            if ("undefined" !== typeof compie) {
                buffer.push(compie);
            }
        }
        if (buffer.length > 1 && typeof buffer[0] !== "string") {
            buffer = [this.output.renderBlobs(buffer)];
        }
        if (buffer.length) {
            if ("string" === typeof buffer[0]) {
                if (pos > 0) {
                    // Awful. Should probably just not be using this.tmp.splice_delimiter at all.
                    //print(JSON.stringify(myparams[pos-1], null, 2));
                    //print(JSON.stringify(myparams[pos], null, 2));
                    if (((myblobs.length-1) > pos && myparams[pos+1].have_collapsed) && !myparams[pos].have_collapsed) {
                        //print(JSON.stringify(myparams[pos+1], null, 2));
                        this.tmp.splice_delimiter = myparams[pos-1].splice_delimiter;
                    }
                    //print("pos="+pos)
                    //print("objects.length="+objects.length)
                    //print("myblobs.length="+myblobs.length)
                    //buffer[0] = myparams[pos-1].splice_delimiter + buffer[0];
                    buffer[0] = txt_esc(this.tmp.splice_delimiter) + buffer[0];
                }
            } else {
                if (pos > 0) {
                    buffer[0].splice_prefix = this.tmp.splice_delimiter;
                } else {
                    buffer[0].splice_prefix = "";
                }
            }
        }
        objects = objects.concat(buffer);
    }
    // print("OBJECTS="+objects);
    result += this.output.renderBlobs(objects);

    if (result) {
        //if (CSL.TERMINAL_PUNCTUATION.indexOf(this.tmp.last_chr) > -1 
        //    && this.tmp.last_chr === use_layout_suffix.slice(0, 1)) {
        //    use_layout_suffix = use_layout_suffix.slice(1);
        //}
        if (!this.tmp.suppress_decorations) {
            len = this.citation.opt.layout_decorations.length;
            for (pos = 0; pos < len; pos += 1) {
                params = this.citation.opt.layout_decorations[pos];
                // The "normal" formats in some output modes expect
                // a superior nested decoration environment, and
                // so should produce no output here.
                if (params[1] === "normal") {
                    continue;
                }
                if (!item || !item["author-only"]) {
                    result = this.fun.decorate[params[0]][params[1]](this, result);
                }
            }
        }
        //result = "\u202b" + result + "\u202c";
    }
    this.tmp.suppress_decorations = false;
    return result;
};

/*
 * Render a single cite item.
 *
 * This is called on the state object, with a single
 * Item as input.  It iterates exactly once over the style
 * citation tokens, and leaves the result of rendering in
 * the top-level list in the relevant *.opt.output
 * stack, as a list item consisting of a single string.
 *
 * (This is dual-purposed for generating individual
 * entries in a bibliography.)
 */
CSL.getCite = function (Item, item, prevItemID, blockShadowNumberReset) {
    var next, error_object;
    this.tmp.cite_renders_content = false;
    this.parallel.StartCite(Item, item, prevItemID);
    CSL.citeStart.call(this, Item, item, blockShadowNumberReset);
    next = 0;
    this.tmp.name_node = {};
    this.nameOutput = new CSL.NameOutput(this, Item, item);

    // rerun?
    while (next < this[this.tmp.area].tokens.length) {
        next = CSL.tokenExec.call(this, this[this.tmp.area].tokens[next], Item, item);
    }

    CSL.citeEnd.call(this, Item, item);
    this.parallel.CloseCite(this);
    // Odd place for this, but it seems to fit here
    if (!this.tmp.cite_renders_content && !this.tmp.just_looking) {
        if (this.tmp.area === "bibliography") {
            error_object = {
                index: this.tmp.bibliography_pos,
                itemID: "" + Item.id,
                error_code: CSL.ERROR_NO_RENDERED_FORM
            };
            this.tmp.bibliography_errors.push(error_object);
        }
    }
    return "" + Item.id;
};


CSL.citeStart = function (Item, item, blockShadowNumberReset) {
    if (!blockShadowNumberReset) {
        this.tmp.shadow_numbers = {};
    }
    this.tmp.disambiguate_count = 0;
    this.tmp.disambiguate_maxMax = 0;
    this.tmp.same_author_as_previous_cite = false;
    if (!this.tmp.suppress_decorations) {
        this.tmp.subsequent_author_substitute_ok = true;
    } else {
        this.tmp.subsequent_author_substitute_ok = false;
    }
    this.tmp.lastchr = "";
    if (this.tmp.area === "citation" && this.citation.opt.collapse && this.citation.opt.collapse.length) {
        this.tmp.have_collapsed = true;
    } else {
        this.tmp.have_collapsed = false;
    }
    this.tmp.render_seen = false;
    if (this.tmp.disambig_request  && ! this.tmp.disambig_override) {
        this.tmp.disambig_settings = this.tmp.disambig_request;
    } else if (this.registry.registry[Item.id] && ! this.tmp.disambig_override) {
        this.tmp.disambig_request = this.registry.registry[Item.id].disambig;
        this.tmp.disambig_settings = this.registry.registry[Item.id].disambig;
    } else {
        this.tmp.disambig_settings = new CSL.AmbigConfig();
    }
    if (this.tmp.area !== 'citation') {
        if (!this.registry.registry[Item.id]) {
            this.tmp.disambig_restore = new CSL.AmbigConfig();
        } else {
            this.tmp.disambig_restore = CSL.cloneAmbigConfig(this.registry.registry[Item.id].disambig);
            if (this.tmp.area === 'bibliography' && this.tmp.disambig_settings && this.tmp.disambig_override) {
                if (this.opt["disambiguate-add-names"]) {
                    this.tmp.disambig_settings.names = this.registry.registry[Item.id].disambig.names.slice();
                    if (typeof this.tmp.disambig_request === 'object') {
                        this.tmp.disambig_request.names = this.registry.registry[Item.id].disambig.names.slice();
                    }
                }
                if (this.opt["disambiguate-add-givenname"]) {
                    // This is weird and delicate and not fully understood
                    this.tmp.disambig_request = this.tmp.disambig_settings;
                    this.tmp.disambig_settings.givens = this.registry.registry[Item.id].disambig.givens.slice();
                    this.tmp.disambig_request.givens = this.registry.registry[Item.id].disambig.givens.slice();
                    var i, ilen;
                    for (i=0,ilen=this.tmp.disambig_settings.givens.length;i<ilen;i+=1) {
                        this.tmp.disambig_settings.givens[i] = this.registry.registry[Item.id].disambig.givens[i].slice();
                    }
                    for (i=0,ilen=this.tmp.disambig_request.givens.length;i<ilen;i+=1) {
                        this.tmp.disambig_request.givens[i] = this.registry.registry[Item.id].disambig.givens[i].slice();
                    }
                }
            }
        }
    }
    this.tmp.names_used = [];
    this.tmp.nameset_counter = 0;
    this.tmp.years_used = [];
    this.tmp.names_max.clear();

    this.tmp.splice_delimiter = this[this.tmp.area].opt.layout_delimiter;
    //this.tmp.splice_delimiter = this[this.tmp.area].opt.delimiter;

    this.bibliography_sort.keys = [];
    this.citation_sort.keys = [];

    this.tmp.has_done_year_suffix = false;
    this.tmp.last_cite_locale = false;
    // SAVE PARAMETERS HERE, IF APPROPRIATE
    // (promiscuous addition of global parameters => death by a thousand cuts)
    if (!this.tmp.just_looking && item && !item.position && this.registry.registry[Item.id]) {
        this.tmp.disambig_restore = CSL.cloneAmbigConfig(this.registry.registry[Item.id].disambig);
    }
    // XXX This only applied to the "number" variable itself? Huh?
    //this.setNumberLabels(Item);
    this.tmp.first_name_string = false;
    this.tmp.authority_stop_last = 0;

};

CSL.citeEnd = function (Item, item) {
    // RESTORE PARAMETERS IF APPROPRIATE
    if (this.tmp.disambig_restore) {
        this.registry.registry[Item.id].disambig.names = this.tmp.disambig_restore.names.slice();
        this.registry.registry[Item.id].disambig.givens = this.tmp.disambig_restore.givens.slice();
        for (var i=0,ilen=this.registry.registry[Item.id].disambig.givens.length;i<ilen;i+=1) {
            this.registry.registry[Item.id].disambig.givens[i] = this.tmp.disambig_restore.givens[i].slice();
        }
    }
    this.tmp.disambig_restore = false;

    if (item && item.suffix) {
        //this.tmp.last_suffix_used = this.tmp.suffix.value();
        this.tmp.last_suffix_used = item.suffix;
    } else {
        this.tmp.last_suffix_used = "";
    }
    this.tmp.last_years_used = this.tmp.years_used.slice();
    this.tmp.last_names_used = this.tmp.names_used.slice();
    this.tmp.cut_var = false;

    // This is a hack, in a way; I have lost track of where
    // the disambig (name rendering) settings used for rendering work their way
    // into the registry.  This resets defaults to the subsequent form,
    // when first cites are rendered.
    //if (this.tmp.disambig_restore && this.registry.registry[Item.id]) {
    //    this.registry.registry[Item.id].disambig = this.tmp.disambig_restore;
    //}
    //this.tmp.disambig_restore = false;
    this.tmp.disambig_request = false;

    this.tmp.cite_locales.push(this.tmp.last_cite_locale);

    if (this.tmp.issued_date && this.tmp.renders_collection_number) {
        var buf = [];
        for (i = this.tmp.issued_date.list.length - 1; i > this.tmp.issued_date.pos; i += -1) {
            buf.push(this.tmp.issued_date.list.pop());
        }
        // Throw away the unwanted blob
        this.tmp.issued_date.list.pop();
        // Put the other stuff back
        for (i = buf.length - 1; i > -1; i += -1) {
            this.tmp.issued_date.list.push(buf.pop());
        }
        // Notice the deletion to parallels machinery
        if (this.parallel.use_parallels) {
            this.parallel.cite["issued"] = false;
        }
    }
    this.tmp.issued_date = false;
    this.tmp.renders_collection_number = false;

};
