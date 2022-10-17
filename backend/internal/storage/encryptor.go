package storage

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"errors"
	"fmt"
	"log"
	"math/rand"
)

const letterSet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func GenerateEncryptionKey() []byte {
	return append(generateRandomBytes(16), generateRandomBytes(16)...)
}

func generateRandomBytes(size int) []byte {
	b := make([]byte, size)
	for i := range b {
		b[i] = letterSet[rand.Int63()%int64(len(letterSet))]
	}
	return b
}

func fillLastBlock(rawText []byte, blockSize int) []byte {
	padding := blockSize - len(rawText)%blockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(rawText, padtext...)
	// Add {1,0} right after the end of text
	//rawText = append(rawText, byte(1))
	//log.Println(rawText)
	//// Calculate the number of bytes we need to add to fill the last block of data
	//paddingSize := blockSize - len(rawText)%blockSize
	//// Generating zeros for last block
	//paddingText := bytes.Repeat([]byte{byte(0)}, paddingSize)
	//log.Println(paddingText)
	//return append(rawText, paddingText...)
}

func encryptData(data, fullKey []byte) ([]byte, error) {
	if len(fullKey) != 32 {
		return nil, errors.New("wrong format of encryption key")
	}
	key, iv := fullKey[:16], fullKey[16:]
	// Fill the last block of data by zeros
	paddedData := fillLastBlock(data, aes.BlockSize)
	log.Println(paddedData)
	// Create new AES cipher with CBC encryptor
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("cbc encryptor failed: %s", err)
	}
	mode := cipher.NewCBCEncrypter(block, iv)
	// Encrypting data
	ciphertext := make([]byte, len(paddedData))
	mode.CryptBlocks(ciphertext, paddedData)
	// Return encrypted data
	return ciphertext, nil //[]byte(hex.EncodeToString(ciphertext)), nil
}

func decryptData(data, fullKey []byte) ([]byte, error) {
	if len(fullKey) != 32 {
		return nil, errors.New("wrong format of encryption key")
	}
	key, iv := fullKey[:16], fullKey[16:]
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("cbc encryptor failed: %s", err)
	}
	cbc := cipher.NewCBCDecrypter(block, iv)
	res := make([]byte, len(data))
	cbc.CryptBlocks(res, data)
	return res, nil
}
