
/**
 * Style token.
 * <p>This class provides the tokens that define
 * the runtime version of the style.  The tokens are
 * instantiated by {@link CSL.Core.Build}, but the token list
 * must be post-processed with
 * {@link CSL.Core.Configure} before it can be used to generate
 * citations.</p>
 * @param {String} name The node name represented by this token.
 * @param {Int} tokentype A flag indicating whether this token
 * marks the start of a node, the end of a node, or is a singleton.
 * @class
 */
CSL.Token = function (name, tokentype) {
    /**
     * Name of the element.
     * <p>This corresponds to the element name of the
     * relevant tag in the CSL file.
     */
    this.name = name;
    /**
     * Strings and other static content specific to the element.
     */
    this.strings = {};
    this.strings.delimiter = undefined;
    this.strings.prefix = "";
    this.strings.suffix = "";
    /**
     * Formatting parameters.
     * <p>This is a placeholder at instantiation.  It is
     * replaced by the result of {@link CSL.setDecorations}
     * when the tag is created and configured during {@link CSL.Core.Build}
     * by {@link CSL.XmlToToken}.  The parameters for particular
     * formatting attributes are stored as string arrays, which
     * map to formatting functions at runtime,
     * when the output format is known.  Note that the order in which
     * parameters are registered is fixed by the constant
     * {@link CSL.FORMAT_KEY_SEQUENCE}.
     */
    this.decorations = [];
    this.variables = [];
    /**
     * Element functions.
     * <p>Functions implementing the styling behaviour of the element
     * are pushed into this array in the {@link CSL.Core.Build} phase.
     */
    this.execs = [];
    /**
     * Token type.
     * <p>This is a flag constant indicating whether the token represents
     * a start tag, an end tag, or is a singleton.</p>
     */
    this.tokentype = tokentype;
    /**
     * Condition evaluator.
     * <p>This is a placeholder that receives a single function, and is
     * only relevant for a conditional branching tag (<code>if</code> or
     * <code>else-if</code>).  The function implements the argument to
     * the <code>match=</code> attribute (<code>any</code>, <code>all</code>
     * or <code>none</code>), by executing the functions registered in the
     * <code>tests</code> array (see below), and reacting accordingly.  This
     * function is invoked by the execution wrappers found in
     * {@link CSL.Engine}.</p>
     */
    this.evaluator = false;
    /**
     * Conditions.
     * <p>Functions that evaluate to true or false, implementing
     * various posisble attributes to the conditional branching tags,
     * are registered here during {@link CSL.Core.Build}.
     * </p>
     */
    this.tests = [];
    this.rawtests = [];
    /**
     * Jump point on success.
     * <p>This holds the list jump point to be used when the
     * <code>evaluator</code> function of a conditional tag
     * returns true (success).  The jump index value is set during the
     * back-to-front token pass performed during {@link CSL.Core.Configure}.
     * </p>
     */
    this.succeed = false;
    /**
     * Jump point on failure.
     * <p>This holds the list jump point to be used when the
     * <code>evaluator</code> function of a conditional tag
     * returns false (failure).  Jump index values are set during the
     * back-to-front token pass performed during {@link CSL.Core.Configure}.
     * </p>
     */
    this.fail = false;
    /**
     * Index of next token.
     * <p>This holds the index of the next token in the
     * token list, which is the default "jump-point" for ordinary
     * processing.  Jump index values are set during the
     * back-to-front token pass performed during {@link CSL.Core.Configure}.
     * </p>
     */
    this.next = false;
};

// Have needed this for yonks
CSL.Util.cloneToken = function (token) {
    var newtok, key, pos, len;
    if ("string" === typeof token) {
        return token;
    }
    newtok = new CSL.Token(token.name, token.tokentype);
    for (key in token.strings) {
        if (token.strings.hasOwnProperty(key)) {
            newtok.strings[key] = token.strings[key];
        }
    }
    if (token.decorations) {
        newtok.decorations = [];
        for (pos = 0, len = token.decorations.length; pos < len; pos += 1) {
            newtok.decorations.push(token.decorations[pos].slice());
        }
    }
    if (token.variables) {
        newtok.variables = token.variables.slice();
    }
    // Probably overkill; this is only used for cloning formatting
    // tokens.
    if (token.execs) {
        newtok.execs = token.execs.slice();
        newtok.tests = token.tests.slice();
        newtok.rawtests = token.tests.slice();
    }
    return newtok;
};
