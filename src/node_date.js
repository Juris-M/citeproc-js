
CSL.Node.date = {
    build: function (state, target) {
        var func, date_obj, len, pos, part, dpx, parts, mypos, start, end;
        if (this.tokentype === CSL.START || this.tokentype === CSL.SINGLETON) {
            // used to collect rendered date part names in node_datepart,
            // for passing through to node_key, for use in dates embedded
            // in macros
            state.build.date_parts = [];
            state.build.date_variables = this.variables;
            if (!state.build.extension) {
                CSL.Util.substituteStart.call(this, state, target);
            }
            if (state.build.extension) {
                func = CSL.dateMacroAsSortKey;
            } else {
                func = function (state, Item, item) {
                    state.tmp.element_rendered_ok = false;
                    state.tmp.donesies = [];
                    state.tmp.dateparts = [];
                    var dp = [];
                    //if (this.variables.length && Item[this.variables[0]]){
                    if (this.variables.length
                        && !(state.tmp.just_looking
                             && this.variables[0] === "accessed")) {
                        
                        date_obj = Item[this.variables[0]];
                        if ("undefined" === typeof date_obj) {
                            date_obj = {"date-parts": [[0]] };
                            if (state.opt.development_extensions.locator_date_and_revision) {
                                if (item && this.variables[0] === "locator-date" && item["locator-date"]) {
                                    date_obj = item["locator-date"];
                                }
                            }
                        }
                        state.tmp.date_object = date_obj;
                        //
                        // Call a function here to analyze the
                        // data and set the name of the date-part that
                        // should collapse for this range, if any.
                        //
                        // (1) build a filtered list, in y-m-d order,
                        // consisting only of items that are (a) in the
                        // date-parts and (b) in the *_end data.
                        // (note to self: remember that season is a
                        // fallback var when month and day are empty)
                        
                        //if ("undefined" === typeof this.dateparts) {
                        //    this.dateparts = ["year", "month", "day"];
                        //}
                        len = this.dateparts.length;
                        for (pos = 0; pos < len; pos += 1) {
                            part = this.dateparts[pos];
                            if ("undefined" !== typeof state.tmp.date_object[(part +  "_end")]) {
                                dp.push(part);
                            } else if (part === "month" && "undefined" !== typeof state.tmp.date_object.season_end) {
                                dp.push(part);
                            }
                        }
                        dpx = [];
                        parts = ["year", "month", "day"];
                        len = parts.length;
                        for (pos = 0; pos < len; pos += 1) {
                            if (dp.indexOf(parts[pos]) > -1) {
                                dpx.push(parts[pos]);
                            }
                        }
                        dp = dpx.slice();
                        //
                        // (2) Reverse the list and step through in
                        // reverse order, popping each item if the
                        // primary and *_end data match.
                        mypos = 2;
                        len = dp.length;
                        for (pos = 0; pos < len; pos += 1) {
                            part = dp[pos];
                            start = state.tmp.date_object[part];
                            end = state.tmp.date_object[(part + "_end")];
                            if (start !== end) {
                                mypos = pos;
                                break;
                            }
                        }
                        
                        //
                        // (3) When finished, the first item in the
                        // list, if any, is the date-part where
                        // the collapse should occur.

                        // XXXXX: was that it?
                        state.tmp.date_collapse_at = dp.slice(mypos);
                        //
                        // The collapse itself will be done by appending
                        // string output for the date, less suffix,
                        // placing a delimiter on output, then then
                        // doing the *_end of the range, dropping only
                        // the prefix.  That should give us concise expressions
                        // of ranges.
                        //
                        // Numeric dates should not collapse, though,
                        // and should probably use a slash delimiter.
                        // Scope for configurability will remain (all over
                        // the place), but this will do to get this feature
                        // started.
                        //
                    } else {
                        state.tmp.date_object = false;
                    }
                };
            }
            this.execs.push(func);

            // newoutput
            func = function (state, Item) {
                if (!Item[this.variables[0]]) return;
                state.parallel.StartVariable(this.variables[0]);
                state.output.startTag("date", this);
                if (this.variables[0] === "issued"
                    && Item.type === "legal_case"
                    && !state.tmp.extension
                    && "" + Item["collection-number"] === "" + state.tmp.date_object.year
                    && this.dateparts.length === 1
                    && this.dateparts[0] === "year") {

                    // Set up to (maybe) suppress the year if we're not sorting, and
                    // it's the same as the collection-number, and we would render
                    // only the year, with not month or day, and this is a legal_case item.
                    // We save a pointer to the blob parent and its position here. The
                    // blob will be popped from output if at the end of processing for
                    // this cite we find that we have rendered the collection-number
                    // variable also.
                    for (var key in state.tmp.date_object) {
                        if (state.tmp.date_object.hasOwnProperty(key)) {
                            if (key.slice(0, 4) === "year") {

                                state.tmp.issued_date = {};
                                var lst = state.output.current.mystack.slice(-2)[0].blobs;
                                state.tmp.issued_date.list = lst;
                                state.tmp.issued_date.pos = lst.length - 1;
                            }
                        }
                    }
                }
            };
            this.execs.push(func);
        }

        if (!state.build.extension && (this.tokentype === CSL.END || this.tokentype === CSL.SINGLETON)) {
            // mergeoutput
            func = function (state, Item) {
                if (!Item[this.variables[0]]) return;
                state.output.endTag();
                state.parallel.CloseVariable(this.variables[0]);
            };
            this.execs.push(func);
        }
        target.push(this);

        if (this.tokentype === CSL.END || this.tokentype === CSL.SINGLETON) {
            if (!state.build.extension) {
                CSL.Util.substituteEnd.call(this, state, target);
            }
        }
    }
};
