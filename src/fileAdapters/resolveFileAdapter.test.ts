import { describe, expect, it } from "vitest";

import { parseMisterblueXlsxAdapter, parseNovelpiaHtmlXlsAdapter } from ".";
import type { FileAdapter } from "./types";
import { resolveFileAdapter } from "./resolveFileAdapter";

const fallbackAdapter: FileAdapter = () => ({ rows: [], issues: [] });
const customXlsxAdapter: FileAdapter = () => ({ rows: [], issues: [] });

const adapters = {
  csv: fallbackAdapter,
  xlsx: customXlsxAdapter,
  html_xls: fallbackAdapter,
};

describe("resolveFileAdapter", () => {
  it("uses platform-specific adapters before generic fileKind adapters", () => {
    expect(resolveFileAdapter("misterblue", "xlsx", adapters)).toBe(parseMisterblueXlsxAdapter);
    expect(resolveFileAdapter("novelpia", "html_xls", adapters)).toBe(parseNovelpiaHtmlXlsAdapter);
  });

  it("falls back to the configured fileKind adapter when no platform-specific adapter exists", () => {
    expect(resolveFileAdapter("series", "xlsx", adapters)).toBe(customXlsxAdapter);
  });
});
