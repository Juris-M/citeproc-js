
CSL.Node["else"] = {
    build: function (state, target) {
        target.push(this);
    },
    configure: function (state, pos) {
        if (this.tokentype === CSL.START) {
            state.configure.fail[(state.configure.fail.length - 1)] = pos;
        }
    }
};

