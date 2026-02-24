// demo.js
// for citeproc-js CSL citation formatter

var styleID = "chicago-notes-bibliography";

// Get the citations that we are supposed to render, in the CSL-json format
var xhr = new XMLHttpRequest();

var itemsArray = [];
var citations = [];
for (var i=1,ilen=8;i<ilen;i++) {
    xhr.open('GET', 'citations-' + i + '.json', false);
    xhr.send(null);
    citations = citations.concat(JSON.parse(xhr.responseText));

    xhr.open('GET', 'items-' + i + '.json', false);
    xhr.send(null);
    itemsArray = itemsArray.concat(JSON.parse(xhr.responseText));
}

var items = {};
for (item of itemsArray) {
    items[item.id] = item;
}

xhr.open('GET', styleID + '.csl', false);
xhr.send(null);
var style = xhr.responseText;

// Initialize a system object, which contains two methods needed by the
// engine.
citeprocSys = {
    // Given a language tag in RFC-4646 form, this method retrieves the
    // locale definition file.  This method must return a valid *serialized*
    // CSL locale. (In other words, an blob of XML as an unparsed string.  The
    // processor will fail on a native XML object or buffer).
    retrieveLocale: function (lang){
        xhr.open('GET', 'locales-' + lang + '.xml', false);
        xhr.send(null);
        return xhr.responseText;
    },

    // Given an identifier, this retrieves one citation item.  This method
    // must return a valid CSL-JSON object.
    retrieveItem: function(id){
        return items[id];
    }
};

// Given the identifier of a CSL style, this function instantiates a CSL.Engine
// object that can render citations in that style.
function getProcessor() {
    // Instantiate and return the engine
    var citeproc = new CSL.Engine(citeprocSys, style);
    return citeproc;
};

var startTime = performance.now();
var citeproc = getProcessor();
var endTime = performance.now();
console.log(`Initialized CSL.Engine in ${endTime - startTime} ms`);

function runOneStep(idx) {
    var citeDiv = document.getElementById('cite-div');
    var citationParams = citations[idx];
    var citationStrings = citeproc.processCitationCluster(citationParams[0], citationParams[1], [])[1];
    for (var citeInfo of citationStrings) {
        // Prepare node
        var newNode = document.createElement("div");
        newNode.setAttribute("id", "n" + citeInfo[2]);
        newNode.innerHTML = citeInfo[1];
        // Try for old node
        var oldNode = document.getElementById("node-" + citeInfo[2]);
        if (oldNode) {
            citeDiv.replaceChild(newNode, oldNode);
        } else {
            citeDiv.appendChild(newNode);
        }
        newNode.scrollIntoView();
    }
    runRenderBib(idx+1);
}

// This runs at document ready, and renders the bibliography
function renderBib() {
    t0 = performance.now();
    runRenderBib(0);
}
function runRenderBib(idx) {
    if (idx === citations.length) {
        var t1 = performance.now();
        var timeDiv = document.getElementById("time-div");
        var timeSpan = document.getElementById("time-span");
        timeSpan.innerHTML = (t1 - t0) + " milliseconds";
        timeDiv.hidden = false;
        delete citations;
        delete style;
        // Bib
        var bibDiv = document.getElementById('bib-div');
        var bibResult = citeproc.makeBibliography();
        bibDiv.innerHTML = bibResult[1].join('\n');
    } else {
        setTimeout(function() {
            runOneStep(idx);
        }, 0)
    }
}
