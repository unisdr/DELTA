package main

import (
	"encoding/json"
	"os"
)

type TranslationEntry struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Translation any    `json:"translation"`
}

func ReadTranslations(filename string) ([]TranslationEntry, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var entries []TranslationEntry
	err = json.Unmarshal(data, &entries)
	if err != nil {
		return nil, err
	}

	return entries, nil
}

func WriteTranslations(filename string, entries []TranslationEntry) error {
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
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
