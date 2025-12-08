package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// CacheMem is a simple in-memory store: from -> to -> text -> translation
type CacheMem struct {
	// data[from][to][text] = translation
	data map[string]map[string]map[string]string
}

// NewCacheMem creates a new in-memory cache.
func NewCacheMem() *CacheMem {
	return &CacheMem{
		data: make(map[string]map[string]map[string]string),
	}
}

// Get looks up a translation.
func (c *CacheMem) Get(text, from, to string) (string, bool) {
	if _, ok := c.data[from]; !ok {
		return "", false
	}
	if _, ok := c.data[from][to]; !ok {
		return "", false
	}
	trans, ok := c.data[from][to][text]
	return trans, ok
}

// Set stores a translation.
func (c *CacheMem) Set(text, from, to, trans string) {
	if _, ok := c.data[from]; !ok {
		c.data[from] = make(map[string]map[string]string)
	}
	if _, ok := c.data[from][to]; !ok {
		c.data[from][to] = make(map[string]string)
	}
	c.data[from][to][text] = trans
}

// CacheFile handles persistence.
type CacheFile struct {
	*CacheMem
	path string
}

// NewCacheFile loads the cache from a file.
func NewCacheFile(path string) (*CacheFile, error) {
	cache := NewCacheMem()

	// Try to load existing file
	if _, err := os.Stat(path); err == nil {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		if len(data) > 0 {
			if err := json.Unmarshal(data, &cache.data); err != nil {
				return nil, err
			}
		}
	}

	return &CacheFile{
		CacheMem: cache,
		path:     path,
	}, nil
}

// Save writes the current cache to disk.
func (c *CacheFile) Save() error {
	if err := os.MkdirAll(filepath.Dir(c.path), 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(c.data, "", "  ")
	if err != nil {
		return err
	}

	return writeAtomically(c.path, data)
}
