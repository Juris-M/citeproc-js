//
// XXXXX: note to self, the parallels machinery should be completely
// disabled when sorting of citations is requested.
//
//
// XXXXX: also mark the entry as "parallel" on the citation
// object.
//
//
// XXXXX: thinking forward a bit, we're going to need a means
// of snooping and mangling delimiters.  Inter-cite delimiters
// can be easily applied; it's just a matter of adjusting
// this.tmp.splice_delimiter (?) on the list of attribute
// bundles after a cite or set of cites is completed.
// That happens in cmd_cite.js.  We also need to do two
// things: (1) assure that volume, number, journal and
// page are contiguous within the cite, with no intervening
// rendered variables [done]; and (2) strip affixes to the series,
// so that the sole splice string is the delimiter.  This
// latter will need a walk of the output tree, but it's
// doable.
//
// The advantage of doing things this way is that
// the parallels machinery is encapsulated in a set of
// separate functions that do not interact with cite
// composition.
//

/*global CSL: true */

/**
 * Initializes the parallel cite tracking arrays
 */
CSL.Parallel = function (state) {
    this.state = state;
    this.sets = new CSL.Stack([]);
    this.try_cite = true;
    this.use_parallels = false;

    this.midVars = ["section", "volume", "container-title", "collection-number", "issue", "page-first", "page", "number"];
    this.ignoreVarsLawGeneral = ["first-reference-note-number", "locator", "label","page-first","page","genre"];
    this.ignoreVarsLawProceduralHistory = ["issued", "first-reference-note-number", "locator", "label","page-first","page","genre","jurisdiction"];
    this.ignoreVarsOrders = ["first-reference-note-number"];
    this.ignoreVarsOther = ["first-reference-note-number", "locator", "label","section","page-first","page"];
};

CSL.Parallel.prototype.isMid = function (variable) {
    //return ["names", "section", "volume", "container-title", "issue", "page", "page-first", "locator"].indexOf(variable) > -1;
    //return ["section", "volume", "container-title", "issue", "page", "page-first", "locator"].indexOf(variable) > -1;
    return (this.midVars.indexOf(variable) > -1);
};

CSL.Parallel.prototype.StartCitation = function (sortedItems, out) {
    this.parallel_conditional_blobs_list = [];
    if (this.use_parallels) {
        this.sortedItems = sortedItems;
        this.sortedItemsPos = -1;
        this.sets.clear();
        this.sets.push([]);
        this.in_series = true;
        this.delim_counter = 0;
        this.delim_pointers = [];
        if (out) {
            this.out = out;
        } else {
            this.out = this.state.output.queue;
        }
        // ZZZ hold this in reserve
        //this.master_has_rendered_short_element = false;
        this.master_was_neutral_cite = true;
    }
};

/**
 * Sets up an empty variables tracking object.
 *
 */
CSL.Parallel.prototype.StartCite = function (Item, item, prevItemID) {
    var position, len, pos, curr, master, last_id, prev_locator, curr_locator, i, ilen;
    if (this.use_parallels) {
        if (this.sets.value().length && this.sets.value()[0].itemId == Item.id) {
            this.ComposeSet();
        }
        this.sortedItemsPos += 1;
        if (item) {
            position = item.position;
        }
        //
        // Parallel items are tracked in the registry
        // against each reference item, on first references
        // only.  The parallel value is the ID of the reference
        // item first in the list of parallels, otherwise it
        // is false.
        //
        this.try_cite = true;
        var has_required_var = false;
        for (i = 0, ilen = CSL.PARALLEL_MATCH_VARS.length; i < ilen; i += 1) {
            if (Item[CSL.PARALLEL_MATCH_VARS[i]]) {
                has_required_var = true;
                break;
            }
        }
        var basics_ok = true;
        var last_cite = this.sets.value().slice(-1)[0];
        if (last_cite && last_cite.Item) {
            var lastJuris = last_cite.Item.jurisdiction ? last_cite.Item.jurisdiction.split(":")[0] : "";
            var thisJuris = Item.jurisdiction ? Item.jurisdiction.split(":")[0] : "";
            if (last_cite.Item.title !== Item.title) {
                basics_ok = false;
        //    str = str.split(';')[0];
            } else if (lastJuris !== thisJuris) {
                basics_ok = false;
            } else if (last_cite.Item.type !== Item.type) {
                basics_ok = false;
            } else if (["article-journal","article-magazine"].indexOf(Item.type) > -1) {
                if (!this.state.opt.development_extensions.handle_parallel_articles
                   || last_cite.Item["container-title"] !== Item["container-title"]) {
                 
                    basics_ok = false;
                }
            }
        }

        if (!basics_ok || !has_required_var || CSL.PARALLEL_TYPES.indexOf(Item.type) === -1) {
            // ZZZ set true for testing initially, but setting this true
            // always seems to be safe, at least judging from current tests.
            this.try_cite = true;
            if (this.in_series) {
                // clean list is pushed to stack later.  this.sets.push([]);
                //print("   IN SERIES FALSE (4)");
                this.in_series = false;
            }
        }
        this.cite = {};
        this.cite.front = [];
        this.cite.mid = [];
        this.cite.back = [];
        this.cite.front_collapse = {};
        this.cite.back_forceme = [];
        this.cite.position = position;
        this.cite.Item = Item;
        this.cite.itemId = "" + Item.id;
        this.cite.prevItemID = "" + prevItemID;
        this.target = "front";

        if (["treaty"].indexOf(Item.type) > -1) {
            this.ignoreVars = this.ignoreVarsOrders;
        } else if (["article-journal","article-magazine"].indexOf(Item.type) > -1) {
            this.ignoreVars = this.ignoreVarsOther;
        } else if (item && item.prefix) {
            // This prevents suppression of trailing matter in 
            // procedural history strings. Without this, trailing matter
            // on all but the last cite is suppressed.
            this.ignoreVars = this.ignoreVarsLawProceduralHistory;
            this.cite.useProceduralHistory = true;
            var prev = this.sets.value()[(this.sets.value().length - 1)];
            if (prev && prev.back) {
                for (i=prev.back.length-1;i>-1;i+=-1) {
                    if (prev.back[i] && prev[prev.back[i]]) {
                        delete prev[prev.back[i]];
                    }
                }
            }
        } else {
            this.ignoreVars = this.ignoreVarsLawGeneral;
        }
        //
        // Reevaluate position of this cite, if it follows another, in case it
        // is a lurking ibid reference.
        //
        if (this.sortedItems && this.sortedItemsPos > 0 && this.sortedItemsPos < this.sortedItems.length) {
            // This works, and I am absolutely certain that I have
            // no idea how or why.
            curr = this.sortedItems[this.sortedItemsPos][1];
            last_id = "" + this.sortedItems[(this.sortedItemsPos - 1)][1].id;
            master = this.state.registry.registry[last_id].parallel;
            prev_locator = false;
            if (master == curr.id) {
                len = this.sortedItemsPos - 1;
                for (pos = len; pos > -1; pos += -1) {
                    if (this.sortedItems[pos][1].id == Item.id) {
                        prev_locator = this.sortedItems[pos][1].locator;
                        break;
                    }
                }
                curr_locator = this.sortedItems[this.sortedItemsPos][1].locator;
                if (!prev_locator && curr_locator) {
                    curr.position = CSL.POSITION_IBID_WITH_LOCATOR;
                } else if (curr_locator === prev_locator) {
                    curr.position = CSL.POSITION_IBID;
                    //**print("setting IBID in util_parallel");
                    //**print(" === "+this.sets.value().length);
                } else {
                    curr.position = CSL.POSITION_IBID_WITH_LOCATOR;
                }
            }
        } else if (this.state.registry.registry[Item.id]) {
            this.state.registry.registry[Item.id].parallel = false;
        } else {
            this.try_cite = false;
            this.force_collapse = false;
            return;
        }
        this.force_collapse = false;
        if (this.state.registry.registry[Item.id].parallel) {
            this.force_collapse = true;
        }
    }
};

/**
 * Initializes scratch object and variable name string
 * for tracking a single variable.
 */
CSL.Parallel.prototype.StartVariable = function (variable, real_variable) {
    if (this.use_parallels && (this.try_cite || this.force_collapse)) {
        if (variable === "names") {
            this.variable = variable + ":" + this.target;
        } else {
            this.variable = variable;
        }

        if (this.ignoreVars.indexOf(variable) > -1) {
            return;
        }
        if (variable === "container-title" && this.sets.value().length === 0) {
            this.master_was_neutral_cite = false;
        }
        this.data = {};
        this.data.value = "";
        this.data.blobs = [];
        var is_mid = this.isMid(variable);
        // Something serious will need to be done about parallel references at some point.
        // This entire module is a wilderness.
        if (real_variable === "authority" && this.variable === "names:front" && this.sets.value().length) {
            var prev = this.sets.value()[(this.sets.value().length - 1)].Item;
            var thisAuthority = false;
            if (this.cite.Item.authority && this.cite.Item.authority.length) {
                thisAuthority = this.cite.Item.authority[0].literal;
            }
            var thatAuthority = false;
            if (prev.authority && prev.authority.length) {
                thatAuthority = prev.authority[0].literal;
            }
            if (thisAuthority !== thatAuthority) {
                this.try_cite = true;
                this.in_series = false;
            }
         } else if (this.target === "front" && is_mid) {
            //print("  front-to-mid: "+variable);
            this.target = "mid";
        } else if (this.target === "mid" && !is_mid && this.cite.Item.title && variable !== "names") {
            //print("  mid-to-back: "+variable);
            this.target = "back";
        } else if (this.target === "back" && is_mid) {
            //print("  back-to-mid: "+variable);
            this.try_cite = true;
            //print("   IN SERIES FALSE (3)");
            this.in_series = false;
        }

        //print("area=" + this.state.tmp.area + ", variable=" + variable+", target="+this.target);
        // Exception for docket number.  Necessary for some
        // civil law cites (France), which put the docket number
        // at the end of the first of a series of references.
        if (variable === "number") {
            this.cite.front.push(this.variable);
        } else if (CSL.PARALLEL_COLLAPSING_MID_VARSET.indexOf(variable) > -1) {
            if (["article-journal","article-magazine"].indexOf(this.cite.Item.type) > -1) {
                this.cite.mid.push(this.variable);
            } else {
                // This looks like it should be mid also, but changing it breaks French case/commentary parallels. Not sure why.
                this.cite.front.push(this.variable);
            }
        } else {
            this.cite[this.target].push(this.variable);
        }
   }
};

/**
 * Adds a blob to the the scratch object.  Invoked through
 * state.output.append().  The pointer is used to snip
 * the target blob out of the output queue if appropriate,
 * after parallels detection is complete.
 */
CSL.Parallel.prototype.AppendBlobPointer = function (blob) {
    if (this.use_parallels) {
        if (this.ignoreVars.indexOf(this.variable) > -1) {
            return;
        }
        if (this.use_parallels && (this.force_collapse || this.try_cite)) {
            if (["article-journal", "article-magazine"].indexOf(this.cite.Item.type) > -1) {
                if (["volume","page","page-first","issue"].indexOf(this.variable) > -1) {
                    return;
                }
                if ("container-title" === this.variable && this.cite.mid.length > 1) {
                    return;
                }
            }
            if (this.variable && (this.try_cite || this.force_collapse) && blob && blob.blobs) {
                if (!(this.cite.useProceduralHistory && this.target === "back")) {
                    this.data.blobs.push([blob, blob.blobs.length]);
                }
            }
        }
    }
};

/**
 * Adds string data to the current variable
 * in the variables tracking object.
 */
CSL.Parallel.prototype.AppendToVariable = function (str) {
    if (this.use_parallels) {
        if (this.ignoreVars.indexOf(this.variable) > -1) {
            return;
        }
        //if (str && varname === "jurisdiction") {
        //    str = str.split(';')[0];
        //}
        if (this.try_cite || this.force_collapse) {
            this.data.value += "::" + str;
            // FIXME: constant condition. Else never runs. Probably a bug.
            // if (this.target !== "back" || true) {
            //     //zcite.debug("  setting: "+str);
            //     this.data.value += "::" + str;
            // } else {
            //     var prev = this.sets.value()[(this.sets.value().length - 1)];
            //     if (prev) {
            //         if (prev[this.variable]) {
            //             if (prev[this.variable].value) {
            //                 //**print("append var "+this.variable+" as value "+this.data.value);
            //                 this.data.value += "::" + str;
            //             }
            //         }
            //     }
            // }
        }
    }
};

/**
 * Merges scratch object to the current cite object.
 * Checks variable content, and possibly deletes the
 * variables tracking object to abandon parallel cite processing
 * for this cite.  [??? careful with the logic here, current
 * item can't necessarily be discarded; it might be the first
 * member of an upcoming sequence ???]
 */
CSL.Parallel.prototype.CloseVariable = function () {
    if (this.use_parallels) {
        if (this.ignoreVars.indexOf(this.variable) > -1) {
            return;
        }
        if (this.try_cite || this.force_collapse) {
            this.cite[this.variable] = this.data;
            if (this.sets.value().length > 0) {
                var prev = this.sets.value()[(this.sets.value().length - 1)];
                if (this.target === "front" && this.variable === "issued") {
                    // REMAINING PROBLEM: this works for English-style cites, but not
                    // for the French. Only difference is date-parts (year versus year-month-day).
                    // See code at the bottom of CloseCite() for the other half of this workaround.
                    //if (this.data.value && this.data.value.match(/^::[[0-9]{4}$/)) {
                    if (this.data.value && this.master_was_neutral_cite) {
                        this.target = "mid";
                        //this.cite.front.pop();
                    }
                }
                if (this.target === "front") {
                    if ((prev[this.variable] || this.data.value) && (!prev[this.variable] || this.data.value !== prev[this.variable].value)) {
                        // evaluation takes place later, at close of cite.
                        //this.try_cite = true;
                        // Ignore differences in issued
                        if ("issued" !== this.variable) {
                            this.in_series = false;
                        }
                    }
                } else if (this.target === "mid") {
                    // How to set label and locator for suppression only if
                    // BOTH match? First, push what ya got by pushing both
                    // in below ... ? No, that didn't work.
                    if (CSL.PARALLEL_COLLAPSING_MID_VARSET.indexOf(this.variable) > -1) {
                        if (prev[this.variable]) {
                            if (prev[this.variable].value === this.data.value) {
                                this.cite.front_collapse[this.variable] = true;
                            } else {
                                this.cite.front_collapse[this.variable] = false;
                            }
                        } else {
                            this.cite.front_collapse[this.variable] = false;
                        }
                    }
                } else if (this.target === "back") {
                    if (prev[this.variable]) {
                        if (this.data.value !== prev[this.variable].value 
                            && this.sets.value().slice(-1)[0].back_forceme.indexOf(this.variable) === -1) {
                            //print(this.variable);
                            //print(this.sets.value().slice(-1)[0].back_forceme);
                            // evaluation takes place later, at close of cite.
                            //this.try_cite = true;
                            //**print("-------------- reset --------------");
                            //print("  breaking series");
                            //print("   IN SERIES FALSE (1)");
                            this.in_series = false;
                        }
                    }
                }
            }
        }
        this.variable = false;
    }
};

/**
 * Merges current cite object to the
 * tracking array, and evaluate maybe.
 */
CSL.Parallel.prototype.CloseCite = function () {
    var x, pos, len, use_journal_info, volume_pos, container_title_pos, collection_number_pos, section_pos, has_date;
    if (this.use_parallels && (this.force_collapse || this.try_cite)) {
        use_journal_info = false;
        if (!this.cite.front_collapse["container-title"]) {
            use_journal_info = true;
        }
        if (this.cite.front_collapse.volume === false) {
            use_journal_info = true;
        }
        if (this.cite.front_collapse["collection-number"] === false) {
            use_journal_info = true;
        }
        if (this.cite.front_collapse.section === false) {
            use_journal_info = true;
        }
        if (use_journal_info) {
            this.cite.use_journal_info = true;
            section_pos = this.cite.front.indexOf("section");
            if (section_pos > -1) {
                this.cite.front = this.cite.front.slice(0,section_pos).concat(this.cite.front.slice(section_pos + 1));
            }
            volume_pos = this.cite.front.indexOf("volume");
            if (volume_pos > -1) {
                this.cite.front = this.cite.front.slice(0,volume_pos).concat(this.cite.front.slice(volume_pos + 1));
            }
            container_title_pos = this.cite.front.indexOf("container-title");
            if (container_title_pos > -1) {
                this.cite.front = this.cite.front.slice(0,container_title_pos).concat(this.cite.front.slice(container_title_pos + 1));
            }
            collection_number_pos = this.cite.front.indexOf("collection-number");
            if (collection_number_pos > -1) {
                this.cite.front = this.cite.front.slice(0,collection_number_pos).concat(this.cite.front.slice(collection_number_pos + 1));
            }
        }
        if (!this.in_series && !this.force_collapse) {
            this.ComposeSet(true);
        }
        //**print("[pushing cite]");
        if (this.sets.value().length === 0) {
            has_date = false;
            for (pos = 0, len = this.cite.back.length; pos < len; pos += 1) {
                x = this.cite.back[pos];
                //**print("  ->issued="+this.cite.issued);
                //for (var x in this.cite.issued) {
                //    print("..."+x);
                //}
                if (x === "issued" && this.cite["issued"] && this.cite["issued"].value) {
                    //print("HAS ISSUED");
                    has_date = true;
                    break;
                }
            }
            if (!has_date) {
                //print("  setting issued in back_forceme variable culling list");
                this.cite.back_forceme.push("issued");
            }
        } else {
            //print("  renewing");

            // This condition works together with another at the top of CloseVariable()
            // that jumps to "mid" on "issued" only if the preceding cite was a neutral
            // one.
            //print("front: "+this.cite.front+", mid: "+this.cite.mid+", back: "+this.cite.back+", id: "+this.cite.itemId);
            var idx = this.cite.front.indexOf("issued");
            if (idx === -1 || this.master_was_neutral_cite) {
                this.cite.back_forceme = this.sets.value().slice(-1)[0].back_forceme;
            }
            if (idx > -1) {
                // If previous cite rendered the year, go ahead and collapse. Otherwise, don't.
                var prev = this.sets.value()[this.sets.value().length - 1];
                if (!prev["issued"]) {
                    this.cite.front = this.cite.front.slice(0, idx).concat(this.cite.front.slice(idx + 1));
                }
            }
            // This is a little bit aggressive, but quash all names:mid on cites
            // that follow a neutral cite.
            if (this.master_was_neutral_cite && this.cite.mid.indexOf("names:mid") > -1) {
                this.cite.front.push("names:mid");
            }
        }
        //print("WooHoo lengtsh fo sets value list: "+this.sets.mystack.length);
        this.sets.value().push(this.cite);
    //print("CloseCite");
    }
};

/**
 * Move variables tracking array into the array of
 * composed sets.
 */
CSL.Parallel.prototype.ComposeSet = function () {
    var cite, pos, len;
    if (this.use_parallels && (this.force_collapse || this.try_cite)) {
        // a bit loose here: zero-length sets relate to one cite,
        // apparently.
        var lengthCheck = this.sets.value().length;
        // Do stuff for false here
        if (this.sets.value().length === 1) {
            if (!this.in_series) {
                // Um ... probably shouldn't just throw this away. What if
                // two collapsed parallel citations appear in sequence? Hmm?
                this.sets.value().pop();
                this.delim_counter += 1;
            }
            // XXXXX: hackaround that could be used maybe, if nothing cleaner pans out.
            //
            //print(this.sets.mystack.slice(-2,-1)[0].slice(-1)[0].back_forceme);
            //**print(this.sets.mystack.slice(-2,-1)[0].slice(-1)[0].back_forceme);
            //this.sets.mystack.slice(-2,-1)[0].slice(-1)[0].back_forceme = [];
        } else {
            len = this.sets.value().length;
            for (pos = 0; pos < len; pos += 1) {
                cite = this.sets.value()[pos];
                if (pos === 0) {
                    this.delim_counter += 1;
                } else {
                    if (!cite.Item.title && cite.use_journal_info) {
                        this.delim_pointers.push(false);
                    } else {
                        this.delim_pointers.push(this.delim_counter);
                    }
                    this.delim_counter += 1;
                }

                if (CSL.POSITION_FIRST === cite.position) {
                    if (pos === 0) {
                        this.state.registry.registry[cite.itemId].master = true;
                        this.state.registry.registry[cite.itemId].siblings = [];
                        // This helps to handle rearrangement of citations, but it is
                        // not perfect by a long shot: a refresh is needed to pick
                        // up the new value and fix parallels. A hack to handle some
                        // common cases immediately is above at line 226.
                        this.state.registry.registry[cite.itemId].parallel = false;
                    } else {
                        if (cite.prevItemID) {
                            if (!this.state.registry.registry[cite.prevItemID].parallel) {
                                this.state.registry.registry[cite.itemId].parallel = cite.prevItemID;
                            } else {
                                this.state.registry.registry[cite.itemId].parallel = this.state.registry.registry[cite.prevItemID].parallel;
                            }
                            this.state.registry.registry[cite.itemId].siblings = this.state.registry.registry[cite.prevItemID].siblings;
                            // XXXX This should never happen
                            if (!this.state.registry.registry[cite.itemId].siblings) {
                                this.state.registry.registry[cite.itemId].siblings = [];
                                CSL.debug("WARNING: adding missing siblings array to registry object");
                            }
                            this.state.registry.registry[cite.itemId].siblings.push(cite.itemId);
                        }
                    }
                }
            }
            this.sets.push([]);
            //this.in_series = false;

        }
        if (lengthCheck < 2) {
            this.purgeGroupsIfParallel(false);
        } else {
            this.purgeGroupsIfParallel(true);
        }
        this.in_series = true;
        //print(this.sets.mystack.slice(-2,-1)[0].slice(-1)[0].back_forceme);
    }
};

/**
 * Mangle the queue as appropropriate.
 */
CSL.Parallel.prototype.PruneOutputQueue = function () {
    var len, pos, series, ppos, llen, cite;
    if (this.use_parallels) {
        len = this.sets.mystack.length;
        for (pos = 0; pos < len; pos += 1) {
            series = this.sets.mystack[pos];
            if (series.length > 1) {
                llen = series.length;
                for (ppos = 0; ppos < llen; ppos += 1) {
                    cite = series[ppos];
                    if (ppos === 0) {
                        this.purgeVariableBlobs(cite, cite.back);
                    } else if (ppos === (series.length - 1)) {
                        //print("  (end)== purge ==> ("+cite.front.concat(cite.back_forceme)+")");
                        this.purgeVariableBlobs(cite, cite.front.concat(cite.back_forceme));
                    } else {
                        //print("  (mid)== purge ==> ("+cite.front.concat(cite.back)+")");
                        this.purgeVariableBlobs(cite, cite.front.concat(cite.back));
                    }

                }
            }
        }
    }
};

CSL.Parallel.prototype.purgeVariableBlobs = function (cite, varnames) {
    var len, pos, varname, b, llen, ppos, out;
    if (this.use_parallels) {
        //
        // special delimiter within parallel cites.
        //
        out = this.state.output.current.value();
        if ("undefined" === typeof out.length) {
            out = out.blobs;
        }
        for (pos = 0, len = this.delim_pointers.length; pos < len; pos += 1) {
            ppos = this.delim_pointers[pos];
            if (ppos !== false) {
                out[ppos].parallel_delimiter = ", ";
            }
        }
        len = varnames.length - 1;
        for (pos = len; pos > -1; pos += -1) {
            varname = varnames[pos];
            if (cite[varname]) {
                llen = cite[varname].blobs.length - 1;
                for (ppos = llen; ppos > -1; ppos += -1) {
                    b = cite[varname].blobs[ppos];
                    b[0].blobs = b[0].blobs.slice(0, b[1]).concat(b[0].blobs.slice((b[1] + 1)));
                    this.state.tmp.has_purged_parallel = true;
                    if (b[0] && b[0].strings && "string" == typeof b[0].strings.oops
                        && b[0].parent && b[0].parent) {

                        b[0].parent.parent.strings.delimiter = b[0].strings.oops;
                    }
                }
            }
        }
    }
};


CSL.Parallel.prototype.purgeGroupsIfParallel = function (original_condition) {
    for (var i = this.parallel_conditional_blobs_list.length - 1; i > -1; i += -1) {
        var obj = this.parallel_conditional_blobs_list[i];
        // Tricky double-negatives here.
        var purgeme = true;
        for (var j = 0, jlen = obj.conditions.length; j < jlen; j += 1) {
            if (!(!obj.conditions[j] === !!original_condition
                || ("master" === obj.conditions[j]
                    && !this.state.registry.registry[obj.id].master)
                || ("servant" === obj.conditions[j]
                    && !this.state.registry.registry[obj.id].parallel))) {
                purgeme = false;
                break;
            }
        }
        if (purgeme) {
            var buffer = [];
            while (obj.blobs.length > obj.pos) {
                buffer.push(obj.blobs.pop());
            }
            if (buffer.length) {
                buffer.pop();
            }
            while (buffer.length) {
                obj.blobs.push(buffer.pop());
            }
        }
        this.parallel_conditional_blobs_list.pop();
    }
}
