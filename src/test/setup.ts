// App-boundary setup: storage runs for real against an in-memory IndexedDB, and DOM matchers are available.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
  localStorage.clear();
  globalThis.indexedDB = new IDBFactory(); // each test starts as a first visit
});
