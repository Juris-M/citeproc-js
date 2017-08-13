
CSL.Engine.prototype.makeBibliography = function (bibsection) {
    var debug, ret, params, item, len, pos, tok, tokk, tokkk, entry_ids, entry_strings;
    debug = false;
    // API change: added in version 1.0.51
    if (!this.bibliography.tokens.length) {
        return false;
    }
    if ("string" === typeof bibsection) {
        this.opt.citation_number_slug = bibsection;
        bibsection = false;
    }
    //SNIP-START
    if (debug) {
        len = this.bibliography.tokens.length;
        for (pos = 0; pos < len; pos += 1) {
            tok = this.bibliography.tokens[pos];
            CSL.debug("bibtok: " + tok.name);
        }
        CSL.debug("---");
        len = this.citation.tokens.length;
        for (pos = 0; pos < len; pos += 1) {
            tokk = this.citation.tokens[pos];
            CSL.debug("cittok: " + tokk.name);
        }
        CSL.debug("---");
        len = this.bibliography_sort.tokens.length;
        for (pos = 0; pos < len; pos += 1) {
            tokkk = this.bibliography_sort.tokens[pos];
            CSL.debug("bibsorttok: " + tokkk.name);
        }
    }
    //SNIP-END

    // For paged returns
    ret = CSL.getBibliographyEntries.call(this, bibsection);
    entry_ids = ret[0];
    entry_strings = ret[1];

    // For paged returns
    var done = ret[2];

    params = {
        "maxoffset": 0,
        "entryspacing": this.bibliography.opt["entry-spacing"],
        "linespacing": this.bibliography.opt["line-spacing"],
        "second-field-align": false,
        "entry_ids": entry_ids,
        "bibliography_errors": this.tmp.bibliography_errors.slice(),
        "done": done
    };
    if (this.bibliography.opt["second-field-align"]) {
        params["second-field-align"] = this.bibliography.opt["second-field-align"];
    }

    len = this.registry.reflist.length;
    for (pos = 0; pos < len; pos += 1) {
        item = this.registry.reflist[pos];
        if (item.offset > params.maxoffset) {
            params.maxoffset = item.offset;
        }
    }
    if (this.bibliography.opt.hangingindent) {
        params.hangingindent = this.bibliography.opt.hangingindent;
    }
    params.bibstart = this.fun.decorate.bibstart;
    params.bibend = this.fun.decorate.bibend;

    this.opt.citation_number_slug = false;
    return [params, entry_strings];
};

/*
 * Compose individual cites into a single string.
 */
CSL.getBibliographyEntries = function (bibsection) {
    var ret, input, include, anymatch, allmatch, bib_entry, res, item, spec, lllen, pppos, topblobs, entry_item_ids, debug, collapse_parallel, i, ilen, siblings, skips, sortedItems, eyetem, entry_item_data, j, jlen;
    ret = [];
    entry_item_data = [];
    this.tmp.area = "bibliography";
    this.tmp.root = "bibliography";
    this.tmp.last_rendered_name = false;
    this.tmp.bibliography_errors = [];
    this.tmp.bibliography_pos = 0;

    // For paged returns: disable generated entries and
    // do not fetch full items as a batch (input variable
    // consists of ids only in this case)
    if (bibsection && bibsection.page_start && bibsection.page_length) {
        input = this.registry.getSortedIds();        
    } else {
        input = this.retrieveItems(this.registry.getSortedIds());
    }
    
    this.tmp.disambig_override = true;
    function eval_string(a, b) {
        if (a === b) {
            return true;
        }
        return false;
    }
    function eval_list(a, lst) {
        lllen = lst.length;
        for (pppos = 0; pppos < lllen; pppos += 1) {
            if (eval_string(a, lst[pppos])) {
                return true;
            }
        }
        return false;
    }
    function eval_spec(a, b) {
        if ((a === "none" || !a) && !b) {
            return true;
        }
        if ("string" === typeof b) {
            return eval_string(a, b);
        } else if (!b) {
            return false;
        } else {
            return eval_list(a, b);
        }
    }

    skips = {};

    // For paged returns
    var page_item_count;
    if (bibsection && bibsection.page_start && bibsection.page_length) {
        page_item_count = 0;
        if (bibsection.page_start !== true) {
            for (i = 0, ilen = input.length; i < ilen; i += 1) {
                skips[input[i]] = true;
                if (bibsection.page_start == input[i]) {
                    break;
                }
            }
        }
    }

    var processed_item_ids = [];

    for (i = 0, ilen = input.length; i < ilen; i += 1) {
        
        // For paged returns
        if (bibsection && bibsection.page_start && bibsection.page_length) {
            if (skips[input[i]]) {
                continue;
            }
            item = this.retrieveItem(input[i]);
            if (page_item_count === bibsection.page_length) {
                break;
            }
        } else {
            item = input[i];
            if (skips[item.id]) {
                continue;
            }
        }
        if (bibsection) {
            include = true;
            if (bibsection.include) {
                //
                // Opt-in: these are OR-ed.
                //
                include = false;
                for (j = 0, jlen = bibsection.include.length; j < jlen; j += 1) {
                    spec = bibsection.include[j];
                    if (eval_spec(spec.value, item[spec.field])) {
                        include = true;
                        break;
                    }
                }
            } else if (bibsection.exclude) {
                //
                // Opt-out: these are also OR-ed.
                //
                anymatch = false;
                for (j = 0, jlen = bibsection.exclude.length; j < jlen; j += 1) {
                    spec = bibsection.exclude[j];
                    if (eval_spec(spec.value, item[spec.field])) {
                        anymatch = true;
                        break;
                    }
                }
                if (anymatch) {
                    include = false;
                }
            } else if (bibsection.select) {
                //
                // Multiple condition opt-in: these are AND-ed.
                //
                include = false;
                allmatch = true;
                for (j = 0, jlen = bibsection.select.length; j < jlen; j += 1) {
                    spec = bibsection.select[j];
                    if (!eval_spec(spec.value, item[spec.field])) {
                        allmatch = false;
                    }
                }
                if (allmatch) {
                    include = true;
                }
            }
            if (bibsection.quash) {
                //
                // Stop criteria: These are AND-ed.
                //
                allmatch = true;
                for (j = 0, jlen = bibsection.quash.length; j < jlen; j += 1) {
                    spec = bibsection.quash[j];
                    if (!eval_spec(spec.value, item[spec.field])) {
                        allmatch = false;
                    }
                }
                if (allmatch) {
                    include = false;
                }
            }
            if (!include) {
                continue;
            }
        }
        //SNIP-START
        if (debug) {
            CSL.debug("BIB: " + item.id);
        }
        //SNIP-END
        bib_entry = new CSL.Token("group", CSL.START);
        bib_entry.decorations = [["@bibliography", "entry"]].concat(this.bibliography.opt.layout_decorations);
        this.output.startTag("bib_entry", bib_entry);
        if (item.system_id && this.sys.embedBibliographyEntry) {
            this.output.current.value().item_id = item.system_id;
        } else {
            this.output.current.value().system_id = item.id;
        }
        // The needs fixing.  Parallel cite should be generated
        // by arrival of either a master or a sibling, with the
        // same result.

        sortedItems = [[{id: "" + item.id}, item]];
        entry_item_ids = [];
        if (this.registry.registry[item.id].master 
            && !(bibsection && bibsection.page_start && bibsection.page_length)) {

            collapse_parallel = true;
            this.parallel.StartCitation(sortedItems);
            this.output.queue[0].strings.delimiter = ", ";
            this.tmp.term_predecessor = false;
            entry_item_ids.push("" + CSL.getCite.call(this, item));
            skips[item.id] = true;
            siblings = this.registry.registry[item.id].siblings;
            for (j = 0, jlen = siblings.length; j < jlen; j += 1) {
                var k = this.registry.registry[item.id].siblings[j];
                eyetem = this.retrieveItem(k);
                entry_item_ids.push("" + CSL.getCite.call(this, eyetem));
                skips[eyetem.id] = true;
            }
            this.parallel.ComposeSet();
            this.parallel.PruneOutputQueue();
        } else if (!this.registry.registry[item.id].siblings) {
            this.parallel.StartCitation(sortedItems);
            this.tmp.term_predecessor = false;
            entry_item_ids.push("" + CSL.getCite.call(this, item));
            if (bibsection && bibsection.page_start && bibsection.page_length) {
                page_item_count += 1;
            }
            //skips[item.id] = true;
        }
        // For RDF support
        entry_item_data.push("");

        this.tmp.bibliography_pos += 1;

        processed_item_ids.push(entry_item_ids);
        //
        // XXX: loop to render parallels goes here
        // XXX: just have to mark them somehow ...
        //
        this.output.endTag("bib_entry");
        //
        // place layout prefix on first blob of each cite, and suffix
        // on the last non-empty blob of each cite.  there be dragons
        // here.
        //
        if (this.output.queue[0].blobs.length && this.output.queue[0].blobs[0].blobs.length) {
            // The output queue stuff needs cleaning up.  the result of
            // output.current.value() is sometimes a blob, sometimes its list
            // of blobs.  this inconsistency is a source of confusion, and
            // should be cleaned up across the code base in the first
            // instance, before making any other changes to output code.
            if (collapse_parallel || !this.output.queue[0].blobs[0].blobs[0].strings) {
                topblobs = this.output.queue[0].blobs;
                collapse_parallel = false;
            } else {
                topblobs = this.output.queue[0].blobs[0].blobs;
            }
            topblobs[0].strings.prefix = this.bibliography.opt.layout_prefix + topblobs[0].strings.prefix;
        }
        for (j=0,jlen=this.output.queue.length;j<jlen;j+=1) {
            CSL.Output.Queue.purgeEmptyBlobs(this.output.queue[j]);
            //print("XXX: "+JSON.stringify(this.output.queue[j],['strings','prefix','suffix','delimiter','blobs','decorations'],2))
        }
        for (j=0,jlen=this.output.queue.length;j<jlen;j+=1) {
            this.output.adjust.upward(this.output.queue[j]);
            this.output.adjust.leftward(this.output.queue[j]);
            this.output.adjust.downward(this.output.queue[j],true);
            this.output.adjust.fix(this.output.queue[j]);
            //print("OUTPUT: "+JSON.stringify(this.output.queue[j],['strings','prefix','suffix','delimiter','blobs','decorations'],2))
        }

        //print("DUMP "+JSON.stringify(this.output.queue, ["strings", "decorations", "prefix", "suffix", "delimiter", "blobs"], 2));

        // XXX Need to account for numeric blobs in input.
        // XXX No idea how this could have worked previously.

        //print("BLOBS "+this.output.queue[0].blobs[0].blobs);

        //print("JSON "+JSON.stringify(this.output.queue[0].blobs, null, 2));

        res = this.output.string(this, this.output.queue)[0];
        
        if (!res && this.opt.update_mode === CSL.NUMERIC) {
            var err = (ret.length + 1) + ". [CSL STYLE ERROR: reference with no printed form.]"
            res = CSL.Output.Formats[this.opt.mode]["@bibliography/entry"](this, err) 
        }
        if (res) {
            ret.push(res);
        }
    }

    var done = false;
    if (bibsection && bibsection.page_start && bibsection.page_length) {
        var last_expected_id = input.slice(-1)[0];
        var last_seen_id = processed_item_ids.slice(-1)[0];
        if (!last_expected_id || !last_seen_id || last_expected_id == last_seen_id) {
            done = true;
        }
    }
    this.tmp.disambig_override = false;

    // XXX done
    return [processed_item_ids, ret, done];
};
