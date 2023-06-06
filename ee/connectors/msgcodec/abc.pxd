cdef extern from "Python.h":
    ctypedef struct PyObject:
        pass

#cdef extern from "cpython/abc.pxd":
#    cdef class ABC:
#        pass

cdef class ABC:
    pass
# Optionally, you can include other declarations from abc.pxd if needed

