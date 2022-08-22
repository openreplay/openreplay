package messages

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
)

func ReadByte(reader io.Reader) (byte, error) {
	p := make([]byte, 1)
	_, err := io.ReadFull(reader, p)
	if err != nil {
		return 0, err
	}
	return p[0], nil
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
				return x, errors.New("uint overflow")
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
	if l > 10e6 {
		return "", errors.New("Too long string")
	}
	buf := make([]byte, l)
	_, err = io.ReadFull(reader, buf)
	if err != nil {
		return "", err
	}
	return string(buf), nil
}

func ReadJson(reader io.Reader) (interface{}, error) {
	jsonData, err := ReadData(reader)
	if err != nil {
		return nil, err
	}
	var v interface{}
	if err = json.Unmarshal(jsonData, &v); err != nil {
		return nil, err
	}
	return v, nil
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

func WriteData(data []byte, buf []byte, p int) int {
	p = WriteUint(uint64(len(data)), buf, p)
	return p + copy(buf[p:], data)
}

func WriteJson(v interface{}, buf []byte, p int) int {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("JSON encoding error: %v", err)
		return WriteString("null", buf, p)
	}
	return WriteData(data, buf, p)
}

func WriteSize(size uint64, buf []byte, p int) {
	var m uint64 = 255
	for i := 0; i < 3; i++ {
		buf[p+i] = byte(size & m)
		size = size >> 8
	}
	fmt.Println(buf)
}

func ReadSize(reader io.Reader) (uint64, error) {
	buf := make([]byte, 3)
	n, err := io.ReadFull(reader, buf)
	if err != nil {
		return 0, err
	}
	if n != 3 {
		return 0, fmt.Errorf("read only %d of 3 size bytes", n)
	}
	var size uint64
	for i, b := range buf {
		size += uint64(b) << (8 * i)
	}
	return size, nil
}
