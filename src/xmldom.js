/* global DOMParser:true, ActiveXObject: true, marknote: true, XMLHttpRequest: true */

/**
 * Functions for parsing an XML object using E4X.
 */

CSL.XmlDOM = function (dataObj) {
    this.dataObj = dataObj;
    if ("undefined" == typeof DOMParser) {
        DOMParser = function() {};
        DOMParser.prototype.parseFromString = function(str, contentType) {
            var xmldata;
            if ("undefined" != typeof ActiveXObject) {
                xmldata = new ActiveXObject('MSXML.DomDocument');
                xmldata.async = false;
                xmldata.loadXML(str);
                return xmldata;
            } else if ("undefined" != typeof XMLHttpRequest) {
                xmldata = new XMLHttpRequest;
                if (!contentType) {
                    contentType = 'text/xml';
                }
                xmldata.open('GET', 'data:' + contentType + ';charset=utf-8,' + encodeURIComponent(str), false);
                if(xmldata.overrideMimeType) {
                    xmldata.overrideMimeType(contentType);
                }
                xmldata.send(null);
                return xmldata.responseXML;
            } else if ("undefined" !== typeof marknote) {
                var parser = new marknote.Parser();
                return parser.parse(str);
            }
        };
        this.hasAttributes = function (node) {
            var ret;
            if (node.attributes && node.attributes.length) {
                ret = true;
            } else {
                ret = false;
            }
            return ret;
        };
    } else {
        /*
        this.hasAttributes = function (node) {
            return node["hasAttributes"]();
        };
        */
        this.hasAttributes = function (node) {
            var ret;
            if (node.attributes && node.attributes.length) {
                ret = true;
            } else {
                ret = false;
            }
            return ret;
        };
    }
    this.importNode = function (doc, srcElement) {
        var ret;
        if ("undefined" == typeof doc.importNode) {
            ret = this._importNode(doc, srcElement, true);
        } else {
            ret = doc.importNode(srcElement, true);
        }
        return ret;
    };
    // In case importNode is not available.
    // Thx + hat tip to Anthony T. Holdener III
    // http://www.alistapart.com/articles/crossbrowserscripting
    // cases 3, 4, 8 = text, cdata, comment
    this._importNode = function(doc, node, allChildren) {
        switch (node.nodeType) {
            // element node
            case 1:
                var newNode = doc.createElement(node.nodeName);
                if (node.attributes && node.attributes.length > 0)
                    for (var i = 0, il = node.attributes.length; i < il;)
                        newNode.setAttribute(node.attributes[i].nodeName, node.getAttribute(node.attributes[i++].nodeName));
                    if (allChildren && node.childNodes && node.childNodes.length > 0)
                        for (i = 0, il = node.childNodes.length; i < il;)
                            newNode.appendChild(this._importNode(doc, node.childNodes[i++], allChildren));
                return newNode;
            case 3:
            case 4:
            case 8:
                // Drop comments on the floor as well.
                //return doc.createTextNode(node.nodeValue);
                //break;
        }
    };
    this.parser = new DOMParser();

    // This seems horribly tormented, but there might be a reason for it.
    // Perhaps this was the only way I found to get namespacing to work ... ?
    var str = "<docco><institution institution-parts=\"long\" delimiter=\", \" substitute-use-first=\"1\" use-last=\"1\"><institution-part name=\"long\"/></institution></docco>";
    var inst_doc = this.parser.parseFromString(str, "text/xml");
    var inst_node = inst_doc.getElementsByTagName("institution");
    this.institution = inst_node.item(0);
    var inst_part_node = inst_doc.getElementsByTagName("institution-part");
    this.institutionpart = inst_part_node.item(0);
    this.ns = "http://purl.org/net/xbiblio/csl";
};

/**
 * No need for cleaning with the DOM, I think.  This will probably just be a noop.
 * But first, let's get XML mode switching up and running.
 */
CSL.XmlDOM.prototype.clean = function (xml) {
    xml = xml.replace(/<\?[^?]+\?>/g, "");
    xml = xml.replace(/<![^>]+>/g, "");
    xml = xml.replace(/^\s+/, "");
    xml = xml.replace(/\s+$/, "");
    xml = xml.replace(/^\n*/, "");
    return xml;
};


/**
 * Methods to call on a node.
 */
CSL.XmlDOM.prototype.getStyleId = function (myxml, styleName) {
    var text = "";
    var tagName = "id";
    if (styleName) {
        tagName = "title";
    }
    var node = myxml.getElementsByTagName(tagName);
    if (node && node.length) {
        node = node.item(0);
    }
    if (node) {
        // W3C conformant browsers
        text = node.textContent;
    }
    if (!text) {
        // Opera, IE 6 & 7
        text = node.innerText;
    }
    if (!text) {
        // Safari
        text = node.innerHTML;
    }
    return text;
};

CSL.XmlDOM.prototype.children = function (myxml) {
    var children, pos, len, ret;
    if (myxml) {
        ret = [];
        children = myxml.childNodes;
        for (pos = 0, len = children.length; pos < len; pos += 1) {
            if (children[pos].nodeName != "#text") {
                ret.push(children[pos]);
            }
        }
        return ret;
    } else {
        return [];
    }
};

CSL.XmlDOM.prototype.nodename = function (myxml) {
    var ret = myxml.nodeName;
    return ret;
};

CSL.XmlDOM.prototype.attributes = function (myxml) {
    var ret, attrs, attr, pos, len;
    ret = new Object();
    if (myxml && this.hasAttributes(myxml)) {
        attrs = myxml.attributes;
        for (pos = 0, len=attrs.length; pos < len; pos += 1) {
            attr = attrs[pos];
            ret["@" + attr.name] = attr.value;
        }
    }
    return ret;
};


CSL.XmlDOM.prototype.content = function (myxml) {
    var ret;
    if ("undefined" != typeof myxml.textContent) {
        ret = myxml.textContent;
    } else if ("undefined" != typeof myxml.innerText) {
        ret = myxml.innerText;
    } else {
        ret = myxml.txt;
    }
    return ret;
};


CSL.XmlDOM.prototype.namespace = {
    "xml":"http://www.w3.org/XML/1998/namespace"
}

CSL.XmlDOM.prototype.numberofnodes = function (myxml) {
    if (myxml) {
        return myxml.length;
    } else {
        return 0;
    }
};

CSL.XmlDOM.prototype.getAttributeName = function (attr) {
    var ret = attr.name;
    return ret;
}

CSL.XmlDOM.prototype.getAttributeValue = function (myxml,name,namespace) {
    var ret = "";
    if (namespace) {
        name = namespace+":"+name;
    }
    if (myxml && this.hasAttributes(myxml) && myxml.getAttribute(name)) {
        ret = myxml.getAttribute(name);
    }
    return ret;
}

//
// Can't this be, you know ... simplified?
//
CSL.XmlDOM.prototype.getNodeValue = function (myxml,name) {
    var ret = null;
    if (name){
        var vals = myxml.getElementsByTagName(name);
        if (vals.length > 0) {
            if ("undefined" != typeof vals[0].textContent) {
                ret = vals[0].textContent;
            } else if ("undefined" != typeof vals[0].innerText) {
                ret = vals[0].innerText;
            } else {
                ret = vals[0].text;
            }
        }
    }
    if (ret === null && myxml && myxml.childNodes && (myxml.childNodes.length == 0 || (myxml.childNodes.length == 1 && myxml.firstChild.nodeName == "#text"))) {
        if ("undefined" != typeof myxml.textContent) {
            ret = myxml.textContent;
        } else if ("undefined" != typeof myxml.innerText) {
            ret = myxml.innerText;
        } else {
            ret = myxml.text;
        }
    }
    if (ret === null) {
        ret = myxml;
    }
    return ret;
}

CSL.XmlDOM.prototype.setAttributeOnNodeIdentifiedByNameAttribute = function (myxml,nodename,partname,attrname,val) {
    var pos, len, nodes, node;
    if (attrname.slice(0,1) === '@'){
        attrname = attrname.slice(1);
    }
    nodes = myxml.getElementsByTagName(nodename);
    for (pos = 0, len = nodes.length; pos < len; pos += 1) {
        node = nodes[pos];
        if (node.getAttribute("name") != partname) {
            continue;
        }
        node.setAttribute(attrname, val);
    }
}

CSL.XmlDOM.prototype.deleteNodeByNameAttribute = function (myxml,val) {
    var pos, len, node, nodes;
    nodes = myxml.childNodes;
    for (pos = 0, len = nodes.length; pos < len; pos += 1) {
        node = nodes[pos];
        if (!node || node.nodeType == node.TEXT_NODE) {
            continue;
        }
        if (this.hasAttributes(node) && node.getAttribute("name") == val) {
            myxml.removeChild(nodes[pos]);
        }
    }
}

CSL.XmlDOM.prototype.deleteAttribute = function (myxml,attr) {
    myxml.removeAttribute(attr);
}

CSL.XmlDOM.prototype.setAttribute = function (myxml,attr,val) {
    if (!myxml.ownerDocument) {
        myxml = myxml.firstChild;
    }
    // "unknown" to satisfy IE8, which crashes when setAttribute
    // is checked directly as a property, and report its type as
    // "unknown".
    // Many thanks to Phil Lord for tracing the cause of the fault.
    if (["function", "unknown"].indexOf(typeof myxml.setAttribute) > -1) {
        myxml.setAttribute(attr, val);
    }
    return false;
}

CSL.XmlDOM.prototype.nodeCopy = function (myxml) {
    var cloned_node = myxml.cloneNode(true);
    return cloned_node;
}

CSL.XmlDOM.prototype.getNodesByName = function (myxml,name,nameattrval) {
    var ret, nodes, node, pos, len;
    ret = [];
    nodes = myxml.getElementsByTagName(name);
    for (pos = 0, len = nodes.length; pos < len; pos += 1) {
        node = nodes.item(pos);
        if (nameattrval && !(this.hasAttributes(node) && node.getAttribute("name") == nameattrval)) {
//        if (nameattrval && !(this.attributes && node.attributes.name && node.attributes.name.value == nameattrval)) {
            continue;
        }
        ret.push(node);
    }
    return ret;
}

CSL.XmlDOM.prototype.nodeNameIs = function (myxml,name) {
    if (name == myxml.nodeName) {
        return true;
    }
    return false;
}

CSL.XmlDOM.prototype.makeXml = function (myxml) {
    if (!myxml) {
        myxml = "<docco><bogus/></docco>";
    }
    myxml = myxml.replace(/\s*<\?[^>]*\?>\s*\n*/g, "");
    var nodetree = this.parser.parseFromString(myxml, "application/xml");
    return nodetree.firstChild;
};

CSL.XmlDOM.prototype.insertChildNodeAfter = function (parent,node,pos,datexml) {
    var myxml;
    myxml = this.importNode(node.ownerDocument, datexml);
    parent.replaceChild(myxml, node);
     return parent;
};

CSL.XmlDOM.prototype.insertPublisherAndPlace = function(myxml) {
    var group = myxml.getElementsByTagName("group");
    for (var i = 0, ilen = group.length; i < ilen; i += 1) {
        var node = group.item(i);
        var skippers = [];
        for (var j = 0, jlen = node.childNodes.length; j < jlen; j += 1) {
            if (node.childNodes.item(j).nodeType !== 1) {
                skippers.push(j);
            }
        }
        if (node.childNodes.length - skippers.length === 2) {
            var twovars = [];
            for (j = 0, jlen = 2; j < jlen; j += 1) {
                if (skippers.indexOf(j) > -1) {
                    continue;
                }
                var child = node.childNodes.item(j);                    
                var subskippers = [];
                for (var k = 0, klen = child.childNodes.length; k < klen; k += 1) {
                    if (child.childNodes.item(k).nodeType !== 1) {
                        subskippers.push(k);
                    }
                }
                if (child.childNodes.length - subskippers.length === 0) {
                    twovars.push(child.getAttribute('variable'));
                    if (child.getAttribute('suffix')
                        || child.getAttribute('prefix')) {
                        twovars = [];
                        break;
                    }
                }
            }
            if (twovars.indexOf("publisher") > -1 && twovars.indexOf("publisher-place") > -1) {
                node.setAttribute('has-publisher-and-publisher-place', true);
            }
        }
    }
};

CSL.XmlDOM.prototype.isChildOfSubstitute = function(node) {
    if (node.parentNode) {
        if (node.parentNode.tagName.toLowerCase() === "substitute") {
            return true;
        } else {
            return this.isChildOfSubstitute(node.parentNode);
        }
    }
    return false;
};

CSL.XmlDOM.prototype.addMissingNameNodes = function(myxml) {
    var nameslist = myxml.getElementsByTagName("names");
    for (var i = 0, ilen = nameslist.length; i < ilen; i += 1) {
        var names = nameslist.item(i);
        var namelist = names.getElementsByTagName("name");
        if ((!namelist || namelist.length === 0)
            && !this.isChildOfSubstitute(names)) {
            
            var doc = names.ownerDocument;
            var name = doc.createElement("name");
            names.appendChild(name);
        }
    }
};


CSL.XmlDOM.prototype.addInstitutionNodes = function(myxml) {
    var names, thenames, institution, theinstitution, name, thename, pos, len, attrname, attrval;
    names = myxml.getElementsByTagName("names");
    for (pos = 0, len = names.length; pos < len; pos += 1) {
        thenames = names.item(pos);
        name = thenames.getElementsByTagName("name");
        if (name.length == 0) {
            continue;
        }
        institution = thenames.getElementsByTagName("institution");
        if (institution.length == 0) {
            theinstitution = this.importNode(myxml.ownerDocument, this.institution);
            var theinstitutionpart = theinstitution.getElementsByTagName("institution-part").item(0);
            thename = name.item(0);
            thenames.insertBefore(theinstitution, thename.nextSibling);
            for (var j = 0, jlen = CSL.INSTITUTION_KEYS.length; j < jlen; j += 1) {
                attrname = CSL.INSTITUTION_KEYS[j];
                attrval = thename.getAttribute(attrname);
                if (attrval) {
                    theinstitutionpart.setAttribute(attrname, attrval);
                }
            }
            var nameparts = thename.getElementsByTagName("name-part");
            for (j = 0, jlen = nameparts.length; j < jlen; j += 1) {
                if ('family' === nameparts[j].getAttribute('name')) {
                    for (var k = 0, klen = CSL.INSTITUTION_KEYS.length; k < klen; k += 1) {
                        attrname = CSL.INSTITUTION_KEYS[k];
                        attrval = nameparts[j].getAttribute(attrname);
                        if (attrval) {
                            theinstitutionpart.setAttribute(attrname, attrval);
                        }
                    }
                }
            }
        }
    }
};


CSL.XmlDOM.prototype.flagDateMacros = function(myxml) {
    var pos, len, thenode, thedate;
    var nodes = myxml.getElementsByTagName("macro");
    for (pos = 0, len = nodes.length; pos < len; pos += 1) {
        thenode = nodes.item(pos);
        thedate = thenode.getElementsByTagName("date");
        if (thedate.length) {
            thenode.setAttribute('macro-has-date', 'true');
        }
    }
};

