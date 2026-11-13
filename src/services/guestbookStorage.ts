/**
 * Guestbook Data Storage Service
 * Encapsulates localStorage operations so it can be seamlessly swapped
 * with Supabase, Firebase, or an external API in the future.
 */

import { WEDDING_CONFIG } from '../config/weddingConfig';

export interface GuestbookEntry {
  id: string;
  author: string;
  emoji: string;
  message: string;
  createdAt: string;
}

const STORAGE_KEY = 'cyworld_wedding_guestbook_v2';
const BASE_COUNT_KEY = 'cyworld_wedding_guestbook_base_count_v2';

// Base count matching the design mock (26)
const DEFAULT_TOTAL_COUNT = 26;

export class GuestbookService {
  /**
   * Retrieves all guestbook entries from storage.
   * If empty, initializes with default sample entries from WEDDING_CONFIG.
   */
  public static getEntries(): GuestbookEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const initial = WEDDING_CONFIG.initialGuestbook;
        this.saveEntries(initial);
        return initial;
      }
      return JSON.parse(stored);
    } catch {
      return WEDDING_CONFIG.initialGuestbook;
    }
  }

  /**
   * Saves the list of entries to localStorage.
   */
  public static saveEntries(entries: GuestbookEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save guestbook entries to localStorage:', e);
    }
  }

  /**
   * Adds a new guestbook entry and saves it at the beginning of the list.
   */
  public static addEntry(data: {
    author?: string;
    authorName?: string;
    ilchonName?: string;
    emoji: string;
    message: string;
  }): GuestbookEntry {
    const entries = this.getEntries();
    const now = new Date();
    const formattedDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let authorDisplay = '';
    if (data.authorName !== undefined) {
      const name = data.authorName.trim() || '익명의 일촌';
      const ilchon = data.ilchonName?.trim();
      authorDisplay = ilchon ? `${name}(${ilchon})` : name;
    } else {
      authorDisplay = data.author?.trim() || '익명의 일촌';
    }

    const newEntry: GuestbookEntry = {
      id: 'gb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      author: authorDisplay,
      emoji: data.emoji || '💕',
      message: data.message.trim(),
      createdAt: formattedDate,
    };

    const updated = [newEntry, ...entries];
    this.saveEntries(updated);

    // Increment total hearts count
    const currentBase = this.getBaseCount();
    this.setBaseCount(currentBase + 1);

    return newEntry;
  }

  /**
   * Deletes a guestbook entry by ID.
   */
  public static deleteEntry(id: string): void {
    const entries = this.getEntries();
    const updated = entries.filter((e) => e.id !== id);
    this.saveEntries(updated);
  }

  /**
   * Gets the total count of heart/guestbook participants.
   * Synced with the miniroom speech bubble ("벌써 26명이 마음을 남겼어요")
   */
  public static getTotalCount(): number {
    try {
      const stored = localStorage.getItem(BASE_COUNT_KEY);
      if (stored !== null) {
        return parseInt(stored, 10);
      }
      // If not stored, calculate: DEFAULT_TOTAL_COUNT + (entries.length - initial.length)
      const entries = this.getEntries();
      const initialLength = WEDDING_CONFIG.initialGuestbook.length;
      const count = DEFAULT_TOTAL_COUNT + Math.max(0, entries.length - initialLength);
      localStorage.setItem(BASE_COUNT_KEY, count.toString());
      return count;
    } catch {
      return DEFAULT_TOTAL_COUNT;
    }
  }

  private static getBaseCount(): number {
    try {
      const stored = localStorage.getItem(BASE_COUNT_KEY);
      return stored ? parseInt(stored, 10) : DEFAULT_TOTAL_COUNT;
    } catch {
      return DEFAULT_TOTAL_COUNT;
    }
  }

  private static setBaseCount(count: number): void {
    try {
      localStorage.setItem(BASE_COUNT_KEY, count.toString());
    } catch (e) {
      console.error('Failed to update base count:', e);
    }
  }
}
