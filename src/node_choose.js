
CSL.Node.choose = {
    build: function (state, target) {
        var func;
        if (this.tokentype === CSL.START) {
            //open condition
            func = function (state) {
                state.tmp.jump.push(undefined, CSL.LITERAL);
            };
        }
        if (this.tokentype === CSL.END) {
            //close condition
            func = function (state) {
                state.tmp.jump.pop();
            };
        }
        this.execs.push(func);
        target.push(this);
    },

    configure: function (state, pos) {
        if (this.tokentype === CSL.END) {
            state.configure.fail.push((pos));
            state.configure.succeed.push((pos));
        } else {
            state.configure.fail.pop();
            state.configure.succeed.pop();
        }
    }
};
