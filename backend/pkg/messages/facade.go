package messages

import (
	"bytes"
	//"io"
)

func Encode(msg Message) []byte {
	return msg.Encode()
}

//
// func EncodeList(msgs []Message) []byte {

// }
//

// func Decode(b []byte) (Message, error) {
// 	return ReadMessage(bytes.NewReader(b))
// }

// func DecodeEach(b []byte, callback func(Message)) error {
// 	var err error
// 	reader :=	bytes.NewReader(b)
// 	for {
// 		msg, err := ReadMessage(reader)
// 		if err != nil {
// 			break
// 		}
// 		callback(msg)
// 	}
// 	if err == io.EOF {
// 		return nil
// 	}
// 	return err
// }

func GetMessageTypeID(b []byte) (uint64, error) {
	reader :=	bytes.NewReader(b)
	return ReadUint(reader)
}
