CSL.Engine.prototype.rebuildProcessorState = function (citations, mode, uncitedItemIDs) {
    // Rebuilds the processor from scratch, based on a list of citation
    // objects. In a dynamic application, once the internal state of processor
    // is established, citations should edited with individual invocations
    // of processCitationCluster().

    // citations is a list of citation objects in document order.
    // mode is one of "html", "text" or "rtf".
    // uncitedItemIDs is a list of itemIDs or a JS object with itemIDs as keys.
    // Returns a list of [citationID,noteIndex,string] triples in document order.
    // Set citation.properties.noteIndex to 0 for in-text citations.
    // It is not necessary to run updateItems() before this function.
    if (!citations) {
        citations = [];
    }
    if (!mode) {
        mode = 'html';
    }
    var doneIDs = {};
    var itemIDs = [];
    for (var i=0,ilen=citations.length;i<ilen;i+=1) {
        for (var j=0,jlen=citations[i].citationItems.length;j<jlen;j+=1) {
            var itemID = "" + citations[i].citationItems[j].id;
            if (!doneIDs[itemID]) {
                itemIDs.push(itemID);
            }
            doneIDs[itemID] = true;
        }
    }
    this.updateItems(itemIDs);
    var pre = [];
    var post = [];
    var ret = [];
    var oldMode = this.opt.mode;
    this.setOutputFormat(mode);
    for (var i=0,ilen=citations.length;i<ilen;i+=1) {
        // res contains a result report and a list of [index,string] pairs
        // index begins at 0
        var res = this.processCitationCluster(citations[i],pre,post,CSL.ASSUME_ALL_ITEMS_REGISTERED);
        pre.push([citations[i].citationID,citations[i].properties.noteIndex]);
        for (var j=0,jlen=res[1].length;j<jlen;j+=1) {
            var index = res[1][j][0];
            ret[index] = [
                pre[index][0],
                pre[index][1],
                res[1][j][1]
            ];
        }
    }
    this.updateUncitedItems(uncitedItemIDs);
    this.setOutputFormat(oldMode);
    return ret;
};


CSL.Engine.prototype.restoreProcessorState = function (citations) {
    var i, ilen, j, jlen, item, Item, newitem, citationList, itemList, sortedItems;
    
    // This function is deprecated.
    // Use rebuildProcessorState() instead.

    // Quickly restore state from citation details retained by
    // calling application.
    //
    // if citations are provided, position details and sortkeys 
    // on the citation objects are are assumed to be correct.  Item
    // data is retrieved, and sortedItems arrays are created and
    // sorted as required by the current style.
    //
    // If citations is an empty list or nil, reset processor to
    // empty state.
    citationList = [];
    itemList = [];
    if (!citations) {
        citations = [];
    }
    // Adjust citationIDs to avoid duplicates, save off index numbers
    var indexNumbers = [];
    var citationIds = {};
    for (i = 0, ilen = citations.length; i < ilen; i += 1) {
        if (citationIds[citations[i].citationID]) {
            this.setCitationId(citations[i], true);
        }
        citationIds[citations[i].citationID] = true;
        indexNumbers.push(citations[i].properties.index);
    }
    // Slice citations and sort by their declared index positions, if any,
    // then reassign index and noteIndex numbers.
    var oldCitations = citations.slice();
    oldCitations.sort(
        function (a,b) {
            if (a.properties.index < b.properties.index) {
                return -1;
            } else if (a.properties.index > b.properties.index) {
                return 1;
            } else {
                return 0;
            }
        }
    );
    for (i = 0, ilen = oldCitations.length; i < ilen; i += 1) {
        oldCitations[i].properties.index = i;
    }
    for (i = 0, ilen = oldCitations.length; i < ilen; i += 1) {
        sortedItems = [];
        for (j = 0, jlen = oldCitations[i].citationItems.length; j < jlen; j += 1) {
            item = oldCitations[i].citationItems[j];
            if ("undefined" === typeof item.sortkeys) {
                item.sortkeys = [];
            }
            Item = this.retrieveItem("" + item.id);
            // Parse the locator as processCitationCluster() does, on a copy: the first
            // citation is parsed again below, and remapping a legal section twice doubles it.
            item = CSL.parseLocator.call(this, Object.assign({}, item));
            if (this.opt.development_extensions.consolidate_legal_items) {
                this.remapSectionVariable([[Item,item]]);
            }
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
            newitem = [Item, item];
            sortedItems.push(newitem);
            oldCitations[i].citationItems[j].item = Item;
        }
        if (!oldCitations[i].properties.unsorted) {
            sortedItems.sort(this.citation.srt.compareCompositeKeys);
        }
        oldCitations[i].sortedItems = sortedItems;
        // Save citation data in registry
        this.registry.citationreg.citationById[oldCitations[i].citationID] = oldCitations[i];
    }
    // Index citations by item before registering items, as processCitationCluster()
    // does: first-reference-note-number and by-cite disambiguation read this index.
    this.registry.citationreg.citationsByItemId = {};
    for (i = 0, ilen = oldCitations.length; i < ilen; i += 1) {
        for (j = 0, jlen = oldCitations[i].citationItems.length; j < jlen; j += 1) {
            item = oldCitations[i].citationItems[j];
            if (!this.registry.citationreg.citationsByItemId[item.id]) {
                this.registry.citationreg.citationsByItemId[item.id] = [];
                itemList.push("" + item.id);
            }
            this.registry.citationreg.citationsByItemId[item.id].push(oldCitations[i]);
        }
    }
    // Register Items
    this.updateItems(itemList);
    // Sort cites on their real sort keys before positions are set, as
    // processCitationCluster() does; the sort above ran on empty keys.
    if (!this.opt.citation_number_sort && this.citation_sort.tokens.length > 0) {
        for (i = 0, ilen = oldCitations.length; i < ilen; i += 1) {
            if (oldCitations[i].sortedItems.length > 1 && !oldCitations[i].properties.unsorted) {
                for (j = 0, jlen = oldCitations[i].sortedItems.length; j < jlen; j += 1) {
                    oldCitations[i].sortedItems[j][1].sortkeys = CSL.getSortKeys.call(this, oldCitations[i].sortedItems[j][0], "citation_sort");
                }
                oldCitations[i].sortedItems.sort(this.citation.srt.compareCompositeKeys);
            }
        }
    }

    // Construct citationList from original copy
    for (i = 0, ilen = citations.length; i < ilen; i += 1) {
        citationList.push(["" + citations[i].citationID, citations[i].properties.noteIndex]);
    }

    var ret = [];
    if (citations && citations.length) {
        // Rendering one citation restores remainder of processor state.
        // If citations is empty, rest to empty state.
        ret = this.processCitationCluster(citations[0], [], citationList.slice(1));
    } else {
        this.registry = new CSL.Registry(this);
        this.tmp = new CSL.Engine.Tmp();
        this.disambiguate = new CSL.Disambiguation(this);
    }
    return ret;
};


CSL.Engine.prototype.updateItems = function (idList, nosort, rerun_ambigs, implicitUpdate) {
    var debug = false;
    var oldArea = this.tmp.area;
    var oldRoot = this.tmp.root;
    var oldExtension = this.tmp.extension;
    if (this.bibliography_sort.tokens.length === 0) {
        nosort = true;
    }
    this.tmp.area = "citation";
    this.tmp.root = "citation";
    this.tmp.extension = "";
    if (!implicitUpdate) {
        this.tmp.loadedItemIDs = {};
    }
    //CSL.debug = print
    //SNIP-START
    if (debug) {
        CSL.debug("--> init <--");
    }
    //SNIP-END
    this.registry.init(idList);

	if (rerun_ambigs) {
		for (var ambig in this.registry.ambigcites) {
			this.registry.ambigsTouched[ambig] = true;
		}
	}

    this.registry.dodeletes(this.registry.myhash);
    
    this.registry.doinserts(this.registry.mylist);
    
    this.registry.dorefreshes();

    // *** affects reflist
    this.registry.rebuildlist(nosort);
    
    this.registry.setsortkeys();

    // taints always
    this.registry.setdisambigs();

    // *** affects reflist
    this.registry.sorttokens(nosort);

    // *** affects reflist
    // taints if numbered style
    this.registry.renumber();
    
    // taints always
    //this.registry.yearsuffix();

    this.tmp.extension = oldExtension;
    this.tmp.area = oldArea;
    this.tmp.root = oldRoot;

    return this.registry.getSortedIds();
};

CSL.Engine.prototype.updateUncitedItems = function (idList, nosort) {
    var idHash;
    var oldArea = this.tmp.area;
    var oldRoot = this.tmp.root;
    var oldExtension = this.tmp.extension;
    if (this.bibliography_sort.tokens.length === 0) {
        nosort = true;
    }
    this.tmp.area = "citation";
    this.tmp.root = "citation";
    this.tmp.extension = "";
    this.tmp.loadedItemIDs = {};
    // This should be a utility function
    if (!idList) {
        idList = [];
    }
    if ("object" == typeof idList) {
        if ("undefined" == typeof idList.length) {
            idHash = idList;
            idList = [];
            for (var key in idHash) {
                idList.push(key);
            }
        } else if ("number" == typeof idList.length) {
            idHash = {};
            for (var i=0,ilen=idList.length;i<ilen;i+=1) {
                idHash[idList[i]] = true;
            }
        }
    }

    // prepare extended list of items
    this.registry.init(idList, true);

    // Use purge instead of delete.
    // this.registry.dodeletes(this.registry.myhash);
    this.registry.dopurge(idHash);

    // everything else is the same as updateItems()
    this.registry.doinserts(this.registry.mylist);

    this.registry.dorefreshes();

    this.registry.rebuildlist(nosort);

    this.registry.setsortkeys();

    this.registry.setdisambigs();

    this.registry.sorttokens(nosort);

    this.registry.renumber();

    this.tmp.extension = oldExtension;
    this.tmp.area = oldArea;
    this.tmp.root = oldRoot;

    return this.registry.getSortedIds();
};
