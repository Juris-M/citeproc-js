CSL.Engine.prototype.remapSectionVariable = function (inputList) {
    // We have items with a value in the section field (on Item) that must
    // be mapped to the locator field (on item). We simply prepend it as
    // a string here, and handle all parsing of the resulting string
    // in processNumber(). Plurals and numeric are set in processNumber().
    
    // Because the target is in the citation item (lowercase), the
    // remapping cannot take place when the Item data is received.
    // Citation provides a list of Item/item pairs, hence the iteration
    // used here.
    var m;
    for (var i = 0, ilen = inputList.length; i < ilen; i += 1) {
        var Item = inputList[i][0];
        var item = inputList[i][1];

        if (["bill","gazette","legislation","regulation","treaty"].indexOf(Item.type) > -1) {
             // If a locator value exists, then
            //   (a) Leave be an overriding label at the start of the locator field, defaulting to label value
            if (item.locator) {
                item.locator = item.locator.trim();
                m = item.locator.match(CSL.STATUTE_SUBDIV_PLAIN_REGEX);
                if (!m) {
                    if (item.label) {
                        item.locator = CSL.STATUTE_SUBDIV_STRINGS_REVERSE[item.label] + " " + item.locator;
                    } else {
                        item.locator = "p. " + item.locator;
                    }
                }
            }
            // If a section value exists, then
            //   (a) Apply an overriding label at the start of the section field, defaulting to sec.
            var sectionMasterLabel = null;
            if (Item.section) {
                Item.section = Item.section.trim();
                m = Item.section.match(CSL.STATUTE_SUBDIV_PLAIN_REGEX);
                if (!m) {
                    Item.section = "sec. " + Item.section;
                    sectionMasterLabel = "sec.";
                } else {
                    sectionMasterLabel = m[0].trim();
                }
            }
            // If section is nil, then
            //   (a) Do nothing
            if (Item.section) {
            // If section exists and locator is nil
            //   (a) Set section string in locator field
                if (!item.locator) {
                    item.locator = Item.section;
                } else {
            // If both section and locator exist, then
            //   (a) If locator starts with p., remove p., merge with space or no-space, and set in locator field
            //   (b) If locator starts with non-p., prepend section value to locator with space, and set in locator field
                    m = item.locator.match(/^([^ ]*)\s*(.*)/);
                    var space = " ";
                    if (m) {
                        if (m[1] === "p." && sectionMasterLabel !== "p.") {
                            item.locator = m[2];
                        }
                        if (["[", "(", ".", ",", ";", ":", "?"].indexOf(item.locator.slice(0, 1)) > -1) {
                            space = "";
                        }
                    } else {
                       space = ""; 
                    }
                    item.locator = Item.section + space + item.locator;
                }
                //Item.section = "";
            }
            item.label = "";
            // And that's it. Pre-parse complete.
        }
    }
}


CSL.Engine.prototype.setNumberLabels = function (Item) {
     if (Item.number
        && ["bill", "gazette", "legislation","regulation","treaty"].indexOf(Item.type) > -1
        && this.opt.development_extensions.static_statute_locator
        && !this.tmp.shadow_numbers["number"]) {

        this.tmp.shadow_numbers["number"] = {};
        this.tmp.shadow_numbers["number"].values = [];
        this.tmp.shadow_numbers["number"].plural = 0;
        this.tmp.shadow_numbers["number"].numeric = false;
        this.tmp.shadow_numbers["number"].label = false;
        
        // Labels embedded in number variable
        var value = "" + Item.number;
        value = value.split("\\").join("");
        // Get first word, parse out labels only if it parses
        var firstword = value.split(/\s+/)[0];
        var firstlabel = CSL.STATUTE_SUBDIV_STRINGS[firstword];
        if (firstlabel) {
            // Get list and match
            var splt = value.split(CSL.STATUTE_SUBDIV_PLAIN_REGEX);
            if (splt.length > 1) {
                // Convert matches to localized form
                var lst = [];
                for (var j=1, jlen=splt.length; j < jlen; j += 1) {
                    lst.push(splt[j].replace(/\s*$/, "").replace(/^\s*/, ""));
                }
                // Preemptively save to shadow_numbers
                value = lst.join(" ");
            } else {
                value = splt[0];
            }
            this.tmp.shadow_numbers["number"].label = firstlabel;
            this.tmp.shadow_numbers["number"].values.push(["Blob", value, false]);
            this.tmp.shadow_numbers["number"].numeric = false;
        } else {
            this.tmp.shadow_numbers["number"].values.push(["Blob", value, false]);
            this.tmp.shadow_numbers["number"].numeric = true;
        }
    }
}
