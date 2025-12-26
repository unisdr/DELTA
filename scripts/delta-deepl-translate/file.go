package main

import (
	"encoding/json"
	"os"
)

type TranslationEntry struct {
	ID          string `json:"id"`
	Description string `json:"description,omitempty"`
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

func WriteIfMissingByID(targetFile string, newEntries []TranslationEntry) error {
	// Read existing entries if file exists
	var existingEntries []TranslationEntry
	if _, err := os.Stat(targetFile); err == nil {
		data, err := os.ReadFile(targetFile)
		if err != nil {
			return err // any error (other than NotExist) → panic/fail
		}
		if len(data) > 0 {
			if err := json.Unmarshal(data, &existingEntries); err != nil {
				return err
			}
		}
	} else if !os.IsNotExist(err) {
		return err // if it's an error other than "file doesn't exist", panic
	}

	// Build map of existing IDs for fast lookup
	existingIDs := make(map[string]bool)
	for _, e := range existingEntries {
		existingIDs[e.ID] = true
	}

	// Merge: keep all existing, append new entries if ID is not present
	result := make([]TranslationEntry, 0, len(existingEntries)+len(newEntries))
	result = append(result, existingEntries...)

	for _, e := range newEntries {
		if !existingIDs[e.ID] {
			result = append(result, e)
		}
	}

	return WriteTranslations(targetFile, result)
}

func WriteTranslations(filename string, entries []TranslationEntry) error {
	data, err := json.MarshalIndent(entries, "", "    ")
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
