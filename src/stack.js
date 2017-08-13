
/**
 * String stack object.
 * <p>Numerous string stacks are used to track nested
 * parameters at runtime.  This class provides methods
 * that remove some of the aggravation of managing
 * them.</p>
 * @class
 */
CSL.Stack = function (val, literal) {
    this.mystack = [];
    if (literal || val) {
        this.mystack.push(val);
    }
    this.tip = this.mystack[0];
};

/**
 * Push a value onto the stack.
 * <p>This just does what it says.</p>
 */
CSL.Stack.prototype.push = function (val, literal) {
    if (literal || val) {
        this.mystack.push(val);
    } else {
        this.mystack.push("");
    }
    this.tip = this.mystack[this.mystack.length - 1];
};

/**
 * Clear the stack
 */
CSL.Stack.prototype.clear = function () {
    this.mystack = [];
    this.tip = {};
};

/**
 * Replace the top value on the stack.
 * <p>This removes some ugly syntax from the
 * main code.</p>
 */
CSL.Stack.prototype.replace = function (val, literal) {
    //
    // safety fix after a bug was chased down.  Rhino
    // JS will process a negative index without error (!).
    if (this.mystack.length === 0) {
        throw "Internal CSL processor error: attempt to replace nonexistent stack item with " + val;
    }
    if (literal || val) {
        this.mystack[(this.mystack.length - 1)] = val;
    } else {
        this.mystack[(this.mystack.length - 1)] = "";
    }
    this.tip = this.mystack[this.mystack.length - 1];
};


/**
 * Remove the top value from the stack.
 * <p>Just does what it says.</p>
 */
CSL.Stack.prototype.pop = function () {
    var ret = this.mystack.pop();
    if (this.mystack.length) {
        this.tip = this.mystack[this.mystack.length - 1];
    } else {
        this.tip = {};
    }
    return ret;
};


/**
 * Return the top value on the stack.
 * <p>Removes a little hideous complication from
 * the main code.</p>
 */
CSL.Stack.prototype.value = function () {
    return this.mystack.slice(-1)[0];
};


/**
 * Return length (depth) of stack.
 * <p>Used to identify if there is content to
 * be handled on the stack</p>
 */
CSL.Stack.prototype.length = function () {
    return this.mystack.length;
};
