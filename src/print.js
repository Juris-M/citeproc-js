/*global dump: true */

if (typeof console === 'undefined') {
    CSL.debug = function (str) {
        dump("CSL: " + str + "\n");
    };
    CSL.error = function (str) {
        dump("CSL error: " + str + "\n");
    };
} else {
    CSL.debug = function (str) {
        // eslint-disable-next-line
        console.log("CSL: " + str);
    };
    CSL.error = function (str) {
        // eslint-disable-next-line
        console.log("CSL error: " + str);
    };
}
