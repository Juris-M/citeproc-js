const commonjs = {
    entry: 'citeproc.js',
    format: 'cjs',
    dest: 'dist/citeproc.cjs.js',
}

const iife = {
    entry: 'citeproc.js',
    format: 'iife',
    moduleName: 'Citeproc',
    dest: 'dist/citeproc.iife.js',
}

const umd = {
    entry: 'citeproc.js',
    format: 'umd',
    moduleName: 'Citeproc',
    dest: 'dist/citeproc.umd.js',
}

const amd = {
    entry: 'citeproc.js',
    format: 'amd',
    moduleName: 'Citeproc',
    dest: 'dist/citeproc.amd.js',
}

export default [ 
    commonjs,
    iife,
    umd,
    amd,
];
