
CSL.Node["if"] = {
    build: function (state, target) {
        CSL.Conditions.TopNode.call(this, state, target);
        target.push(this);
    },
    configure: function (state, pos) {
        CSL.Conditions.Configure.call(this, state, pos);
    }
};

