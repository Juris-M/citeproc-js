=============
`citeproc-js`
=============
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
A JavaScript implementation of the Citation Style Language
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

:Authors: Frank Bennett


.. image:: https://github.com/Juris-M/citeproc-js/actions/workflows/ci.yml/badge.svg
   :target: https://github.com/Juris-M/citeproc-js/actions/workflows/ci.yml

-----
About
-----

The `Citation Style Language`_ (CSL) is
an XML grammar for expressing the detailed requirements of a citation
style. A `CSL processor`_ is a tool
that generates citations and bibliographies by applying CSL style rules
to bibliographic data.

The ``citeproc-js`` CSL processor is over a decade in service, a fact
that shows through in ways both good and bad. On the downside, the
code base is not pretty, and can serve as a solid
illustration of the burden of technical debt (in case you need one of
those for your computer science class). On the upside, though,
``citeproc-js`` passes a suite of over 1,300 integration tests with flying
colors. When run in CSL-M mode [1]_ it can handle multilingual and
legal content with a flexibility and precision unrivaled by any other
tool at any price. And it has been quite heavily field-tested, as the
citation formatter driving word processor integration in both
`Mendeley`_ and `Zotero`_.

More important than fleeting badges of popularity, though, is the CSL
standard. Developers can take comfort in the technical strength of the
`CSL Specification`_, and
the existence of `other processors`_ under active
development.  CSL is the modern way to handle bibliographic projects,
and ``citeproc-js`` is a convenient way to take advantage of it.

----------------------
Submitting bug reports
----------------------

If you think you have found a processor bug, you can help track it
down by submitting a test item or items that expose the error.  To
submit an item, join the public `Jurism Test Submission group
<https://www.zotero.org/groups/2339078/jurism_test_submissions>`,
sync, create a collection named for the style that shows the error,
drop the item into it, jot a description of the problem in the
Abstract field, and sync again.

For errors not associated with a particular style or item, file
reports on the `citeproc-js GitHub tracker <https://github.com/juris-m/citeproc-js/issues>`.

----------------------
Building the processor
----------------------

The processor files ``citeproc.js`` and ``citeproc_commonjs.js`` are built
automatically when tests are run (see below).

-------------
Running Tests
-------------

The processor is supported by a little over 1,300 test fixtures, which
can be run from a ``git`` clone of this repository after installing the
`Citeproc Test Runner`_. The system requirements (apart from ``git`` itself) are:

    ``git``
        Needed to fetch a clone of the ``citeproc-js`` repository on GitHub.
    ``node.js``
        Any recent-ish version should work. Version 7 is used for automated testing.
    ``mocha``
        Install Mocha globally with ``npm install --global mocha``.
    ``java``
        This is used to perform schema validation. Browser extension is not
        required, a basic command-line install is all you need.

Once the system requirements are set up, install the test runner
with the following command::

  npm install -g citeproc-test-runner

You can now run the full suite of integration tests from the ``citeproc-js`` directory
with the following command:
  
  cslrun -a

You can review the full set of options by running``cslrun -h``. For
more information on running tests, see the `citeproc-js Manual`_ or
the README of the `Citeproc Test Runner`_

------------------
Repository Content
------------------

The processor itself is contained in a single file. Two copies are in
the repository: ``citeproc_commonjs.js`` (an ES6 module); and
``citeproc.js`` (a raw bundle of JavaScript). The former is
probably what you will want for most purposes today.

The following command will pull the sources of the processor and
supporting files::

  git clone --recursive https://github.com/Juris-M/citeproc-js.git

Directories of the repository contain a number of tools used for
development and testing:

``src``
  Processor source files. These are bundled into the two processor
  copies by the test script ``cslrun``, distributed separately in
  the ``citeproc-test-runner`` package via ``npm`` (see below
  for details).

``csl-schemata``
  The RelaxNG schemata for CSL and CSL-M. These are used to
  validate style code. The schemata are not used directly
  by the processor at runtime.

``demo``
  Contains a simple example of processor configuration in a Web
  environment. Can be viewed by running a local webserver in the
  directory.

``docs``
  Source files for the ``citeproc-js`` manual on `ReadTheDocs
  <https://citeproc-js.readthedocs.io/en/latest/>`_.

``fixtures/local``
  Integration test fixtures specific to the ``citeproc-js`` processor or to
  the CSL-M grammar variant.

``fixtures/std``
  Standard CSL integration tests from the `Citation Style Language`_ repository.

``fixtures/styles``
  Style-level tests. For more information, see the `citeproc-js Manual`_ or the README of
  the `Citeproc Test Runner`_
  
``juris-modules``
  Jurisdiction modules. These are used to CSL-M mode to render legal
  citations in country-specific forms.

``locale``
  The `standard locale files <https://github.com/citation-style-language/locales>`_ from the CSL project.

``tools``
  An assortment of scripts that are used, or have been used at some point,
  in the maintenance of ``citeproc-js``.

---------------------------

.. [1] CSL-M is set of private extensions to official CSL used by the
       `Jurism <https://juris-m.github.io>`_ reference manager, a
       variant of Zotero. For more information, see the `citeproc-js Manual`_

---------------------------

| 2019.03.27
| FB


       
.. _csl processor: https://citationstyles.org/developers/#csl-processors
.. _mendeley: https://www.mendeley.com
.. _zotero: https://www.zotero.org
.. _csl specification: http://docs.citationstyles.org/en/1.0.1/specification.html
.. _other processors: https://citationstyles.org/developers/#csl-processors
.. _citeproc-js Manual: https://citeproc-js.readthedocs.io/en/latest/
.. _citation style language: https://github.com/citation-style-language/test-suite

.. _citeproc test runner: https://github.com/juris-m/citeproc-test-runner>
