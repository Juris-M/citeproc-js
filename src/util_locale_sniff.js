CSL.getLocaleNames = function (myxml, preferredLocale) {
    var stylexml = CSL.setupXml(myxml);

    function extendLocaleList(localeList, locale) {
        var forms = ["base", "best"];
        if (locale) {
            var normalizedLocale = CSL.localeResolve(locale);
            for (var i=0,ilen=forms.length;i<ilen;i++) {
                if (normalizedLocale[forms[i]] && localeList.indexOf(normalizedLocale[forms[i]]) === -1) {
                    localeList.push(normalizedLocale[forms[i]]);
                }
            }
        }
    }

    function sniffLocaleOnOneNodeName(nodeName) {
        var nodes = stylexml.getNodesByName(stylexml.dataObj, nodeName);
        for (var i=0,ilen=nodes.length;i<ilen;i++) {
            var nodeLocales = stylexml.getAttributeValue(nodes[i], "locale");
            if (nodeLocales) {
                nodeLocales = nodeLocales.split(/ +/);
                for (var j=0,jlen=nodeLocales.length;j<jlen;j++) {
                    this.extendLocaleList(localeIDs, nodeLocales[j]);
                }
            }
        }
    }

    var localeIDs = ["en-US"];
    extendLocaleList(localeIDs, preferredLocale);

    var styleNode = stylexml.getNodesByName(stylexml.dataObj, "style")[0];
    var defaultLocale = stylexml.getAttributeValue(styleNode, "default-locale");
    extendLocaleList(localeIDs, defaultLocale);

    var nodeNames = ["layout", "if", "else-if", "condition"];
    for (var i=0,ilen=nodeNames.length;i<ilen;i++) {
        sniffLocaleOnOneNodeName(stylexml, localeIDs, nodeNames[i]);
    }
    return localeIDs;
};
