
CSL.Node.info = {
    build: function (state) {
        if (this.tokentype === CSL.START) {
            state.build.skip = "info";
        } else {
            state.build.skip = false;
        }
    }
};

