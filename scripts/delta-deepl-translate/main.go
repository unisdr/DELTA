package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

type CommaSeparated []string

func (l *CommaSeparated) String() string {
	return strings.Join(*l, ",")
}

func (l *CommaSeparated) Set(value string) error {
	*l = strings.Split(value, ",")
	return nil
}

func main() {
	err := exec()
	if err != nil {
		fmt.Println("Failed:")
		fmt.Println(err)
		os.Exit(1)
	}
}

func exec() error {
	// Parse flags
	args, err := parseFlags()
	if err != nil {
		return err
	}

	// Validate inputs
	if err := validateArgs(args); err != nil {
		return err
	}

	for _, subDir := range args.SubDirs {
		sourceFile := filepath.Join(args.Dir, subDir, args.SourceLang+".json")

		// Read source translations
		entries, err := ReadTranslations(sourceFile)
		if err != nil {
			return fmt.Errorf("failed to read source file: %w", err)
		}

		// Apply sample mode
		if args.Sample && len(entries) > 10 {
			entries = entries[:10]
		}

		// Extract source texts
		sourceTexts := extractTexts(entries)

		// Show cost estimate
		if err := estimateCost(sourceTexts, args.Langs, args.SourceLang, args.CacheFile); err != nil {
			return err
		}

		// Exit early on dry-run
		if args.DryRun {
			continue
		}

		// Initialize translator and translate
		translator, err := NewDeepLTranslator(args.APIURL, args.APIKey, args.CacheFile)
		if err != nil {
			return fmt.Errorf("failed to initialize translator: %w", err)
		}

		ctx := context.Background()
		for _, lang := range args.Langs {
			if lang == args.SourceLang {
				continue
			}

			results, err := translator.TranslateBatch(ctx, sourceTexts, lang, args.SourceLang)
			if err != nil {
				return fmt.Errorf("failed to translate to %s: %w", lang, err)
			}

			translatedEntries := updateEntries(entries, results)
			targetDir := filepath.Join(args.Dir, subDir)
			if err := os.MkdirAll(targetDir, 0755); err != nil {
				return fmt.Errorf("failed to create target directory: %w", err)
			}
			targetFile := filepath.Join(targetDir, lang+".json")

			if err := WriteTranslations(targetFile, translatedEntries); err != nil {
				return fmt.Errorf("failed to write translation file %s: %w", targetFile, err)
			}

			fmt.Printf("Translated %d entries to %s and wrote to %s\n", len(entries), lang, targetFile)
		}
	}

	return nil
}

type args struct {
	Dir        string
	SourceLang string
	APIKey     string
	APIURL     string
	Langs      CommaSeparated
	CacheFile  string
	DryRun     bool
	Sample     bool
	SubDirs    CommaSeparated
}

func parseFlags() (*args, error) {
	dir := flag.String("dir", filepath.FromSlash("app/locales"), "Directory with json files with translations")
	sourceLang := flag.String("source-lang", "en", "Source language for translations")
	apiKeyEnvVar := flag.String("api-key-env-var", "DELTA_DEEPL_KEY", "Env var to read the API key from")
	dryRun := flag.Bool("dry-run", false, "If true, only count characters to translate, no API calls")
	sample := flag.Bool("sample", false, "If true, only translates a small sample")
	apiURL := flag.String("api-url", "https://api-free.deepl.com", "Which deepl url to use for translation")

	var langs CommaSeparated
	flag.Var(&langs, "langs", "Comma-separated list of languages (e.g. fr,de,es)")
	var subDirs CommaSeparated
	flag.Var(&subDirs, "subdirs", "Comma-separated list of subdirectories (e.g. app,content)")

	flag.Parse()

	apiKey := os.Getenv(*apiKeyEnvVar)
	if apiKey == "" {
		return nil, fmt.Errorf("API key environment variable %s is not set", *apiKeyEnvVar)
	}

	cacheDir := filepath.Join(*dir, "api-cache")
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create cache directory: %w", err)
	}
	cacheFile := filepath.Join(cacheDir, "data.json")

	return &args{
		Dir:        *dir,
		SourceLang: *sourceLang,
		APIKey:     apiKey,
		APIURL:     *apiURL,
		Langs:      langs,
		CacheFile:  cacheFile,
		DryRun:     *dryRun,
		Sample:     *sample,
		SubDirs:    subDirs,
	}, nil
}

func validateArgs(args *args) error {
	if len(args.Langs) == 0 {
		return fmt.Errorf("provide --langs flag")
	}
	for _, lang := range args.Langs {
		if lang == args.SourceLang {
			return fmt.Errorf("source language %q cannot be in --langs list", args.SourceLang)
		}
	}
	return nil
}

func extractTexts(entries []TranslationEntry) []string {
	var texts []string
	for _, e := range entries {
		switch v := e.Translation.(type) {
		case string:
			neutral, _ := neutralizePlaceholders(v)
			texts = append(texts, neutral)
		case map[string]any:
			keys := make([]string, 0, len(v))
			for k := range v {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			for _, k := range keys {
				if str, ok := v[k].(string); ok {
					neutral, _ := neutralizePlaceholders(str)
					texts = append(texts, neutral)
				}
			}
		}
	}
	return texts
}
func estimateCost(texts []string, langs CommaSeparated, sourceLang, cacheFile string) error {
	estimator, err := NewTranslationEstimator(cacheFile)
	if err != nil {
		return fmt.Errorf("failed to initialize estimator: %w", err)
	}

	for _, lang := range langs {
		if lang == sourceLang {
			continue
		}
		for _, text := range texts {
			estimator.Estimate(text, sourceLang, lang)
		}
	}

	const pricePerMillion = 20.00
	totalChars := estimator.Total()
	estimatedCost := (float64(totalChars) / 1_000_000) * pricePerMillion

	fmt.Printf("Total estimated characters to translate: %d\n", totalChars)
	fmt.Printf("Estimated cost (€20.00 per 1M characters): €%.4f\n", estimatedCost)
	return nil
}

func updateEntries(entries []TranslationEntry, results []string) []TranslationEntry {
	translated := make([]TranslationEntry, 0, len(entries))
	resultIdx := 0

	for _, e := range entries {
		newEntry := e

		switch v := e.Translation.(type) {
		case string:
			if resultIdx < len(results) {
				restored := restorePlaceholders(results[resultIdx], extractPlaceholders(v))
				newEntry.Translation = restored
				resultIdx++
			}
		case map[string]any:
			keys := make([]string, 0, len(v))
			for k := range v {
				keys = append(keys, k)
			}
			sort.Strings(keys)

			newMap := make(map[string]any, len(v))
			for _, k := range keys {
				if str, ok := v[k].(string); ok && resultIdx < len(results) {
					phs := extractPlaceholders(str)
					newMap[k] = restorePlaceholders(results[resultIdx], phs)
					resultIdx++
				}
			}
			newEntry.Translation = newMap
		}

		translated = append(translated, newEntry)
	}

	return translated
}

// restorePlaceholders replaces {0}, {1}, ... with original {name} placeholders in order.
func restorePlaceholders(text string, placeholders []string) string {
	for i, ph := range placeholders {
		// Replace {0} → {user}, {1} → {n}, etc.
		text = strings.Replace(text, fmt.Sprintf("{%d}", i), ph, 1)
	}
	return text
}

var placeholderRE = regexp.MustCompile(`{[^}]+}`)

// extractPlaceholders extracts all {foo} tokens from text.
func extractPlaceholders(text string) []string {
	return placeholderRE.FindAllString(text, -1)
}

// neutralizePlaceholders replaces {foo} → {0}, {bar} → {1}, etc.
func neutralizePlaceholders(text string) (string, []string) {
	matches := placeholderRE.FindAllString(text, -1)
	neutralized := text
	for i, match := range matches {
		neutralized = strings.Replace(neutralized, match, fmt.Sprintf("{%d}", i), 1)
	}
	return neutralized, matches
}
