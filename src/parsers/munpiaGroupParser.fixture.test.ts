import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PlatformFileGroupParserContext, TabularRow } from "./parserContract";
import { parseMunpiaFileGroup, type MunpiaGroupFileInput } from "./munpiaGroupParser";

type FixtureManifest = {
  fixtureId: string;
  batchId: string;
  company: "sr" | "raon";
  platform: "munpia";
  saleMonth: string;
  expected: {
    settlementRows: string;
    parseIssues: string;
  };
  files: Array<{
    fileName: string;
    path: string;
    slot?: string;
    worksheetCount?: number;
    sheetName?: string;
    issuesPath?: string;
  }>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureRoot = path.resolve(__dirname, "../../fixtures/parser-contract/munpia");
const fixtureIds = [
  "munpia_group_author_correction_adapter_issue_passthrough",
  "munpia_group_author_correction_missing_match_skips_affected_row",
  "munpia_group_author_correction_title_fallback",
  "munpia_group_author_correction_work_code_happy_path",
  "munpia_group_duplicate_author_correction_slot",
  "munpia_group_duplicate_settlement_slot",
  "munpia_group_empty_settlement_rows",
  "munpia_group_missing_required_column_blocks",
  "munpia_group_missing_settlement_slot",
  "munpia_group_multisheet_without_sheet_name_blocks",
  "munpia_group_settlement_adapter_issue_blocks",
  "munpia_group_unknown_slot_blocks",
  "munpia_group_valid_single_sheet",
] as const;

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function loadManifest(fixtureId: string): FixtureManifest {
  return readJson<FixtureManifest>(path.join(fixtureRoot, fixtureId, "manifest.json"));
}

function buildContext(manifest: FixtureManifest): PlatformFileGroupParserContext {
  return {
    batchId: manifest.batchId,
    company: manifest.company,
    platform: manifest.platform,
    saleMonth: manifest.saleMonth,
    sourceFileNames: manifest.files.map((file) => file.fileName),
  };
}

function buildFiles(manifest: FixtureManifest): MunpiaGroupFileInput[] {
  return manifest.files.map((file) => ({
    sourceFileName: file.fileName,
    slot: file.slot,
    worksheetCount: file.worksheetCount,
    sheetName: file.sheetName,
    rows: readJson<TabularRow[]>(path.join(fixtureRoot, manifest.fixtureId, file.path)),
    issues: file.issuesPath
      ? readJson(path.join(fixtureRoot, manifest.fixtureId, file.issuesPath))
      : [],
  }));
}

describe("munpia group parser fixture contract", () => {
  it("loads the current Munpia fixture manifests and referenced JSON artifacts", () => {
    const discoveredFixtureIds = readdirSync(fixtureRoot, { withFileTypes: true })
      .filter((entry: { isDirectory(): boolean }) => entry.isDirectory())
      .map((entry: { name: string }) => entry.name)
      .sort();

    expect(discoveredFixtureIds).toEqual([...fixtureIds].sort());

    for (const fixtureId of fixtureIds) {
      const fixtureDir = path.join(fixtureRoot, fixtureId);
      const manifestPath = path.join(fixtureDir, "manifest.json");

      expect(existsSync(manifestPath)).toBe(true);

      const manifest = readJson<FixtureManifest>(manifestPath);
      expect(manifest.fixtureId).toBe(fixtureId);

      const settlementRowsPath = path.join(fixtureDir, manifest.expected.settlementRows);
      const parseIssuesPath = path.join(fixtureDir, manifest.expected.parseIssues);

      expect(existsSync(settlementRowsPath)).toBe(true);
      expect(existsSync(parseIssuesPath)).toBe(true);
      expect(() => readJson<unknown>(settlementRowsPath)).not.toThrow();
      expect(() => readJson<unknown>(parseIssuesPath)).not.toThrow();

      for (const file of manifest.files) {
        const inputPath = path.join(fixtureDir, file.path);
        expect(existsSync(inputPath)).toBe(true);
        expect(() => readJson<unknown>(inputPath)).not.toThrow();
      }
    }
  });

  it.each(fixtureIds)("matches fixture outputs for %s", (fixtureId) => {
    const manifest = loadManifest(fixtureId);
    const result = parseMunpiaFileGroup(buildContext(manifest), buildFiles(manifest));

    expect(result.rows).toEqual(
      readJson(path.join(fixtureRoot, fixtureId, manifest.expected.settlementRows)),
    );
    expect(result.issues).toEqual(
      readJson(path.join(fixtureRoot, fixtureId, manifest.expected.parseIssues)),
    );
  });
});
