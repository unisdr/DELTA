package main

import (
	"delta-string-extractor/extractor"
	"encoding/json"
	"fmt"
	"os"
)

func writeEntriesJSON(outputFile string, entries []extractor.Entry) error {
	out := make(map[string]any)

	for _, e := range entries {
		key := e.Code
		desc := e.Desc
		if desc != "" {
			desc += " "
		}
		desc += "File: " + e.Location

		msgObj := map[string]string{
			"description": desc,
		}
		if len(e.Msgs) != 0 {
			// Copy all plural forms
			for form, msg := range e.Msgs {
				msgObj[form] = msg
			}
		} else if e.Msg != "" {
			// No Msgs → use Msg as 'other'
			msgObj["other"] = e.Msg
		} else {
			panic("one of the entries does not have Msgs or Msg")
			// No message at all
			msgObj["other"] = ""
		}
		out[key] = msgObj
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
