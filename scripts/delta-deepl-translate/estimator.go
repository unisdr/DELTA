package main

// TranslationEstimator estimates character count for translations not already cached.
type TranslationEstimator struct {
	fileCache *CacheFile // Persistent cache (on disk)
	memCache  *CacheMem  // In-progress tracking (this run)
	charCount int
}

// NewTranslationEstimator creates an estimator that checks both disk and in-memory state.
func NewTranslationEstimator(cacheFile string) (*TranslationEstimator, error) {
	fileCache, err := NewCacheFile(cacheFile)
	if err != nil {
		return nil, err
	}

	return &TranslationEstimator{
		fileCache: fileCache,
		memCache:  NewCacheMem(),
		charCount: 0,
	}, nil
}

// Estimate checks if the text is already in persistent or in-progress cache.
// If not, it adds to the estimated character count.
func (e *TranslationEstimator) Estimate(text, sourceLang, targetLang string) {
	if text == "" {
		return
	}

	// Skip if already in persistent cache
	if _, found := e.fileCache.Get(text, sourceLang, targetLang); found {
		return
	}

	// Skip if already tracked in this batch (dedup)
	if _, found := e.memCache.Get(text, sourceLang, targetLang); found {
		return
	}

	// New text: count it and track in memCache
	e.charCount += len(text)
	e.memCache.Set(text, sourceLang, targetLang, "_placeholder_") // value doesn't matter
}

// Total returns the estimated total characters to be sent.
func (e *TranslationEstimator) Total() int {
	return e.charCount
}
