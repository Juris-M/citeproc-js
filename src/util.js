
CSL.Util = {};

CSL.Util.Match = function () {

    this.any = function (token, state, tests) {
        return function (Item, item) {
            for (var i=0, ilen=tests.length; i < ilen; i += 1) {
                var result = tests[i](Item, item);
                if (result) {
                    return true;
                }
            }
            return false;
        };
    };

    this.none = function (token, state, tests) {
        return function (Item, item) {
            for (var i=0,ilen=tests.length;i<ilen;i+=1) {
                var result = tests[i](Item,item);
                if (result) {
                    return false;
                }
            }
            return true;
        };
    };

    this.all = function (token, state, tests) {
        return function (Item, item) {
            for (var i=0,ilen=tests.length;i<ilen;i+=1) {
                var result = tests[i](Item,item);
                if (!result) {
                    return false;
                }
            }
            return true;
        };
    };

    this[undefined] = this.all;

    this.nand = function (token, state, tests) {
        return function (Item, item) {
            for (var i=0,ilen=tests.length;i<ilen;i+=1) {
                var result = tests[i](Item,item);
                if (!result) {
                    return true;
                }
            }
            return false;
        };
    };

};
