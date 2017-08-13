#!/usr/bin/python2 -u

import sys,os,re
from datetime import datetime
from stat import *
import tempfile
from cStringIO import StringIO
from cPickle import Pickler, Unpickler
import subprocess as sub 
import string

reload(sys)
sys.setdefaultencoding("utf-8") # Needs Python Unicode build !

try:
    import json
except:
    import simplejson as json

class ElementMissing(Exception):
    pass

class TooFewArgs(Exception):
    pass

class NoFilesError(Exception):
    pass

class FileNotFound(Exception):
    pass

class MissingHumansFile(Exception):
    pass

class NoLicense(Exception):
    pass

def fixEndings(str):
    str = string.replace(str, '\r\n', '\n')
    str = string.replace(str, '\r', '\n')
    return str

def path(name):
    if name == "std":
        return os.path.join("tests", "fixtures", "std", "processor-tests", "humans")
    elif name == "styles":
        return os.path.join("tests", "fixtures", "std", "styles")
    elif name == "run":
        return os.path.join("tests", "fixtures", "run")
    elif name == "bundled":
        return os.path.join("tests", "bundled")
    elif name == "styletests":
        return os.path.join("tests", "styletests")
    elif name == "local":
        return os.path.join("tests", "fixtures", "local")
    elif name == "config":
        return os.path.join("tests", "config")
    elif name == "citeproc-js":
        return os.path.join("tests", "citeproc-js")
    elif name == "runners":
        return os.path.join("tests", "runners")
    elif name == "demo":
        return os.path.join("demo")

class ApplyLicense:

    def __init__(self):
        self.rex = "(?sm)^^(/\*.*?^\s*\*/\n*)(.*)"
        lines = fixEndings(open(os.path.join("LICENSE")).read()).strip()
        lines = lines.split('\n')
        for pos in range(0,len(lines),1):
            lines[pos] = " * %s" % lines[pos]
        self.license = '/*\n%s\n */\n' % '\n'.join(lines)

    def apply(self,suppressConsole=False):
        if not suppressConsole:
            print self.license
        #for p in [".", "src", path("std"), path("local"), path("bundled"), path("styletests"), path("citeproc-js"), path("demo")]:
        for p in ["."]:
            for file in os.listdir(p):
                if not file.startswith("citeproc"):
                    continue
                self.process_file(p,file)

    def process_file(self,p,file):
        filepath = os.path.join(p, file)
        if not filepath.endswith(".js") and not filepath.endswith(".txt") and not filepath.endswith(".json") and not filepath.endswith("README.txt"): return
        text = fixEndings(open(filepath, "rb").read())
        oldtext = text
        m = re.match(self.rex,text)
        if m:
            text = "%s\n%s" % (self.license, m.group(2))
            #text = "%s" % (m.group(2),)
        else:
            text = "%s%s" % (self.license, text)
            #pass
        if text.strip() != oldtext.strip():
            open(filepath,"w+b").write(text)

class Bundle:
    
    def __init__(self, mode=None):
        self.citeprocs = [
            {
                "bundle_name": "citeproc.js", 
                "e4x": False,
                "note": "without e4x support"
            },
            {
                "bundle_name": "citeproc_with_e4x.js",
                "e4x": True,
                "note": "with e4x support"
            }
        ]
        f = ["load"]
        f.extend(["print"])
        f.extend(["xmljson","xmldom","xmle4xLoad","system","sort","util_disambig","util_nodes","util_dateparser","build"]);
        f.extend(["util_static_locator","util_processor","util_citationlabel","api_control"]);
        f.extend(["queue","state","api_cite","api_bibliography","util_integration","api_update"]);
        f.extend(["util_locale","util_locale_sniff","node_bibliography","node_choose","node_citation","node_comment"]);
        f.extend(["node_date","node_datepart","node_elseif","node_else","node_etal","node_group"]);
        f.extend(["node_if","node_conditions","node_condition","util_conditions","node_info"]);
        f.extend(["node_institution","node_institutionpart","node_key"]);
        f.extend(["node_label","node_layout","node_macro","util_names_output","util_names_tests"]);
        f.extend(["util_names_truncate","util_names_divide","util_names_join","util_names_common"]);
        f.extend(["util_names_constraints","util_names_disambig","util_names_etalconfig","util_names_etal"]);
        f.extend(["util_names_render","util_publishers","util_label","node_name","node_namepart"]);
        f.extend(["node_names","node_number","node_sort","node_substitute","node_text","attributes"]);
        f.extend(["stack","util_parallel","util","util_transform","obj_token","obj_ambigconfig"]);
        f.extend(["obj_blob","obj_number","util_datenode","util_date","util_names","util_dates"]);
        f.extend(["util_sort","util_substitute","util_number","util_page","util_flipflop"]);
        f.extend(["formatters","formats","registry","disambig_names","disambig_citations"]);
        f.extend(["disambig_cites", "util_modules","util_name_particles"]);
        self.files = f
    
    def deleteOldBundles(self):
        for citeproc in self.citeprocs:
            if os.path.exists(citeproc["bundle_name"]):
                os.unlink(citeproc["bundle_name"])
                
    def cleanFile(self, subfile, e4xSupport):
        subfile = fixEndings(subfile)
        subfile = re.sub("(?m)^(\/\*.*?\*\/)$", "", subfile)
        subfile = re.sub("(?sm)^\s*\/\*.*?^\s*\*\/","",subfile)
        subfile = re.sub("(?sm)^\s*//SNIP-START.*?^\s*//SNIP-END","",subfile)
        subfile = re.sub("(?sm)^\s*//.*?$","",subfile)
        if not e4xSupport:
            subfile = re.sub("(?sm)^\s*load.*?$","",subfile)
        subfile = re.sub("(?sm)^\s*\n","",subfile)
        return subfile

    def createNewBundles(self):
        for citeproc in self.citeprocs:
            file = ""
            for f in self.files:
                filename = os.path.join( "src", "%s.js" % f)
                ifh = open(filename, "rb")
                file += self.cleanFile(ifh.read(), citeproc["e4x"])
            open(citeproc["bundle_name"],"w+b").write(file)
            print "Wrote %s (processor %s)" % (citeproc["bundle_name"], citeproc["note"])

class Params:
    def __init__(self,opt,args,category,force=None):
        self.opt = opt
        self.args = args
        self.script = os.path.split(sys.argv[0])[1]
        self.pickle = ".".join((os.path.splitext( self.script )[0], "pkl"))
        self.force = force
        self.category = category
        self.files = {}
        self.files['humans'] = {}
        self.files['machines'] = []
        mypath = os.path.split(sys.argv[0])[0]
        self.base = os.path.join( mypath )
        if len(self.base):
            os.chdir(self.base)
        self.tests = os.path.join( os.getcwd(), "tests")
        self.runners = os.path.join( self.tests, "runners")
        self.makedirs()
        self.initConfig()
        self.getFilePointers()

    def makedirs(self):
        for dir in ("std", "citeproc-js", "runners"):
            p = path(dir)
            if not os.path.exists(p):
                os.makedirs(p)
        for subdir in ("humans","machines"):
            p = os.path.join(path("run"), subdir)
            if not os.path.exists(p):
                os.makedirs(p)

    def getSourcePaths(self):
        #if self.opt.processor:
        if False:
            print "opt.processor is WIP"
        else:
            if len(self.args) == 2:
                filename = "%s_%s.txt" % tuple(self.args)
                self.files['humans'][filename] = os.path.split(self.file_pointers[filename])
            else:
                for filename in self.file_pointers:
                    self.files['humans'][filename] = os.path.split(self.file_pointers[filename])
    
    def clearSource(self):
        for subdir in ["run"]:
            for file in os.listdir(os.path.join(path(subdir), "machines")):
                if not file.endswith(".json"): continue
                os.unlink(os.path.join(path(subdir), "machines", file))

    def refreshSource(self,force=False):
        groups = {}
        for filename in self.files['humans'].keys():
            hpath = self.files['humans'][filename]
            mpath = os.path.join("tests", "fixtures", "run", "machines", "%s.json" % filename[:-4] )
            hp = os.path.sep.join(hpath)
            mp = os.path.join(mpath)
            #if force:
            #    self.grindFile(hpath,filename,mp)
            if not os.path.exists(mp):
                self.grindFile(hpath,filename,mp)
                if self.opt.verbose:
                    print "Created: %s" % mp
            hmod = os.stat(hp)[ST_MTIME]
            mmod = os.stat(mp)[ST_MTIME]
            if hmod > mmod:
                if self.opt.verbose:
                    print "Old: %s" % mp
                self.grindFile(hpath,filename,mp)
            #if not self.opt.processor:
            if True:
                m = re.match("([-a-z]*)_.*",filename)
                if m:
                    groupkey = m.group(1)
                    if not groups.has_key(groupkey):
                        groups[groupkey] = {"mtime":0,"tests":[]}
                    groups[groupkey]["tests"].append(filename)
                    if hmod > groups[groupkey]["mtime"]:
                        groups[groupkey]["mtime"] = mmod
        if len(self.args) < 2:
            for group in groups.keys():
                gp = os.path.join(path("bundled"), "%s.js"%group)
                needs_gp = True
                if os.path.exists( gp ):
                    needs_gp = False
                    gt = os.stat(gp)[ST_MTIME]
                # if force or needs_gp or groups[group]["mtime"] > gt:
                if needs_gp or groups[group]["mtime"] > gt:
                    if self.opt.verbose:
                        sys.stdout.write("!")
                    ofh = open( os.path.join(path("bundled"), "%s.js" % group), "w+b" )
                    group_text = '''dojo.provide("%s.%s");
doh.register("%s.%s", [
''' % (self.category,group,self.category,group)
                    ofh.write(group_text)
                    for filename in [x[:-4] for x in groups[group]["tests"]]:
                        if self.opt.verbose:
                            sys.stdout.write("+")
                        entry_text = '''    function(){
        var test = new StdRhinoTest("%s", "%s");
        doh.assertEqual(test.result, test.run());
    }, 
''' % (filename, self.opt.engine)
                        ofh.write(entry_text)
                    ofh.write("]);\n")

    def buildRunner(self):
        has_files = False
        ofh = open( os.path.join(path("runners"), "run.js"), "w+b")
        header = 'dojo.require("doh.runner");\n'
        ofh.write(header)
        #if self.opt.processor:
        if False:
            testpath = path("citeproc-js")
            self.category = "citeproc_js"
        else:
            testpath = path("bundled")
            self.category = "std"
        if len(args) == 2:
            keys = self.files['humans'].keys()
            if len(keys):
                file = keys[0]
                set = os.path.split( self.files['humans'][file][0] )[-1]
                body = '''doh.register("%s.%s", [
    function(){
        var test = new StdRhinoTest("%s","%s");
        doh.assertEqual(test.result, test.run());
    },
])
''' % (set, file[:-4], file[:-4], self.opt.engine)
                ofh.write(body)
                has_files = True
        else:
            count = 0
            for file in [x for x in os.listdir(testpath)]:
                if not file.endswith('.js'): continue
                if len(self.args) and not file.startswith('%s.'%args[0]): continue
                has_files = True
                ofh.write('dojo.require("%s.%s");\n' % (self.category,file[:-3]))
        ofh.write("tests.run();")
        if not has_files:
            raise NoFilesError

    def grindFile(self,hpath,filename,mp):
        if self.opt.verbose:
            sys.stdout.write(".")
        test = CslTest(opt,hpath,filename)
        test.parse()
        test.repair()
        test.dump(mp)

    def runTests(self,bundle=False):
        cp = ConfigParser()
        cp.read(os.path.join(path("config"), "test.cnf"))
        if self.opt.engine == "mozjs":
            engine = cp.get("mozjs", "command")
            nick = "mozjs"
        elif self.opt.engine == "v8":
            engine = cp.get("v8", "command")
            nick = "v8"
        elif self.opt.engine == "jsc":
            engine = cp.get("jsc", "command")
            nick = "jsc"
        else:
            engine = cp.get("rhino","command")
            nick = "rhino"
        bundleext = ""
        if bundle:
            bundleext = "-bundled"
        runpath = os.path.join(path("runners"), "%s%s.js" %(nick,bundleext))

        command = "%s %s" % (engine,runpath)
        ifh = sub.Popen(command,shell=True, stdout=sub.PIPE).stdout
        while 1:
            line = ifh.readline()
            if not line: break
            line = fixEndings(line)
            sys.stdout.write(line)

    def validateSource(self):
        skip_to_pos = 0
        if os.path.exists(self.pickle):
            upfh = open(self.pickle, "rb")
            unpickler = Unpickler(upfh)
            old_opt,old_pos = unpickler.load()
            if self.opt == old_opt:
                skip_to_pos = old_pos
                for i in range(0,skip_to_pos,1):
                    sys.stdout.write(".")
        pos = -1
        files = self.files['humans'].keys()
        files.sort()
        cp = ConfigParser()
        cp.read(os.path.join(path("config"), "test.cnf"))
        validator_path = cp.get("validation", "validator")
        csl_schema_path = cp.get("validation", "schema")
        cslm_schema_path = cp.get("validation", "schema-m")
        for filename in files:
            pos += 1
            if pos < skip_to_pos: continue
            p = self.files['humans'][filename]
            test = CslTest(opt,p,filename,pos=pos)
            test.parse()
            test.validate(validator_path, csl_schema_path, cslm_schema_path)
        if os.path.exists( self.pickle ):
            os.unlink(self.pickle)

    def initConfig(self):

        if not os.path.exists(path("bundled")):
            os.makedirs(path("bundled"))

        if not os.path.exists(path("styletests")):
            os.makedirs(path("styletests"))

        if not os.path.exists(path("std")):
            os.makedirs(path("std"))

        if not os.path.exists(os.path.join(path("run"))):
            os.makedirs(path("run"))

        if not os.path.exists(os.path.join(os.path.join(path("run"), "machines"))):
            os.makedirs(os.path.join(path("run"), "machines"))

        if not os.path.exists(os.path.join(os.path.join(path("run"), "humans"))):
            os.makedirs(os.path.join(path("run"), "humans"))

        if not os.path.exists(path("config")):
            os.makedirs(path("config"))

        if not os.path.exists(os.path.join(path("config"), "test.cnf")):
            test_template = '''[rhino]
command: java -client -jar ./rhino/js-1.7R3.jar -opt 8
'''
            ofh = open(os.path.join(path("config"), "test.cnf"), "w+b" )
            ofh.write(test_template)
            ofh.close()

    def getFilePointers(self):
        self.file_pointers = {}
        sourcedirs = [path("local"), path("std")]
        for sourcedir in sourcedirs:
            filenames = os.listdir(sourcedir)
            filenames.sort()
            for filename in filenames:
                if not filename.endswith(".txt"):
                    continue
                if self.file_pointers.has_key(filename):
                    print "WARNING: duplicate fixture name \"%s\"" % filename
                self.file_pointers[filename] = os.path.join(sourcedir, filename)

class CslTest:
    def __init__(self,opt,hpath,testname,pos=0):
        self.opt = opt
        self.pos = pos
        self.testname = testname
        self.hpath = hpath
        self.hp = os.path.sep.join(hpath)
	self.CREATORS = ["author","editor","translator","recipient","interviewer"]
        self.CREATORS += ["composer","original-author","container-author","collection-editor"]
        self.RE_ELEMENT = '(?sm)^(.*>>=[^\n]*%s[^\n]+)\n(.*)(\n<<=.*%s.*)'
        self.RE_FILENAME = '^[-a-z]+_[a-zA-Z0-9]+\.txt$'
        self.script = os.path.split(sys.argv[0])[1]
        self.pickle = ".".join((os.path.splitext( self.script )[0], "pkl"))
        self.data = {}
        self.raw = fixEndings(unicode(open(os.path.sep.join(hpath), "rb").read()))

    def parse(self):
        ## print "kkk: %s" % (self.testname,)
        for element in ["MODE","CSL"]:
            self.extract(element,required=True,is_json=False)
            if element == "MODE" and self.opt.engine == "rhino":
                self.data['mode'] = "%s-rhino" % self.data['mode']
            if element == "CSL" and self.data['csl'].endswith('.csl'):
                stylepath = os.path.join(os.path.join(path("styles")), self.data['csl'])
                self.data['csl'] = fixEndings(open(stylepath, "rb").read())

        self.extract("RESULT",required=True,is_json=False,rstrip=True)
        self.extract("INPUT",required=True,is_json=True)
        self.extract("CITATION-ITEMS",required=False,is_json=True)
        self.extract("CITATIONS",required=False,is_json=True)
        self.extract("BIBENTRIES",required=False,is_json=True)
        self.extract("BIBSECTION",required=False,is_json=True)
        self.extract("ABBREVIATIONS",required=False,is_json=True)
        self.extract("OPTIONS",required=False,is_json=True)
        self.extract("MULTIAFFIX",required=False,is_json=True)
        self.extract("LANGPARAMS",required=False,is_json=True)
        self.extract("INPUT2",required=False,is_json=True)

    def extract(self,tag,required=False,is_json=False,rstrip=False):
        m = re.match(self.RE_ELEMENT %(tag,tag),self.raw)
        data = False
        if m:
            if rstrip:
                data = m.group(2).rstrip()
            else:
                data = m.group(2).strip()
        elif required:
            raise ElementMissing(self.script,tag,self.testname)
        if data != False:
            if is_json:
                data = json.loads(data)
            self.data[tag.lower().replace('-','_')] = data
        else:
            self.data[tag.lower().replace('-','_')] = False

    def repair(self):
        self.fix_dates()
        input_str = json.dumps(self.data["input"],indent=4,sort_keys=True,ensure_ascii=False)
        m = re.match(self.RE_ELEMENT % ("INPUT", "INPUT"),self.raw)
        newraw = m.group(1) + "\n" + input_str + m.group(3)
        if self.data["options"]:
            options_str = json.dumps(self.data["options"],indent=4,sort_keys=True,ensure_ascii=False)
            m = re.match(self.RE_ELEMENT % ("OPTIONS", "OPTIONS"),self.raw)
            newraw = m.group(1) + "\n" + options_str + m.group(3)
        if self.data["multiaffix"]:
            multiaffix_str = json.dumps(self.data["multiaffix"],indent=4,sort_keys=True,ensure_ascii=False)
            m = re.match(self.RE_ELEMENT % ("MULTIAFFIX", "MULTIAFFIX"),self.raw)
            newraw = m.group(1) + "\n" + multiaffix_str + m.group(3)
        if self.data["langparams"]:
            langparams_str = json.dumps(self.data["langparams"],indent=4,sort_keys=True,ensure_ascii=False)
            m = re.match(self.RE_ELEMENT % ("LANGPARAMS", "LANGPARAMS"),self.raw)
            newraw = m.group(1) + "\n" + langparams_str + m.group(3)
        if self.data["input2"]:
            input2_str = json.dumps(self.data["input2"],indent=4,sort_keys=True,ensure_ascii=False)
            m = re.match(self.RE_ELEMENT % ("INPUT2", "INPUT2"),self.raw)
            newraw = m.group(1) + "\n" + input2_str + m.group(3)
        if self.data["citation_items"]:
            citations_str = json.dumps(self.data["citation_items"],indent=4,sort_keys=True,ensure_ascii=False)
            m = re.match(self.RE_ELEMENT % ("CITATION-ITEMS", "CITATION-ITEMS"),self.raw)
            newraw = m.group(1) + "\n" + citations_str + m.group(3)
        if self.data["citations"]:
            citations_str = json.dumps(self.data["citations"],indent=4,sort_keys=True,ensure_ascii=False)
            m = re.match(self.RE_ELEMENT % ("CITATIONS", "CITATIONS"),self.raw)
            newraw = m.group(1) + "\n" + citations_str + m.group(3)
        if self.data["abbreviations"]:
            abbreviations_str = json.dumps(self.data["abbreviations"],indent=4,sort_keys=True,ensure_ascii=False)
            m = re.match(self.RE_ELEMENT % ("ABBREVIATIONS", "ABBREVIATIONS"),self.raw)
            newraw = m.group(1) + "\n" + abbreviations_str + m.group(3)
        if self.raw != newraw:
            open(self.hp,"w+b").write(newraw)

    def fix_dates(self):
        for pos in range(0, len(self.data["input"]),1):
            for k in ["issued", "event-date", "accessed", "container", "original-date"]:
                if self.data["input"][pos].has_key(k):
                    newdate = []
                    if not self.data["input"][pos][k].has_key("date-parts"):
                        start = []
                        for e in ["year","month","day"]:
                            if self.data["input"][pos][k].has_key(e):
                                start.append( self.data["input"][pos][k][e] )
                                self.data["input"][pos][k].pop(e)
                            else:
                                break
                        if start:
                            newdate.append(start)
                        end = []
                        for e in ["year_end","month_end","day_end"]:
                            if self.data["input"][pos][k].has_key(e):
                                end.append( self.data["input"][pos][k][e] )
                                self.data["input"][pos][k].pop(e)
                            else:
                                break
                        if end:
                            newdate.append(end)
                        self.data["input"][pos][k]["date-parts"] = newdate

    def dump(self, mpath):
        s = json.dumps(self.data, indent=4, sort_keys=True, ensure_ascii=False )
        s = s.replace(u"\u200b", "\\u200b")
        open(mpath,"w+b").write(s)
    def validate(self, validator_path, csl_schema_path, cslm_schema_path):
        if self.opt.verbose:
            print self.testname
        m = re.match("(?sm).*version=\"1.1mlz1\".*",self.data["csl"])
        if m:
            rnc_path = cslm_schema_path
        else:
            rnc_path = csl_schema_path
        tfd,tfilename = tempfile.mkstemp(dir=".")
        os.write(tfd,self.data["csl"])
        os.close(tfd)
        jfh = os.popen("%s %s %s" % (validator_path,rnc_path,tfilename))

        success = True
        plural = ""
        while 1:
            line = jfh.readline()
            if not line: break
            line = line.strip()
            e = re.match("^fatal:",line)
            if e:
                print line
                sys.exit()
            m = re.match(".*:([0-9]+):([0-9]+):  *error:(.*)",line)
            if m:
              if success:
                  print "\n##"
                  print "#### Error%s in CSL for test: %s" % (plural,self.hp)
                  print "##\n"
                  success = False
              print "  %s @ line %s" %(m.group(3).upper(),m.group(1))
              plural = "s"
        jfh.close()
        os.unlink(tfilename)
        if not success:
            print ""
            io = StringIO()
            io.write(self.data["csl"])
            io.seek(0)
            linepos = 1
            while 1:
                cslline = io.readline()
                if not cslline: break
                cslline = cslline.rstrip()
                print "%3d  %s" % (linepos,cslline)
                linepos += 1
            pfh = open( self.pickle,"w+b")
            pickler = Pickler( pfh )

            pickler.dump( (opt, self.pos) )
            sys.exit()
        sys.stdout.write(".")
        sys.stdout.flush()
 
if __name__ == "__main__":

    from ConfigParser import ConfigParser
    from optparse import OptionParser

    os.environ['LANG'] = "en_US.UTF-8"

    usage = '\n%prog [options] [<group> [testname]]\n%prog -p [options] [testname]'

    description="This script."

    parser = OptionParser(usage=usage,description=description,epilog="Happy testing!")
    parser.add_option("-s", "--standard", dest="testrun",
                      default=False,
                      action="store_true", 
                      help='Run tests.')
    parser.add_option("-r", "--release", dest="bundle",
                      default=False,
                      action="store_true", 
                      help='Bundle processor, apply license to files, and test with bundled code.')
    parser.add_option("-c", "--cranky", dest="cranky",
                      default=False,
                      action="store_true", 
                      help='Attempt to validate style code for testing against the CSL schema.')
    parser.add_option("-e", "--engine", dest="engine",
                      default="rhino",
                      help='Valid entries are "rhino" (default), "mozjs", "jsc" or "v8."')
    parser.add_option("-g", "--grind", dest="grind",
                      default=False,
                      action="store_true", 
                      help='Grind human-readable test code into machine-readable form (used only for debugging the test framework).')
    #parser.add_option("-p", "--processor", dest="processor",
    #                  default=False,
    #                  action="store_true", 
    #                  help='Run processor tests (cannot be used with -c, -g or -s opts, takes only test name as single argument).')
    parser.add_option("-v", "--verbose", dest="verbose",
                      default=False,
                      action="store_true", 
                      help='Display test names during processing.')
    parser.add_option("-B", "--bundle-only", dest="makebundle",
                      default=False,
                      action="store_true", 
                      help='Create the citeproc.js bundle and exit.')

    (opt, args) = parser.parse_args()

    if len(args) == 1:
        m = re.match("^(?:.*/)*(.*)_(.*?)(?:\.txt)*$", args[0])
        if m:
            args = [m.group(1), m.group(2)]

    bundlecount = 0
    if opt.makebundle:
        bundlecount += 1

    if bundlecount > 1:
        print parser.print_help()
        print "\nError: Only one of the -B, -G and -Z options can be used at one time."
        sys.exit()

    if opt.makebundle:
        bundler = Bundle()
        bundler.deleteOldBundles()
        bundler.createNewBundles()
        license = ApplyLicense()
        license.apply()
        sys.exit()

    # Testing sequence:
    # + Get single tests working
    #   Get automatic grinding for single tests working
    #   Get forced grinding for single tests working
    #   Get forced grinding and testing for single tests working
    #   Get CSL integrity check working for single tests
    #   Check running of all tests
    #   Check grinding of all tests followed by testing
    #   Check CSL integrity check of all tests

    #
    # Validation
    #
    #if opt.bundle and (opt.processor or opt.grind or opt.cranky or opt.testrun or len(args)):
    if opt.bundle and (opt.grind or opt.cranky or opt.testrun or len(args)):
        print parser.print_help()
        print "\nError: Option -r must be used alone"
        sys.exit()
    #if opt.processor and (opt.grind or opt.cranky or opt.testrun):
    #    parser.print_help()
    #    print "\nError: Option -p cannot be used with options -c, -g, -s or -S.\n"
    #    sys.exit()
    #elif opt.processor and len(args) and len(args) != 1:
    #if len(args) and len(args) != 1:
    #    parser.print_help()
    #    print "\nError: Use only one argument (the test name) with the -p option.\n"
    #    sys.exit()
    #elif (opt.grind or opt.cranky or opt.testrun) and len(args) and len(args) != 2 and len(args) != 1:
    if (opt.grind or opt.cranky or opt.testrun) and len(args) and len(args) != 2 and len(args) != 1:
        parser.print_help()
        print "\nError: Use one or two arguments with the -c, -g, -s or -S options (group name plus"
        print "       optionally the test name).\n"
        sys.exit()

    #
    # Set up paths engine
    # 
    category = "std"
    #if opt.processor:
    #    params = Params(opt,args,"citeproc_js",force="citeproc_js")
    #elif len(args) < 2:
    if len(args) < 2:
        params = Params(opt,args,category,force="std")
    else:
        params = Params(opt,args,category)

    #
    # Will do something, so issue date stamp
    #
    start = datetime.now()
    START="%s:%s:%s <--------------START" % (start.hour,start.minute,start.second)
    print START



    if opt.bundle:
        opt.grind = True
        opt.verbose = True
        opt.testrun = True
    try:
        if opt.cranky or opt.grind or opt.testrun:
            params.getSourcePaths()
            if opt.grind or ((opt.testrun) and opt.bundle):
                params.clearSource()
                params.refreshSource(force=True)
                print ""
            else:
                params.refreshSource()
            if opt.cranky:
                params.validateSource()
            if opt.bundle:
                bundle = Bundle()
                bundle.deleteOldBundles()
                bundle.createNewBundles()
                license = ApplyLicense()
                license.apply()
            if opt.testrun:
                params.buildRunner()
                params.runTests(bundle=opt.bundle)
        #elif opt.processor:
        #    params.buildRunner()
        #    params.runTests()
    except (KeyboardInterrupt, SystemExit):
        for file in os.listdir("."):
            if not file.startswith("tmp") or not len(file) == 9: continue
            os.unlink(file)
        sys.exit()
    except MissingHumansFile, error:
        parser.print_help()
        print '''\nError: File \"%s\" not found.
       Looked in:''' % error[0]
        for path in error[1]:
            print '         %s' % path
    except NoFilesError:
        print '\nError: No files to process!\n'
    except NoLicense:
        print '\nError: No license found in load.js'

    end = datetime.now()
    END="%s:%s:%s <--------------END" % (end.hour,end.minute,end.second)
    print END

    diff = end-start
    print "Time: %s seconds" % (diff.seconds)
