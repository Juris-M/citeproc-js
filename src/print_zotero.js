/*global Zotero: true, Components: true */

CSL.debug = function (str) {
    Zotero.debug("CSL: " + str);
};

CSL.error = function (str) {
    Zotero.debug("CSL error: " + str);
};

// eslint-disable-next-line
function DOMParser() {
	return Components.classes["@mozilla.org/xmlextras/domparser;1"]
		.createInstance(Components.interfaces.nsIDOMParser);
};
