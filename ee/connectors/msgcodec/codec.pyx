cimport io
from libc.stdlib cimport abort

cdef extern from "Python.h":
    int PyArg_ParseTupleAndKeywords(object args, object kwargs, char* format, char** keywords, ...)

ctypedef object PyBytesIO

cdef class Codec:
    """
    Implements encode/decode primitives
    """

    @staticmethod
    cdef read_boolean(PyBytesIO reader):
        cdef bint b
        b = reader.read(1)[0]
        return b == 1

    @staticmethod
    def read_bool_method(PyBytesIO reader):
        return Codec.read_boolean(reader)

    @staticmethod
    cdef read_uint(PyBytesIO reader):
        cdef int x = 0  # the result
        cdef int s = 0  # the shift (our result is big-ending)
        cdef int i = 0  # n of byte (max 9 for uint64)
        cdef bytes b
        cdef int num

        while True:
            b = reader.read(1)
            if len(b) == 0:
                raise IndexError('bytes out of range')

            num = int.from_bytes(b, "big", signed=False)

            if num < 0x80:
                if i > 9 or (i == 9 and num > 1):
                    raise OverflowError()
                return int(x | num << s)
            x |= (num & 0x7f) << s
            s += 7
            i += 1

    @staticmethod
    def read_size(PyBytesIO reader):
        cdef int size = 0
        cdef bytes b
        cdef int num
        for i in range(3):
            b = reader.read(1)
            num = int.from_bytes(b, "big", signed=False)
            size += num << (8*i)
        return size


    @staticmethod
    def read_int(PyBytesIO reader):
        """
        ux, err := ReadUint(reader)
        x := int64(ux >> 1)
        if err != nil {
            return x, err
        }
        if ux&1 != 0 {
            x = ^x
        }
        return x, err
        """
        cdef int ux = Codec.read_uint(reader)
        cdef int x = int(ux >> 1)

        if ux & 1 != 0:
            x = - x - 1
        return x

    @staticmethod
    def read_string(PyBytesIO reader):
        cdef int length = Codec.read_uint(reader)
        cdef int s
        try:
            s = reader.read(length)
        except Exception as e:
            print(f'Error while reading string of length {length}')
            raise Exception(e)
        try:
            return s.decode("utf-8", errors="replace").replace("\x00", "\uFFFD")
        except UnicodeDecodeError:
            return None

