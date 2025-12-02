package main

import (
	"delta-string-extractor/extractor"
	"encoding/json"
	"fmt"
	"os"
)

// MessageFormat matches the desired JSON structure
type MessageFormat struct {
	DefaultMessage string `json:"defaultMessage"`
	Description    string `json:"description"`
}

func formatForOutput(entries []extractor.Entry) map[string]MessageFormat {
	out := make(map[string]MessageFormat)
	for _, e := range entries {
		out[e.Code] = MessageFormat{
			DefaultMessage: e.Msg,
			Description:    e.Desc + "\nFile: " + e.Location,
		}
	}
	return out
}

func writeEntriesJSON(outputFile string, entries []extractor.Entry) error {
	// Format data
	data := formatForOutput(entries)

	// Marshal to pretty JSON
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	// Write atomically
	return writeAtomically(outputFile, jsonData)
}

func writeAtomically(filename string, data []byte) error {
	tempFile := filename + ".tmp"
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return err
	}
	return os.Rename(tempFile, filename)
}
