
CSL.Node.substitute = {
    build: function (state, target) {
        var func;
        if (this.tokentype === CSL.START) {
            // set conditional
            func = function (state) {
                state.tmp.can_block_substitute = true;
                if (state.tmp.value.length) {
                    state.tmp.can_substitute.replace(false, CSL.LITERAL);
                }
            };
            this.execs.push(func);
        }
        target.push(this);
    }
};


