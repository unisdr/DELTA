package main

import (
	"delta-string-extractor/extractor"
	"encoding/json"
	"fmt"
	"maps"
	"os"
	"sort"
)

// translationEqual checks if two entries have equivalent translations
func translationMsgEqual(a, b extractor.Entry) bool {
	switch {
	case a.Msg != "" && b.Msg != "":
		return a.Msg == b.Msg
	case a.Msgs != nil && b.Msgs != nil:
		return maps.Equal(a.Msgs, b.Msgs)
	default:
		// One has Msg, the other has Msgs → not equivalent
		return false
	}
}

func writeEntriesJSON(outputFile string, entries []extractor.Entry) error {
	type entryGroup struct {
		entries []extractor.Entry
	}

	groups := make(map[string]*entryGroup)

	// Group entries by ID
	for _, e := range entries {
		key := e.Code
		if _, ok := groups[key]; !ok {
			groups[key] = &entryGroup{}
		}
		groups[key].entries = append(groups[key].entries, e)
	}

	bestEntry := make(map[string]extractor.Entry)

	{
		// Extract and sort keys for stable iteration
		keys := make([]string, 0, len(groups))
		for k := range groups {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		for _, key := range keys {
			group := groups[key]
			var best extractor.Entry
			var first extractor.Entry
			if len(group.entries) == 0 {
				continue
			}
			best = group.entries[0]
			first = group.entries[0]

			for _, e := range group.entries[1:] {
				// Check if translations differ
				if !translationMsgEqual(e, first) {
					// Log all entries in the group – conflict detected
					fmt.Printf("conflicting translations for key %q:\n", key)
					for _, entry := range group.entries {
						if entry.Msg != "" {
							fmt.Printf("  - %s: (singular) %q\n", entry.Location, entry.Msg)
						}
						if entry.Msgs != nil {
							fmt.Printf("  - %s: (plural) %v\n", entry.Location, entry.Msgs)
						}
					}
					break // Log once, not for every mismatch
				}

				// Prefer entry with description
				if e.Desc != "" && best.Desc == "" {
					best = e
				}
			}
			bestEntry[key] = best
		}
	}

	// Build output
	var out []map[string]any
	{
		// Sort by ID
		keys := make([]string, 0, len(bestEntry))
		for k := range bestEntry {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		for _, k := range keys {
			e := bestEntry[k]

			// Build description
			desc := e.Desc
			if desc != "" {
				desc += " "
			}
			desc += "File: " + e.Location

			// Build translation
			var translation any
			if e.Msgs != nil {
				translation = e.Msgs
			} else if e.Msg != "" {
				translation = e.Msg
			} else {
				translation = ""
			}

			entry := map[string]any{
				"id":          k,
				"description": desc,
				"translation": translation,
			}

			out = append(out, entry)
		}
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
