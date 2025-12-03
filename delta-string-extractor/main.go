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
	dir := flag.String("dir", "./app", "directory to scan for files")
	outputFile := flag.String("output-file", "./app/locales/en.json", "output file path")
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
			required := map[string]string{
				"Code": p.Code,
				"Msg":  p.Msg,
			}
			for field, value := range required {
				if value == "" {
					return fmt.Errorf("missing %s in translation part: file=%s, part=%+v", field, relPath, p)
				}
			}
		}

		entries = append(entries, parts...)
		return nil
	})
	if err != nil {
		panic(err)
	}

	/*
		for _ part {{
			whre fiel is != ""

				io.ReadFile(file)
				replace the content with what's in the file

		}*/

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Code < entries[j].Code
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
