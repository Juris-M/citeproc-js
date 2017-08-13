
CSL.tokenExec = function (token, Item, item) {
    // Called on state object
    var next, maybenext, exec, debug;
    debug = false;
    next = token.next;
    maybenext = false;
    //SNIP-START
    if (debug) {
        CSL.debug("---> Token: " + token.name + " (" + token.tokentype + ") in " + this.tmp.area + ", " + this.output.current.mystack.length);
    }
    //SNIP-END

    var record = function (result) {
        if (result) {
            this.tmp.jump.replace("succeed");
            return token.succeed;
        } else {
            this.tmp.jump.replace("fail");
            return token.fail;
        }
    }
    if (token.test) {
        next = record.call(this,token.test(Item, item));
    }
    for (var i=0,ilen=token.execs.length;i<ilen;i++) {
        exec = token.execs[i];
        maybenext = exec.call(token, this, Item, item);
        if (maybenext) {
            next = maybenext;
        }
    }
    //SNIP-START
    if (debug) {
        CSL.debug(token.name + " (" + token.tokentype + ") ---> done");
    }
    //SNIP-END
    return next;
};

/**
 * Macro expander.
 * <p>Called on the state object.</p>
 */
CSL.expandMacro = function (macro_key_token, target) {
    var mkey, macro_nodes, end_of_macro, func;

    mkey = macro_key_token.postponed_macro;

    // Decorations and affixes are in wrapper applied in cs:text
    macro_key_token = new CSL.Token("group", CSL.START);

    var hasDate = false;
    var macroid = false;
    macro_nodes = this.cslXml.getNodesByName(this.cslXml.dataObj, 'macro', mkey);
    if (macro_nodes.length) {
        macroid = this.cslXml.getAttributeValue(macro_nodes[0],'cslid');
        hasDate = this.cslXml.getAttributeValue(macro_nodes[0], "macro-has-date");
    }
    if (hasDate) {
        mkey = mkey + "@" + this.build.current_default_locale;
        func = function (state) {
            if (state.tmp.extension) {
                state.tmp["doing-macro-with-date"] = true;
            }
        };
        macro_key_token.execs.push(func);
    }

    if (this.build.macro_stack.indexOf(mkey) > -1) {
        throw "CSL processor error: call to macro \"" + mkey + "\" would cause an infinite loop";
    } else {
        this.build.macro_stack.push(mkey);
    }

    macro_key_token.cslid = macroid;

    if (CSL.MODULE_MACROS[mkey]) {
        macro_key_token.juris = mkey;
        this.opt.update_mode = CSL.POSITION;
    }
    // Macro group is treated as a real node in the style
    CSL.Node.group.build.call(macro_key_token, this, target, true);

    // Node does not exist in the CSL
    if (!this.cslXml.getNodeValue(macro_nodes)) {
        throw "CSL style error: undefined macro \"" + mkey + "\"";
    }

    // Let's macro
    var mytarget = CSL.getMacroTarget.call(this, mkey);
    if (mytarget) {
        CSL.buildMacro.call(this, mytarget, macro_nodes);
        CSL.configureMacro.call(this, mytarget);
    }
    if (!this.build.extension) {
        func = function(macro_name) {
            return function (state, Item, item) {
                var next = 0;
                while (next < state.macros[macro_name].length) {
                    next = CSL.tokenExec.call(state, state.macros[macro_name][next], Item, item);
                }
            }
        }(mkey);
        var text_node = new CSL.Token("text", CSL.SINGLETON);
        text_node.execs.push(func);
        target.push(text_node);
    }

    // Decorations and affixes are in wrapper applied in cs:text
    end_of_macro = new CSL.Token("group", CSL.END);
    
    if (hasDate) {
        func = function (state) {
            if (state.tmp.extension) {
                state.tmp["doing-macro-with-date"] = false;
            }
        };
        end_of_macro.execs.push(func);
    }
    if (macro_key_token.juris) {
        end_of_macro.juris = mkey;
     }
    // Macro group is treated as a real node in the style
    CSL.Node.group.build.call(end_of_macro, this, target, true);

    this.build.macro_stack.pop();
};

CSL.getMacroTarget = function (mkey) {
    var mytarget = false;
    if (this.build.extension) {
        mytarget = this[this.build.root + this.build.extension].tokens;
    } else if (!this.macros[mkey]) {
        mytarget = [];
        this.macros[mkey] = mytarget;
    }
    return mytarget;
}

CSL.buildMacro = function (mytarget, macro_nodes) {
    var builder = CSL.makeBuilder(this, mytarget);
    var mynode;
    if ("undefined" === typeof macro_nodes.length) {
        mynode = macro_nodes;
    } else {
        mynode = macro_nodes[0];
    }
    builder(mynode);
}

CSL.configureMacro = function (mytarget) {
    if (!this.build.extension) {
        this.configureTokenList(mytarget);
    }
}


/**
 * Convert XML node to token.
 * <p>This is called on an XML node.  After extracting the name and attribute
 * information from the node, it performs three operations.  Attribute information
 * relating to output formatting is stored on the node as an array of tuples,
 * which fixes the sequence of execution of output functions to be invoked
 * in the next phase of processing.  Other attribute information is reduced
 * to functions, and is pushed into an array on the token in no particular
 * order, for later execution.  The element name is used as a key to
 * invoke the relevant <code>build</code> method of the target element.
 * Element methods are defined in {@link CSL.Node}.</p>
 * @param {Object} state  The state object returned by {@link CSL.Engine}.
 * @param {Int} tokentype  A CSL namespace constant (<code>CSL.START</code>,
 * <code>CSL.END</code> or <code>CSL.SINGLETON</code>.
 */
CSL.XmlToToken = function (state, tokentype, explicitTarget) {
    var name, txt, attributes, decorations, token, key, target;
    name = state.cslXml.nodename(this);
    //CSL.debug(tokentype + " : " + name);
    if (state.build.skip && state.build.skip !== name) {
        return;
    }
    if (!name) {
        txt = state.cslXml.content(this);
        if (txt) {
            state.build.text = txt;
        }
        return;
    }
    if (!CSL.Node[state.cslXml.nodename(this)]) {
        throw "Undefined node name \"" + name + "\".";
    }
    attributes = state.cslXml.attributes(this);
    decorations = CSL.setDecorations.call(this, state, attributes);
    token = new CSL.Token(name, tokentype);
    if (tokentype !== CSL.END || name === "if" || name === "else-if" || name === "layout") {
        //
        // xml: more xml stuff
        //
        for (key in attributes) {
            if (attributes.hasOwnProperty(key)) {
                if (tokentype === CSL.END && key !== "@language" && key !== "@locale") {
                    continue;
                }
                if (attributes.hasOwnProperty(key)) {
                    if (CSL.Attributes[key]) {
                        try {
                            CSL.Attributes[key].call(token, state, "" + attributes[key]);
                        } catch (e) {
                            CSL.error(e);
                            throw "CSL processor error, " + key + " attribute: " + e;
                        }
                    } else {
                        CSL.debug("warning: undefined attribute \""+key+"\" in style");
                    }
                }
            }
        }
        token.decorations = decorations;
    } else if (tokentype === CSL.END && attributes['@variable']) {
        token.hasVariable = true;
        if (CSL.DATE_VARIABLES.indexOf(attributes['@variable']) > -1) {
            token.variables = attributes['@variable'].split(/\s+/);
        }
    }
    //
    // !!!!!: eliminate diversion of tokens to separate
    // token list (formerly used for reading in macros
    // and terms).
    //
    if (explicitTarget) {
        target = explicitTarget;
    } else {
        target = state[state.build.area].tokens;
    }
    // True flags real nodes in the style
    CSL.Node[name].build.call(token, state, target, true);
};


