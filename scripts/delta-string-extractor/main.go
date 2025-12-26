package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"delta-string-extractor/extractor"
)

// Configuration: allowed extensions and ignored directories
var (
	allowedExtensions = []string{".ts", ".tsx"}
	ignoredDirs       = []string{"node_modules"}
)

func main() {
	dir := flag.String("dir", "app", "directory to scan for files")
	outputFile := flag.String("output-file", filepath.FromSlash("app/locales/app/en.json"), "output file path")
	flag.Parse()

	var entries []extractor.Entry

	files := 0

	err := filepath.Walk(*dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if inArray(ignoredDirs, info.Name()) {
				return filepath.SkipDir
			}
			return nil
		}

		ext := filepath.Ext(path)
		if !inArray(allowedExtensions, ext) {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		relPath, err := filepath.Rel(*dir, path)
		if err != nil {
			return err
		}
		parts, err := extractor.ExtractFromContent(relPath, data)
		if err != nil {
			fmt.Println("error processing", relPath)
			fmt.Println("error", err)
			return nil
		}
		files++
		for _, p := range parts {
			if p.Code == "" {
				return fmt.Errorf("missing Code in translation part: file=%s, part=%+v", relPath, p)
			}

			if len(p.Msgs) > 0 {
				// If Msgs is provided (even if empty map), we expect content
				// But it might have no entries, so check that
				hasMsgs := false
				for _, msg := range p.Msgs {
					if msg != "" {
						hasMsgs = true
						break
					}
				}
				if !hasMsgs && p.Msg == "" {
					return fmt.Errorf("missing translation: 'Msg' is empty and 'Msgs' has no non-empty entries: file=%s, part=%+v", relPath, p)
				}
			} else {
				// No Msgs, so Msg must be non-empty
				if p.Msg == "" {
					return fmt.Errorf("missing Msg and Msgs in translation part: file=%s, part=%+v", relPath, p)
				}
			}
		}

		entries = append(entries, parts...)
		return nil
	})
	if err != nil {
		panic(err)
	}

	sort.Slice(entries, func(i, j int) bool {
		a, b := entries[i], entries[j]
		if a.Code == b.Code {
			return a.Location < b.Location // Tie-breaker: deterministic by file path
		}
		return a.Code < b.Code
	})

	err = writeEntriesJSON(*outputFile, entries)
	if err != nil {
		panic(err)
	}

	fmt.Println("Files processed", files)
	fmt.Println("Strings for translation found", len(entries))
}

func inArray[T comparable](s []T, v T) bool {
	for _, e := range s {
		if e == v {
			return true
		}
	}
	return false
}
