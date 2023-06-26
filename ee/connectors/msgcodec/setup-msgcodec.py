#from setuptools import setup
from distutils.core import setup
from Cython.Build import cythonize

setup(
    ext_modules = cythonize("msgcodec.pyx"),
    include_package_data=True,
    package_data={"": ["*.pxd"]},
)
