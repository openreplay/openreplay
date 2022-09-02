package messages

import (
	"errors"
	"io"
)

func ReadByte(reader io.Reader) (byte, error) {
	p := make([]byte, 1)
	_, err := io.ReadFull(reader, p)
	if err != nil {
		return 0, err
	}
	return p[0], nil
}

func SkipBytes(reader io.ReadSeeker) error {
	n, err := ReadUint(reader)
	if err != nil {
		return err
	}
	_, err = reader.Seek(int64(n), io.SeekCurrent)
	return err
}

func ReadData(reader io.Reader) ([]byte, error) {
	n, err := ReadUint(reader)
	if err != nil {
		return nil, err
	}
	p := make([]byte, n)
	_, err = io.ReadFull(reader, p)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func ReadUint(reader io.Reader) (uint64, error) {
	var x uint64
	var s uint
	i := 0
	for {
		b, err := ReadByte(reader)
		if err != nil {
			return x, err
		}
		if b < 0x80 {
			if i > 9 || i == 9 && b > 1 {
				return x, errors.New("overflow")
			}
			return x | uint64(b)<<s, nil
		}
		x |= uint64(b&0x7f) << s
		s += 7
		i++
	}
}

func ReadInt(reader io.Reader) (int64, error) {
	ux, err := ReadUint(reader)
	x := int64(ux >> 1)
	if err != nil {
		return x, err
	}
	if ux&1 != 0 {
		x = ^x
	}
	return x, err
}

func ReadBoolean(reader io.Reader) (bool, error) {
	p := make([]byte, 1)
	_, err := io.ReadFull(reader, p)
	if err != nil {
		return false, err
	}
	return p[0] == 1, nil
}

func ReadString(reader io.Reader) (string, error) {
	l, err := ReadUint(reader)
	if err != nil {
		return "", err
	}
	buf := make([]byte, l)
	_, err = io.ReadFull(reader, buf)
	if err != nil {
		return "", err
	}
	return string(buf), nil
}

func WriteUint(v uint64, buf []byte, p int) int {
	for v >= 0x80 {
		buf[p] = byte(v) | 0x80
		v >>= 7
		p++
	}
	buf[p] = byte(v)
	return p + 1
}

func WriteInt(v int64, buf []byte, p int) int {
	uv := uint64(v) << 1
	if v < 0 {
		uv = ^uv
	}
	return WriteUint(uv, buf, p)
}

func WriteBoolean(v bool, buf []byte, p int) int {
	if v {
		buf[p] = 1
	} else {
		buf[p] = 0
	}
	return p + 1
}

func WriteString(str string, buf []byte, p int) int {
	p = WriteUint(uint64(len(str)), buf, p)
	return p + copy(buf[p:], str)
}
