cdef extern from "Python.h":
    ctypedef struct PyBytesIO:
        pass

cdef PyBytesIO* PyBytesIO_New()
cdef void PyBytesIO_Init(PyBytesIO* self, object buf)
cdef object PyBytesIO_GetValue(PyBytesIO* self)
cdef void PyBytesIO_SetValue(PyBytesIO* self, object buf)
cdef void PyBytesIO_Write(PyBytesIO* self, const char* s, Py_ssize_t size)
cdef void PyBytesIO_WriteObject(PyBytesIO* self, object o)

cdef object PyBytesIO_Read(PyBytesIO* self, Py_ssize_t n)
cdef object PyBytesIO_Readline(PyBytesIO* self, Py_ssize_t n)
cdef object PyBytesIO_Readlines(PyBytesIO* self, Py_ssize_t n)
cdef void PyBytesIO_Seek(PyBytesIO* self, Py_ssize_t pos, int whence)
cdef Py_ssize_t PyBytesIO_Tell(PyBytesIO* self)
cdef void PyBytesIO_Truncate(PyBytesIO* self, Py_ssize_t size)
cdef void PyBytesIO_Flush(PyBytesIO* self)
cdef object PyBytesIO_GetSize(PyBytesIO* self)
cdef void PyBytesIO_Close(PyBytesIO* self)

