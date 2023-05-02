import io

class Codec:
    """
    Implements encode/decode primitives
    """

    @staticmethod
    def read_boolean(reader: io.BytesIO):
        b = reader.read(1)
        return b == 1

    @staticmethod
    def read_uint(reader: io.BytesIO):
        """
        The ending "big" doesn't play any role here,
        since we're dealing with data per one byte
        """
        x = 0  # the result
        s = 0  # the shift (our result is big-ending)
        i = 0  # n of byte (max 9 for uint64)
        while True:
            b = reader.read(1)
            if len(b) == 0:
                raise IndexError('bytes out of range')
            num = int.from_bytes(b, "big", signed=False)
            # print(i, x)

            if num < 0x80:
                if i > 9 | i == 9 & num > 1:
                    raise OverflowError()
                return int(x | num << s)
            x |= (num & 0x7f) << s
            s += 7
            i += 1

    @staticmethod
    def read_size(reader: io.BytesIO):
        size = 0
        for i in range(3):
            b = reader.read(1)
            num = int.from_bytes(b, "big", signed=False)
            size += num << (8*i)
        return size


    @staticmethod
    def read_int(reader: io.BytesIO) -> int:
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
        ux = Codec.read_uint(reader)
        x = int(ux >> 1)

        if ux & 1 != 0:
            x = - x - 1
        return x

    @staticmethod
    def read_string(reader: io.BytesIO) -> str:
        length = Codec.read_uint(reader)
        try:
            s = reader.read(length)
        except Exception as e:
            print(f'Error while reading string of length {length}')
            raise Exception(e)
        try:
            return s.decode("utf-8", errors="replace").replace("\x00", "\uFFFD")
        except UnicodeDecodeError:
            return None
