package main

import (
	"delta-string-extractor/extractor"
	"encoding/json"
	"fmt"
	"os"
)

func writeEntriesJSON(outputFile string, entries []extractor.Entry) error {
	var out []map[string]any

	for _, e := range entries {
		key := e.Code
		// Build description
		desc := e.Desc
		if desc != "" {
			desc += " "
		}
		desc += "File: " + e.Location

		// Build translation
		var translation any
		if len(e.Msgs) != 0 {
			// Use plural forms directly
			translation = e.Msgs // Note: assuming your extractor uses "Msgs"
		} else if e.Msg != "" {
			// Fallback to 'other'
			translation = e.Msg
		} else {
			translation = ""
		}

		entry := map[string]any{
			"id":          key,
			"description": desc,
			"translation": translation,
		}

		out = append(out, entry)
	}

	// Marshal to pretty JSON
	data, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	return writeAtomically(outputFile, data)
}

func writeAtomically(filename string, data []byte) error {
	tempFile := filename + ".tmp"
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return err
	}
	return os.Rename(tempFile, filename)
}
