package extractor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
)

type Entry struct {
	Location string
	Code     string
	Msg      string
	Msgs     map[string]string
	Desc     string
}

type entryJSON struct {
	Code string
	Msg  any
	Msgs map[string]any
	Desc string
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
		var entryJSON entryJSON
		err := dec.Decode(&entryJSON)
		if err != nil {
			rerr = fmt.Errorf("found t({, but invalid json after\nMake sure it is valid JSON, not JS, for example by encasing the keys into quotes\nerr: %v\ncontent: %v\n", err, truncate(string(input), 300))
			return
		}
		lineNum := countLines(data, ind+pos)
		var entry Entry
		entry.Location = fmt.Sprintf("%v:%v", file, lineNum)
		entry.Code = entryJSON.Code
		entry.Desc = entryJSON.Desc
		entry.Msg = normalizeString(entryJSON.Msg)
		entry.Msgs = map[string]string{}
		for k, v := range entryJSON.Msgs {
			entry.Msgs[k] = normalizeString(v)
		}
		res = append(res, entry)
		// Advance start to after the parsed JSON object
		ind += offset + int(dec.InputOffset())
	}

	return
}

// Accepts string or []any where each element is a string, if array passed returns joined using newline. This is to support multiline strings for translations without having to put them all into one line separating with \n.
func normalizeString(v any) string {
	if v == nil {
		return ""
	}
	switch v := v.(type) {
	case string:
		return v
	case []any:
		var parts []string
		for _, item := range v {
			str, ok := item.(string)
			if !ok {
				panic("all elements in the array must be strings")
			}
			parts = append(parts, str)
		}
		return strings.Join(parts, "\n")
	default:
		panic("input must be a string or []any")
	}
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
