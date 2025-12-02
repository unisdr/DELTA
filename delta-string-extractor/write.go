package main

import (
	"delta-string-extractor/extractor"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Message struct {
	ID                string `json:"id"`
	Translation       string `json:"translation"`
	Position          string `json:"position"`
	TranslatorComment string `json:"translatorComment"`
}

type TranslationFile struct {
	Language string    `json:"language"`
	Messages []Message `json:"messages"`
}

func getLangFromPath(path string) string {
	filename := filepath.Base(path)
	lang := strings.TrimSuffix(filename, filepath.Ext(filename))
	return lang
}

func writeEntriesJSON(filename string, entries []extractor.Entry) error {

	language := getLangFromPath(filename)

	messages := make([]Message, 0, len(entries))
	for _, e := range entries {
		messages = append(messages, Message{
			ID:          e.Code,
			Translation: e.Msg,
			Position:    e.Location,
			Comment:     e.Desc,
		})
	}

	file := TranslationFile{
		Language: language,
		Messages: messages,
	}

	data, err := json.MarshalIndent(file, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	return writeAtomically(filename, data)
}

func writeAtomically(filename string, data []byte) error {
	tempFile := filename + ".tmp"
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return err
	}
	return os.Rename(tempFile, filename)
}
