/* global load:true */

/*
 * Pre-sniff loader for E4X parsing module
 * 
 * E4X is no longer supported in browsers, but it is implemented in
 * Rhino, where it serves a useful role in the test suite, for
 * catching XML errors that are missed by jing and by the string-based
 * parser.
 *
 * So ... we'd like to keep it around, but E4X code throws ugly syntax
 * errors when it is loaded anywhere outside of Rhino.  Since there is
 * no standard loading incantation that holds across JavaScript engines,
 * this poses something of a problem for a "one size fits all" release
 * of citeproc-js.
 *
 * Hmm.
 *
 * So what we have here is a hack. We assume that E4X will run ONLY in
 * Rhino, or at least only in engines running "server-side," and and
 * have a load() function. And are loading the processor from a local
 * disk. That is accessible to the context into which the processor
 * code is being loaded. And that the path to the file with the E4X
 * stuff in it is "./src/xmle4x.js". I said it was a hack, and I
 * wasn't kidding.
 */

if ("undefined" !== typeof XML) {
    try {
        load("./src/xmle4x.js");
    } catch (e) {
        throw "OOPS: "+e;
    }
}
