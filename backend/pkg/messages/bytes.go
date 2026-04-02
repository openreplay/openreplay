package messages

import (
	"encoding/binary"
	"errors"
	"fmt"
	"io"
)

type BytesReader interface {
	ReadSize() (uint64, error)
	ReadByte() (byte, error)
	ReadUint() (uint64, error)
	ReadInt() (int64, error)
	ReadBoolean() (bool, error)
	ReadString() (string, error)
	ReadIndex() (uint64, error)
	Data() []byte
	Pointer() int64
	SetPointer(p int64)
}

type bytesReaderImpl struct {
	data []byte
	curr int64
}

func NewBytesReader(data []byte) BytesReader {
	return &bytesReaderImpl{
		data: data,
	}
}

func (m *bytesReaderImpl) ReadSize() (uint64, error) {
	if len(m.data)-int(m.curr) < 3 {
		return 0, fmt.Errorf("out of range")
	}
	var size uint64
	for i, b := range m.data[m.curr : m.curr+3] {
		size += uint64(b) << (8 * i)
	}
	m.curr += 3
	return size, nil
}

func (m *bytesReaderImpl) ReadByte() (byte, error) {
	if int(m.curr) >= len(m.data) {
		return 0, io.EOF
	}
	m.curr++
	return m.data[m.curr-1], nil
}

func (m *bytesReaderImpl) ReadUint() (uint64, error) {
	var x uint64
	var s uint
	i := 0
	for {
		b, err := m.ReadByte()
		if err != nil {
			return x, err
		}
		if b < 0x80 {
			if i > 9 || i == 9 && b > 1 {
				return x, errors.New("uint overflow")
			}
			return x | uint64(b)<<s, nil
		}
		x |= uint64(b&0x7f) << s
		s += 7
		i++
	}
}

func (m *bytesReaderImpl) ReadInt() (int64, error) {
	ux, err := m.ReadUint()
	x := int64(ux >> 1)
	if err != nil {
		return x, err
	}
	if ux&1 != 0 {
		x = ^x
	}
	return x, err
}

func (m *bytesReaderImpl) ReadBoolean() (bool, error) {
	val, err := m.ReadByte()
	if err != nil {
		return false, err
	}
	return val == 1, nil
}

func (m *bytesReaderImpl) ReadString() (string, error) {
	l, err := m.ReadUint()
	if err != nil {
		return "", err
	}
	if l > 10e6 {
		return "", errors.New("too long string")
	}
	if len(m.data)-int(m.curr) < int(l) {
		return "", fmt.Errorf("out of range")
	}
	str := string(m.data[m.curr : int(m.curr)+int(l)])
	m.curr += int64(l)
	return str, nil
}

func (m *bytesReaderImpl) ReadIndex() (uint64, error) {
	if len(m.data)-int(m.curr) < 8 {
		return 0, fmt.Errorf("out of range")
	}
	size := binary.LittleEndian.Uint64(m.data[m.curr : m.curr+8])
	m.curr += 8
	return size, nil
}

func (m *bytesReaderImpl) Data() []byte {
	return m.data
}

func (m *bytesReaderImpl) Pointer() int64 {
	return m.curr
}

func (m *bytesReaderImpl) SetPointer(p int64) {
	m.curr = p
}
