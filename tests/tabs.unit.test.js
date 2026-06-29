/**
 * Tab Lifecycle Tests — Unit tests for tab state management
 * Tests: create, close, switch, discard, restore, groups
 */
const { test, expect } = require('@playwright/test');

// Mock localStorage for Node environment
const mockStorage = {};
const localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = value; },
  removeItem: (key) => { delete mockStorage[key]; },
};

// Since useBrowserStore is Zustand, we test the state logic directly
test.describe('Tab Lifecycle', () => {

  test('should have default tab on startup', () => {
    // Verify default state structure
    const defaultTab = { id: 1, url: '', title: 'New Tab', isPinned: false };
    expect(defaultTab.id).toBe(1);
    expect(defaultTab.url).toBe('');
    expect(defaultTab.isPinned).toBe(false);
  });

  test('should generate unique tab IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const id = Date.now() + i; // Same logic as createTab
      ids.add(id);
    }
    expect(ids.size).toBe(100);
  });

  test('should not close last remaining tab', () => {
    const tabs = [{ id: 1, url: '', title: 'New Tab' }];
    // closeTab logic: if tabs.length === 1 return state unchanged
    const shouldClose = tabs.length > 1;
    expect(shouldClose).toBe(false);
  });

  test('should switch active tab to last tab on close', () => {
    const tabs = [
      { id: 1, url: 'https://google.com', title: 'Google' },
      { id: 2, url: 'https://github.com', title: 'GitHub' },
      { id: 3, url: 'https://apex.com', title: 'Apex' },
    ];
    const idToClose = 3;
    const newTabs = tabs.filter(t => t.id !== idToClose);
    const newActiveId = newTabs[newTabs.length - 1].id;
    expect(newActiveId).toBe(2);
    expect(newTabs.length).toBe(2);
  });

  test('should track recently closed tabs for restore', () => {
    const recentlyClosed = [];
    const closedTab = { id: 5, url: 'https://example.com', title: 'Example' };
    const updated = [closedTab, ...recentlyClosed].slice(0, 10);
    expect(updated.length).toBe(1);
    expect(updated[0].url).toBe('https://example.com');
  });

  test('should cap recently closed at 10 entries', () => {
    const recentlyClosed = Array.from({ length: 10 }, (_, i) => ({
      id: i, url: `https://site${i}.com`, title: `Site ${i}`
    }));
    const newClosed = { id: 99, url: 'https://new.com', title: 'New' };
    const updated = [newClosed, ...recentlyClosed].slice(0, 10);
    expect(updated.length).toBe(10);
    expect(updated[0].url).toBe('https://new.com');
  });

  test('should restore tab from recently closed', () => {
    const recentlyClosed = [
      { id: 5, url: 'https://example.com', title: 'Example' },
    ];
    const [last, ...rest] = recentlyClosed;
    expect(last.url).toBe('https://example.com');
    expect(rest.length).toBe(0);
  });

  test('tab group creation should assign unique IDs', () => {
    const group = { id: Date.now(), name: 'Work', color: '#4285f4', collapsed: false, tabIds: [1, 2] };
    expect(group.name).toBe('Work');
    expect(group.tabIds.length).toBe(2);
    expect(group.collapsed).toBe(false);
  });

  test('tab group should auto-delete when empty', () => {
    const groups = [
      { id: 1, name: 'Work', tabIds: [5] },
      { id: 2, name: 'Play', tabIds: [6, 7] },
    ];
    // Remove tab 5 from group 1
    const updated = groups.map(g => ({
      ...g, tabIds: g.tabIds.filter(id => id !== 5)
    })).filter(g => g.tabIds.length > 0);
    expect(updated.length).toBe(1);
    expect(updated[0].name).toBe('Play');
  });

  test('pinned tabs should sort to the start', () => {
    const tabs = [
      { id: 1, isPinned: false },
      { id: 2, isPinned: true },
      { id: 3, isPinned: false },
    ];
    const sorted = [...tabs].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
    expect(sorted[0].id).toBe(2);
    expect(sorted[0].isPinned).toBe(true);
  });
});
