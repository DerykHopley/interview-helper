// App-boundary setup: storage runs for real against an in-memory IndexedDB, and DOM matchers are available.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { devSettings } from "../dev/devSettings";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  sessionStorage.clear();
  localStorage.clear();
  devSettings.reload(); // the Developer panel's settings, read again from the cleared storage
  globalThis.indexedDB = new IDBFactory(); // each test starts as a first visit
});
