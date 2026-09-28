// App-boundary setup: storage runs for real against an in-memory IndexedDB, and DOM matchers are available.
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
