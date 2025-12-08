package extractor

import (
	"bytes"
	"encoding/json"
	"fmt"
)

type Entry struct {
	Location string
	Code     string
	Msg      string
	Msgs     map[string]string
	Desc     string
}

type entryJSON struct {
	Code string            `json:"code"`
	Msg  string            `json:"msg"`
	Msgs map[string]string `json:"msgs"`
	Desc string            `json:"desc"`
}

// countLines counts how many '\n' are in the data up to 'index'.
func countLines(data []byte, index int) int {
	if index > len(data) {
		index = len(data)
	}
	lines := bytes.Count(data[:index], []byte("\n"))
	return lines + 1 // 1-based line numbers
}

func ExtractFromContent(file string, data []byte) (res []Entry, rerr error) {
	substr := []byte("t({")
	ind := 0

	for {
		if ind >= len(data) {
			break
		}
		part := data[ind:]
		pos := bytes.Index(part, substr)
		if pos == -1 {
			break
		}

		// Check character before 't' to avoid matching 'text', 'gettext', etc.
		prevIdx := ind + pos - 1
		if prevIdx >= 0 {
			prevChar := data[prevIdx]
			if !isBoundary(prevChar) {
				ind += pos + 1
				continue
			}
		}

		offset := pos + len(substr) - 1
		input := part[offset:]
		dec := json.NewDecoder(bytes.NewReader(input))
		var entry Entry
		err := dec.Decode(&entry)
		if err != nil {
			rerr = fmt.Errorf("found t({, but invalid json after\nMake sure it is valid JSON, not JS, for example by encasing the keys into quotes\nerr: %v\ncontent: %v\n", err, truncate(string(input), 300))
			return
		}
		lineNum := countLines(data, ind+pos)
		entry.Location = fmt.Sprintf("%v:%v", file, lineNum)

		res = append(res, entry)
		// Advance start to after the parsed JSON object
		ind += offset + int(dec.InputOffset())
	}

	return
}

func isBoundary(b byte) bool {
	return b == ' ' || b == '\t' || b == '\n' || b == '\r' || b == '.' || b == '{'
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
