package imagestorage

import (
	"archive/tar"
	"bytes"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"time"

	gzip "github.com/klauspost/pgzip"
	config "openreplay/backend/internal/config/videostorage"
)

type ImageStorage struct {
	cfg *config.Config
}

func New(cfg *config.Config) (*ImageStorage, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	}
	newStorage := &ImageStorage{
		cfg: cfg,
	}
	return newStorage, nil
}

func (v *ImageStorage) Process(data []byte, sessID uint64) error {
	log.Printf("image data: %d from session: %d", len(data), sessID)
	// Try to extract an archive
	start := time.Now()
	v.ExtractTarGz(bytes.NewReader(data), sessID)
	log.Printf("extracted archive in: %s", time.Since(start))
	return nil
}

func (v *ImageStorage) Wait() {
	return
}

func (v *ImageStorage) ExtractTarGz(gzipStream io.Reader, sessID uint64) {
	uncompressedStream, err := gzip.NewReader(gzipStream)
	if err != nil {
		log.Fatal("ExtractTarGz: NewReader failed")
	}

	tarReader := tar.NewReader(uncompressedStream)

	for true {
		header, err := tarReader.Next()

		if err == io.EOF {
			break
		}

		if err != nil {
			log.Fatalf("ExtractTarGz: Next() failed: %s", err.Error())
		}

		dir := v.cfg.FSDir + "/screenshots/" + strconv.FormatUint(sessID, 10) + "/"

		// Ensure the directory exists
		err = os.MkdirAll(dir, 0755)
		if err != nil {
			log.Fatalf("Error creating directories: %v", err)
		}

		if header.Typeflag == tar.TypeReg {
			filePath := dir + header.Name
			outFile, err := os.Create(filePath) // or open file in rewrite mode
			if err != nil {
				log.Fatalf("ExtractTarGz: Create() failed: %s", err.Error())
			}
			if _, err := io.Copy(outFile, tarReader); err != nil {
				log.Fatalf("ExtractTarGz: Copy() failed: %s", err.Error())
			}
			outFile.Close()
		} else {
			log.Printf(
				"ExtractTarGz: uknown type: %d in %s",
				header.Typeflag,
				header.Name)
		}
	}
}
