#!/usr/bin/env node
"use strict";

// Memory usage test for CSL.Engine instantiation.
//
// Usage: node --expose-gc mem_test.js [path-to-style.csl]
//
// If no style path is provided, downloads chicago-shortened-notes-bibliography
// from the citation-style-language/styles repo (155 macros, 6 macro-based sort
// keys -- good for memory testing).

var fs = require("fs");
var path = require("path");
var ROOT = path.join(__dirname, "..");
var CSL = require(path.join(ROOT, "citeproc_commonjs.js"));

var STYLE_URL = "https://raw.githubusercontent.com/citation-style-language/styles/master/chicago-shortened-notes-bibliography.csl";
var CACHED_STYLE_PATH = path.join(require("os").tmpdir(), "citeproc-mem-test-chicago-shortened-notes-bibliography.csl");
var FALLBACK_STYLE_PATH = path.join(ROOT, "docs", "chicago-fullnote-bibliography.csl");

// Load locale
var localeXml = fs.readFileSync(path.join(ROOT, "locale", "locales-en-US.xml"), "utf8");

// Load style
var stylePath = process.argv[2];
var styleXml;
if (stylePath) {
	styleXml = fs.readFileSync(stylePath, "utf8");
}
else if (fs.existsSync(CACHED_STYLE_PATH)) {
	stylePath = CACHED_STYLE_PATH;
	styleXml = fs.readFileSync(CACHED_STYLE_PATH, "utf8");
}
else {
	// Download chicago-shortened-notes-bibliography and cache in tmp
	try {
		console.log("Downloading style...");
		var execFileSync = require("child_process").execFileSync;
		styleXml = execFileSync("curl", ["-sfL", STYLE_URL], { encoding: "utf8" });
		fs.writeFileSync(CACHED_STYLE_PATH, styleXml);
		stylePath = CACHED_STYLE_PATH;
	}
	catch (e) {
		console.log("Download failed, falling back to " + FALLBACK_STYLE_PATH);
		stylePath = FALLBACK_STYLE_PATH;
		styleXml = fs.readFileSync(FALLBACK_STYLE_PATH, "utf8");
	}
}
console.log("Style: " + stylePath);

// Minimal sys object
var sys = {
	retrieveLocale: function (lang) {
		if (lang === "en-US") return localeXml;
		try {
			return fs.readFileSync(path.join(ROOT, "locale", "locales-" + lang + ".xml"), "utf8");
		}
		catch (e) {
			return null;
		}
	},
	retrieveItem: function (id) {
		return {};
	}
};

function gc() {
	if (global.gc) {
		global.gc();
		global.gc();
		global.gc();
	}
}

function heapMB() {
	gc();
	return Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 10) / 10;
}

// Warm up -- load code paths
var warmup = new CSL.Engine(sys, styleXml, "en-US");
warmup = null;
gc();

var RUNS = 5;

console.log("Creating " + RUNS + " CSL.Engine instances...\n");

var baseline = heapMB();
console.log("Baseline heap: " + baseline + " MB");

var engines = [];
for (var i = 0; i < RUNS; i++) {
	var before = heapMB();
	engines.push(new CSL.Engine(sys, styleXml, "en-US"));
	var after = heapMB();
	console.log("Engine " + (i + 1) + ": " + before + " -> " + after + " MB (delta=" + (after - before).toFixed(1) + " MB)");
}

console.log("\nTotal heap after " + RUNS + " engines: " + heapMB() + " MB");
console.log("Total delta from baseline: " + (heapMB() - baseline).toFixed(1) + " MB");
console.log("Average per engine: " + ((heapMB() - baseline) / RUNS).toFixed(1) + " MB");
