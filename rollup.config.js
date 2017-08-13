const commonjs = {
    entry: 'citeproc.js',
    format: 'cjs',
    dest: 'dist/citeproc.cjs.js',
}

const iife = {
    entry: 'citeproc.js',
    format: 'iife',
    moduleName: 'CSL',
    dest: 'dist/citeproc.iife.js',
}

const umd = {
    entry: 'citeproc.js',
    format: 'umd',
    moduleName: 'CSL',
    dest: 'dist/citeproc.umd.js',
}

const amd = {
    entry: 'citeproc.js',
    format: 'amd',
    moduleName: 'CSL',
    dest: 'dist/citeproc.amd.js',
}

export default [ 
    commonjs,
    iife,
    umd,
    amd,
];
