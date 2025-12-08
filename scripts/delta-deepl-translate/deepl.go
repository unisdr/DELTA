package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// DeepLTranslator uses the new TranslationCache
type DeepLTranslator struct {
	apiURL string
	apiKey string
	cache  *CacheFile
}

func NewDeepLTranslator(apiURL, apiKey, cachePath string) (*DeepLTranslator, error) {
	cache, err := NewCacheFile(cachePath)
	if err != nil {
		return nil, err
	}

	return &DeepLTranslator{
		apiURL: apiURL,
		apiKey: apiKey,
		cache:  cache,
	}, nil
}

const maxCharsPerRequest = 50000

func (t *DeepLTranslator) TranslateBatch(ctx context.Context, texts []string, targetLang, sourceLang string) ([]string, error) {
	results := make([]string, len(texts))

	// First: fill from cache
	toTranslate := []string{}
	toTranslateIndices := []int{}

	for i, text := range texts {
		if trans, ok := t.cache.Get(text, sourceLang, targetLang); ok {
			results[i] = trans
			continue
		}
		toTranslate = append(toTranslate, text)
		toTranslateIndices = append(toTranslateIndices, i)
	}

	if len(toTranslate) == 0 {
		return results, nil
	}

	// Process in batches by character count
	batchTexts := []string{}
	batchIndices := []int{}

	for i, text := range toTranslate {
		// Check batch size
		currentChars := 0
		for _, s := range batchTexts {
			currentChars += len(s)
		}
		if currentChars+len(text) > maxCharsPerRequest && len(batchTexts) > 0 {
			// Send current batch
			if err := t.sendBatch(ctx, batchTexts, targetLang, sourceLang, &results, &toTranslateIndices, batchIndices); err != nil {
				return nil, err
			}
			batchTexts = nil
			batchIndices = nil
		}
		batchTexts = append(batchTexts, text)
		batchIndices = append(batchIndices, i)
	}

	// Final batch
	if len(batchTexts) > 0 {
		if err := t.sendBatch(ctx, batchTexts, targetLang, sourceLang, &results, &toTranslateIndices, batchIndices); err != nil {
			return nil, err
		}
	}

	return results, nil
}

func (t *DeepLTranslator) sendBatch(
	ctx context.Context,
	texts []string,
	targetLang, sourceLang string,
	results *[]string,
	toTranslateIndices *[]int,
	batchLocalIndices []int,
) error {
	translated, err := t.callDeepL(ctx, texts, targetLang)
	if err != nil {
		return err
	}

	// Save each result to cache
	for j, translation := range translated {
		originalText := texts[j]
		globalIdx := (*toTranslateIndices)[batchLocalIndices[j]]

		t.cache.Set(originalText, sourceLang, targetLang, translation)
		(*results)[globalIdx] = translation
	}

	// Persist entire cache after batch
	if err := t.cache.Save(); err != nil {
		return fmt.Errorf("failed to save cache: %w", err)
	}

	return nil
}

func (t *DeepLTranslator) callDeepL(ctx context.Context, texts []string, targetLang string) ([]string, error) {
	type request struct {
		Text       []string `json:"text"`
		TargetLang string   `json:"target_lang"`
	}

	reqBody := request{
		Text:       texts,
		TargetLang: targetLang,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", t.apiURL+"/v2/translate", strings.NewReader(string(data)))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "DeepL-Auth-Key "+t.apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("deepl error: status %d", resp.StatusCode)
	}

	var deeplResp struct {
		Translations []struct {
			Text string `json:"text"`
		} `json:"translations"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&deeplResp); err != nil {
		return nil, err
	}

	var result []string
	for _, t := range deeplResp.Translations {
		result = append(result, t.Text)
	}
	return result, nil
}
