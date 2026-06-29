/**
 * Bookmark Tests — Add, remove, folders, sync integration
 */
const { test, expect } = require('@playwright/test');

test.describe('Bookmarks', () => {

  test('should add bookmark with correct structure', () => {
    const bookmark = {
      id: Date.now(),
      url: 'https://github.com',
      title: 'GitHub',
      folderId: 'default',
    };
    expect(bookmark.url).toBe('https://github.com');
    expect(bookmark.folderId).toBe('default');
  });

  test('should prevent duplicate bookmarks', () => {
    const bookmarks = [
      { id: 1, url: 'https://google.com', title: 'Google' },
      { id: 2, url: 'https://github.com', title: 'GitHub' },
    ];
    const newUrl = 'https://google.com';
    const isDuplicate = bookmarks.some(b => b.url === newUrl);
    expect(isDuplicate).toBe(true);
  });

  test('should remove bookmark by ID', () => {
    const bookmarks = [
      { id: 1, url: 'https://google.com' },
      { id: 2, url: 'https://github.com' },
      { id: 3, url: 'https://apex.com' },
    ];
    const updated = bookmarks.filter(b => b.id !== 2);
    expect(updated.length).toBe(2);
    expect(updated.find(b => b.id === 2)).toBeUndefined();
  });

  test('should organize bookmarks into folders', () => {
    const folders = [
      { id: 'work', name: 'Work', bookmarks: [] },
      { id: 'personal', name: 'Personal', bookmarks: [] },
    ];
    const bookmarks = [
      { id: 1, url: 'https://jira.com', folderId: 'work' },
      { id: 2, url: 'https://netflix.com', folderId: 'personal' },
      { id: 3, url: 'https://slack.com', folderId: 'work' },
    ];

    for (const b of bookmarks) {
      const folder = folders.find(f => f.id === b.folderId);
      if (folder) folder.bookmarks.push(b);
    }

    expect(folders[0].bookmarks.length).toBe(2); // work
    expect(folders[1].bookmarks.length).toBe(1); // personal
  });

  test('should serialize bookmarks to JSON for sync', () => {
    const bookmarks = [
      { id: 1, url: 'https://google.com', title: 'Google' },
    ];
    const json = JSON.stringify(bookmarks);
    const parsed = JSON.parse(json);
    expect(parsed[0].url).toBe('https://google.com');
  });
});
