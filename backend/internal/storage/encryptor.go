package storage

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"encoding/hex"
	"errors"
	"fmt"
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
	// Add {1,0} right after the end of text
	rawText = append(rawText, byte(1))
	// Calculate the number of bytes we need to add to fill the last block of data
	paddingSize := blockSize - len(rawText)%blockSize
	// Generating zeros for last block
	paddingText := bytes.Repeat([]byte{byte(0)}, paddingSize)
	return append(rawText, paddingText...)
}

func encryptData(data, fullKey []byte) ([]byte, error) {
	if len(fullKey) != 32 {
		return nil, errors.New("wrong format of encryption key")
	}
	key, iv := fullKey[:16], fullKey[16:]
	// Fill the last block of data by zeros
	paddedData := fillLastBlock(data, aes.BlockSize)
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
	return []byte(hex.EncodeToString(ciphertext)), nil
}
