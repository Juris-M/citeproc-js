/**
 * Functions for parsing an XML object converted to JSON.
 */

/*
  Style and locale JSON should be formatted as follows. Note that
  an empty literal should be set as an explicit empty strings within
  children:[]
  
  {
    name:"term",
    children:[
      ""
    ],
    attrs:{
      name:"author"
    }
  }

  The following script will generate correctly formatted JSON
  from a CSL style or locale file:
*/

CSL.XmlJSON = function (dataObj) {
    this.dataObj = dataObj;
    this.institution = {
        name:"institution",
        attrs:{
            "institution-parts":"long",
            "delimiter":", "
        },
        children:[
            {
                name:"institution-part",
                attrs:{
                    name:"long"
                },
                children:[]
            }
        ]
    };
};

/**
 * No need for cleaning with native JSON.
 */
CSL.XmlJSON.prototype.clean = function (json) {
    return json;
};


/**
 * Methods to call on a node.
 */
CSL.XmlJSON.prototype.getStyleId = function (myjson, styleName) {
    var tagName = 'id';
    if (styleName) {
        tagName = 'title';
    }
    var ret = "";
    var children = myjson.children;
    for (var i=0,ilen=children.length;i<ilen;i++) {
        if (children[i].name === 'info') {
            var grandkids = children[i].children;
            for (var j=0,jlen=grandkids.length;j<jlen;j++) {
                if (grandkids[j].name === tagName) {
                    ret = grandkids[j].children[0];
                }
            }
        }
    }
    return ret;
};

CSL.XmlJSON.prototype.children = function (myjson) {
    //print("children()");
    if (myjson && myjson.children.length) {
        return myjson.children.slice();
    } else {
        return false;
    }
};

CSL.XmlJSON.prototype.nodename = function (myjson) {
    //print("nodename()");
    return myjson ? myjson.name : null;
};

CSL.XmlJSON.prototype.attributes = function (myjson) {
    //print("attributes()");
    var ret = {};
    for (var attrname in myjson.attrs) {
        ret["@"+attrname] = myjson.attrs[attrname];
    }
    return ret;
};


CSL.XmlJSON.prototype.content = function (myjson) {
    //print("content()");
    // xmldom.js and xmle4x.js have "undefined" as default
    var ret = "";
    // This only catches content at first level, but that is good enough
    // for us.
    if (!myjson || !myjson.children) {
        return ret;
    }
    for (var i=0, ilen=myjson.children.length; i < ilen; i += 1) {
        if ("string" === typeof myjson.children[i]) {
            ret += myjson.children[i];
        }
    }
    return ret;
};


CSL.XmlJSON.prototype.namespace = {}

CSL.XmlJSON.prototype.numberofnodes = function (myjson) {
    //print("numberofnodes()");
    if (myjson && "number" == typeof myjson.length) {
        return myjson.length;
    } else {
        return 0;
    }
};

// getAttributeName() removed. Looks like it was not being used.

CSL.XmlJSON.prototype.getAttributeValue = function (myjson,name,namespace) {
    //print("getAttributeValue()");
    var ret = "";
    if (namespace) {
        name = namespace+":"+name;
    }
    if (myjson) {
        if (myjson.attrs) {
            if (myjson.attrs[name]) {
                ret = myjson.attrs[name];
            } else {
                ret = "";
            }
        }
    }
    return ret;
}

CSL.XmlJSON.prototype.getNodeValue = function (myjson,name) {
    //print("getNodeValue()");
    var ret = "";
    if (name){
        for (var i=0, ilen=myjson.children.length; i < ilen; i += 1) {
            if (myjson.children[i].name === name) {
                // This will always be Object() unless empty
                if (myjson.children[i].children.length) {
                    ret = myjson.children[i];
                } else {
                    ret = "";
                }
            }
        }
    } else if (myjson) {
        ret = myjson;
    }
    // Just being careful here, following the former DOM code. The JSON object we receive 
    // for this should be fully normalized.
    if (ret && ret.children && ret.children.length == 1 && "string" === typeof ret.children[0]) {
        ret = ret.children[0];
    }
    return ret;
}

CSL.XmlJSON.prototype.setAttributeOnNodeIdentifiedByNameAttribute = function (myjson,nodename,partname,attrname,val) {
    //print("setAttributeOnNodeIdentifiedByNameAttribute()");
    var pos, len, xml, nodes, node;
    if (attrname.slice(0,1) === '@'){
        attrname = attrname.slice(1);
    }
    // In the one place this is used in citeproc-js code, it doesn't need to recurse.
    for (var i=0,ilen=myjson.children.length; i<ilen; i += 1) {
        if (myjson.children[i].name === nodename && myjson.children[i].attrs.name === partname) {
            myjson.children[i].attrs[attrname] = val;
        }
    }
}

CSL.XmlJSON.prototype.deleteNodeByNameAttribute = function (myjson,val) {
    //print("deleteNodeByNameAttribute()");
    var i, ilen;
    for (i = 0, ilen = myjson.children.length; i < ilen; i += 1) {
        if (!myjson.children[i] || "string" === typeof myjson.children[i]) {
            continue;
        }
        if (myjson.children[i].attrs.name == val) {
            myjson.children = myjson.children.slice(0,i).concat(myjson.children.slice(i+1));
        }
    }
}

CSL.XmlJSON.prototype.deleteAttribute = function (myjson,attrname) {
    //print("deleteAttribute()");
    var i, ilen;
    if ("undefined" !== typeof myjson.attrs[attrname]) {
        myjson.attrs.pop(attrname);
    }
}

CSL.XmlJSON.prototype.setAttribute = function (myjson,attr,val) {
    //print("setAttribute()");
    myjson.attrs[attr] = val;
    return false;
}

CSL.XmlJSON.prototype.nodeCopy = function (myjson,clone) {
    //print("nodeCopy()");
    if (!clone) {
        var clone = {};
    }
    if ("object" === typeof clone && "undefined" === typeof clone.length) {
        // myjson is an object
        for (var key in myjson) {
            if ("string" === typeof myjson[key]) {
                clone[key] = myjson[key];
            } else if ("object" === typeof myjson[key]) {
                if ("undefined" === typeof myjson[key].length) {
                    clone[key] = this.nodeCopy(myjson[key],{});
                } else {
                    clone[key] = this.nodeCopy(myjson[key],[]);
                }
            }
        }
    } else {
        // myjson is an array
        for (var i=0,ilen=myjson.length;i<ilen; i += 1) {
            if ("string" === typeof myjson[i]) {
                clone[i] = myjson[i];
            } else {
                // If it's at the first level of an array, it's an object.
                clone[i] = this.nodeCopy(myjson[i],{});
            }
        }
    }
    return clone;
}

CSL.XmlJSON._nodesByNameCaches = new WeakMap();

CSL.XmlJSON.prototype.getNodesByName = function (myjson,name,nameattrval) {
    //print("getNodesByName()");
    if (!myjson || !myjson.children) {
        return [];
    }

    let getCache = (myjson) => {
        if (CSL.XmlJSON._nodesByNameCaches.has(myjson)) {
            return CSL.XmlJSON._nodesByNameCaches.get(myjson);
        }

        let cache = new Map();
        CSL.XmlJSON._nodesByNameCaches.set(myjson, cache);

        let name = myjson.name;
        if (!cache.has(name)) {
            cache.set(name, []);
        }
        cache.get(name).push(myjson);

        for (let child of myjson.children) {
            if (typeof child !== "object") continue;
            let childCache = getCache(child);
            // Copy cache entries upwards
            for (let [cacheKey, nodes] of childCache) {
                if (!cache.has(cacheKey)) {
                    cache.set(cacheKey, []);
                }
                cache.get(cacheKey).push(...nodes);
            }
        }

        return cache;
    };
    
    let cache = getCache(myjson);
    let nodes = cache.get(name);
    if (!nodes) {
        return [];
    }
    if (nameattrval) {
        return nodes.filter(node => node.attrs.name === nameattrval);
    } else {
        return Array.from(nodes);
    }
}

CSL.XmlJSON.prototype.nodeNameIs = function (myjson,name) {
    //print("nodeNameIs()");
    if (typeof myjson === "undefined") {
        return false;
    }
    if (name == myjson.name) {
        return true;
    }
    return false;
}

CSL.XmlJSON.prototype.makeXml = function (myjson) {
    //print("makeXml()");
    if ("string" === typeof myjson) {
        if (myjson.slice(0, 1) === "<") {
            myjson = this.jsonStringWalker.walkToObject(myjson);
        } else {
            myjson = JSON.parse(myjson);
        }
    }
    return myjson;
};

CSL.XmlJSON.prototype.insertChildNodeAfter = function (parent,node,pos,datejson) {
    //print("insertChildNodeAfter()");
    // Function is misnamed: this replaces the node
    for (var i=0,ilen=parent.children.length;i<ilen;i+=1) {
        if (node === parent.children[i]) {
            parent.children = parent.children.slice(0,i).concat([datejson]).concat(parent.children.slice(i+1));
            break;
        }
    }
    return parent;
};


CSL.XmlJSON.prototype.insertPublisherAndPlace = function(myjson) {
    if (myjson.name === "group") {
        var useme = true;
        var mustHaves = ["publisher","publisher-place"];
        for (var i=0,ilen=myjson.children.length;i<ilen;i+=1) {
            var haveVarname = mustHaves.indexOf(myjson.children[i].attrs.variable);
            var isText = myjson.children[i].name === "text";
            if (isText && haveVarname > -1 && !myjson.children[i].attrs.prefix && !myjson.children[i].attrs.suffix) {
                mustHaves = mustHaves.slice(0,haveVarname).concat(mustHaves.slice(haveVarname+1));
            } else {
                useme = false;
                break;
            }
        }
        if (useme && !mustHaves.length) {
            myjson.attrs["has-publisher-and-publisher-place"] = true;
       }
    }
    for (var i=0,ilen=myjson.children.length;i<ilen;i+=1) {
        if ("object" === typeof myjson.children[i]) {
            this.insertPublisherAndPlace(myjson.children[i]);
        }
    }    
}
/*
CSL.XmlJSON.prototype.insertPublisherAndPlace = function(myxml) {
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
            for (var j = 0, jlen = 2; j < jlen; j += 1) {
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
*/

CSL.XmlJSON.prototype.isChildOfSubstitute = function(parents) {
    if (parents.length > 0) {
        var myparents = parents.slice();
        var parent = myparents.pop();
        if (parent === "substitute") {
            return true;
        } else {
            return this.isChildOfSubstitute(myparents);
        }
    }
    return false;
};

CSL.XmlJSON.prototype.addMissingNameNodes = function(myjson,parents) {
    if (!parents) {
        parents = [];
    }
    if (myjson.name === "names") {
        // Trawl through children to decide whether a name node is needed here
        if (!this.isChildOfSubstitute(parents)) {
            var addName = true;
            for (var i=0,ilen=myjson.children.length;i<ilen;i++) {
                if (myjson.children[i].name === "name") {
                    addName = false;
                    break;
                }
            }
            if (addName) {
                myjson.children = [{name:"name",attrs:{},children:[]}].concat(myjson.children);
            }
        }
    }
    parents.push(myjson.name);
    for (var i=0,ilen=myjson.children.length;i<ilen;i+=1) {
        if ("object" === typeof myjson.children[i]) {
            this.addMissingNameNodes(myjson.children[i],parents);
        }
    }
    parents.pop();
}


CSL.XmlJSON.prototype.addInstitutionNodes = function(myjson) {
    //print("addInstitutionNodes()");
    var names, thenames, institution, theinstitution, name, thename, xml, pos, len;
    // The idea here is to map relevant attributes from name and nampart=family
    // to the "long" institution-part node, when and only when forcing insert
    // of the default node.
    if (myjson.name === "names") {
        // do stuff
        var attributes = {};
        var insertPos = -1;
        for (var i=0,ilen=myjson.children.length;i<ilen;i+=1) {
            if (myjson.children[i].name == "name") {
                for (var key in myjson.children[i].attrs) {
                    attributes[key] = myjson.children[i].attrs[key];
                }
                attributes.delimiter = myjson.children[i].attrs.delimiter;
                attributes.and = myjson.children[i].attrs.and;
                insertPos = i;
                for (var k=0,klen=myjson.children[i].children.length;k<klen;k+=1) {
                    if (myjson.children[i].children[k].attrs.name !== 'family') {
                        continue;
                    }
                    for (var key in myjson.children[i].children[k].attrs) {
                        attributes[key] = myjson.children[i].children[k].attrs[key];
                    }
                }
            }
            if (myjson.children[i].name == "institution") {
                insertPos = -1;
                break;
            }
        }
        if (insertPos > -1) {
            var institution = this.nodeCopy(this.institution);
            for (var i=0,ilen = CSL.INSTITUTION_KEYS.length;i<ilen;i+=1) {
                var attrname = CSL.INSTITUTION_KEYS[i];
                if ("undefined" !== typeof attributes[attrname]) {
                    institution.children[0].attrs[attrname] = attributes[attrname];
                }
                if (attributes.delimiter) {
                    institution.attrs.delimiter = attributes.delimiter;
                }
                if (attributes.and) {
                    institution.attrs.and = attributes.and;
                }
            }
            myjson.children = myjson.children.slice(0,insertPos+1).concat([institution]).concat(myjson.children.slice(insertPos+1));
        }
    }
    for (var i=0,ilen=myjson.children.length;i<ilen;i+=1) {
        if ("string" === typeof myjson.children[i]) {
            continue;
        }
        // Recurse
        this.addInstitutionNodes(myjson.children[i]);
    }
}
CSL.XmlJSON.prototype.flagDateMacros = function(myjson) {
    // print("flagDateMacros()");
    for (var i=0,ilen=myjson.children.length;i<ilen;i+=1) {
        if (myjson.children[i].name === "macro") {
            if (this.inspectDateMacros(myjson.children[i])) {
                myjson.children[i].attrs["macro-has-date"] = "true";
            }
        }
    }
}
CSL.XmlJSON.prototype.inspectDateMacros = function(myjson) {
    //print("inspectDateMacros()");
    if (!myjson || !myjson.children) {
        return false;
    }
    if (myjson.name === "date") {
        return true;
    } else {
        for (var i=0,ilen=myjson.children.length;i<ilen;i+=1) {
            if (this.inspectDateMacros(myjson.children[i])) {
                return true;
            }
        }
    }
    return false;
}

/*
 * Clean serialized XML
 */
CSL.stripXmlProcessingInstruction = function (xml) {
    if (!xml) {
        return xml;
    }
    xml = xml.replace(/^<\?[^?]+\?>/, "");
    xml = xml.replace(/<!--[^>]+-->/g, "");
    xml = xml.replace(/^\s+/g, "");
    xml = xml.replace(/\s+$/g, "");
    return xml;
};


/*
 * String parser for XML inputs
 */
CSL.parseXml = function(str) {

    var _pos = 0;
    var _obj = {children:[]};
    var _stack = [_obj.children];

    function _listifyString(str) {
        str = str.split(/(?:\r\n|\n|\r)/).join(" ").replace(/>[	 ]+</g, "><").replace(/<\!--.*?-->/g, "");
        var lst = str.split("><");
        var stylePos = null;
        for (var i=0,ilen=lst.length;i<ilen;i++) {
            if (i > 0) {
                lst[i] = "<" + lst[i];
            }
            if (i < (lst.length-1)) {
                lst[i] = lst[i] + ">";
            }
            if ("number" != typeof stylePos) {
                if (lst[i].slice(0, 7) === "<style " || lst[i].slice(0, 8) == "<locale ") {
                    stylePos = i;
                }
            }
        }
        lst = lst.slice(stylePos);
        // Combine open/close elements for empty terms,
        // so that they will be passed through correctly
        // as empty strings.
        for (var i=lst.length-2;i>-1;i--) {
            if (lst[i].slice(1).indexOf("<") === -1) {
                var stub = lst[i].slice(0, 5);
                if (lst[i].slice(-2) !== "/>") {
                    if (stub === "<term") {
                        if (lst[i+1].slice(0, 6) === "</term") {
                            lst[i] = lst[i] + lst[i+1];
                            lst = lst.slice(0, i+1).concat(lst.slice(i+2));
                        }
                    } else if (["<sing", "<mult"].indexOf(stub) > -1) {
                        if (lst[i].slice(-2) !== "/>" && lst[i+1].slice(0, 1) === "<") {
                            lst[i] = lst[i] + lst[i+1];
                            lst = lst.slice(0, i+1).concat(lst.slice(i+2));
                        }
                    }
                }
            }
        }
        return lst;
    }

    function _decodeHtmlEntities(str) {
        return str
            .split("&amp;").join("&")
            .split("&quot;").join("\"")
            .split("&gt;").join(">").split("&lt;").join("<")
            .replace(/&#([0-9]{1,6});/gi, function(match, numStr) {
                var num = parseInt(numStr, 10); // read num as normal number
                return String.fromCharCode(num);
            })
            .replace(/&#x([a-f0-9]{1,6});/gi, function(match, numStr){
                var num = parseInt(numStr, 16); // read num as hex
                return String.fromCharCode(num);
            });
    }

    function _getAttributes(elem) {
        var m = elem.match(/([^\'\"=	 ]+)=(?:\"[^\"]*\"|\'[^\']*\')/g);
        if (m) {
            for (var i=0,ilen=m.length;i<ilen;i++) {
                m[i] = m[i].replace(/=.*/, "");
            }
        }
        return m;
    }

    function _getAttribute(elem, attr) {
        var rex = RegExp('^.*[	 ]+' + attr + '=(\"(?:[^\"]*)\"|\'(?:[^\']*)\').*$');
        var m = elem.match(rex);
        return m ? m[1].slice(1, -1) : null;
    }

    function _getTagName(elem) {
        var rex = RegExp("^<([^	 />]+)");
        var m = elem.match(rex);
        return m ? m[1] : null;
    }
    

    function _castObjectFromOpeningTag(elem) {
        var obj = {};
        obj.name = _getTagName(elem);
        obj.attrs = {};
        var attributes = _getAttributes(elem);
        if (attributes) {
            for (var i=0,ilen=attributes.length;i<ilen;i++) {
                var attr = {
                    name: attributes[i],
                    value: _getAttribute(elem, attributes[i])
                }
                obj.attrs[attr.name] = _decodeHtmlEntities(attr.value);
            }
        }
        obj.children = [];
        return obj;
    }

    function _extractTextFromCompositeElement(elem) {
        var m = elem.match(/^.*>([^<]*)<.*$/);
        return _decodeHtmlEntities(m[1]);
    }

    function _appendToChildren(obj) {
        _stack.slice(-1)[0].push(obj);
    }

    function _extendStackWithNewChildren(obj) {
        _stack.push(obj.children);
    }

    function processElement(elem) {
        var obj;
        if (elem.slice(1).indexOf('<') > -1) {
            // withtext
            var tag = elem.slice(0, elem.indexOf('>')+1);
            obj = _castObjectFromOpeningTag(tag);
            obj.children = [_extractTextFromCompositeElement(elem)];
            _appendToChildren(obj);
        } else if (elem.slice(-2) === '/>') {
            // singleton
            obj = _castObjectFromOpeningTag(elem);
            // Empty term as singleton
            if (_getTagName(elem) === 'term') {
                obj.children.push('');
            }
            _appendToChildren(obj);
        } else if (elem.slice(0, 2) === '</') {
            // close
            _stack.pop();
        } else {
            // open
            obj = _castObjectFromOpeningTag(elem);
            _appendToChildren(obj)
            _extendStackWithNewChildren(obj);
        }
    }

    var lst = _listifyString(str);

    for (var i=0,ilen=lst.length;i<ilen;i++) {
        var elem = lst[i];
        processElement(elem);
    }
    return _obj.children[0];
}
