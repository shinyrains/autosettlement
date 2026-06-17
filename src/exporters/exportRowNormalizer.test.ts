import { describe, expect, it } from "vitest";
import { normalizeExportWorkTitle } from "./exportRowNormalizer";

describe("normalizeExportWorkTitle", () => {
  it.each([
    ["상태창 워메이지 [연재]", "상태창 워메이지"],
    ["짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 [19세 완전판 외전]", "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다"],
    ["짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 [단행본][19세 완전판 외전]", "짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다"],
    ["1챕터의 고인물. 6", "1챕터의 고인물"],
    ["검은 별의 서점 외전", "검은 별의 서점"],
    ["위저드 스톤 770회", "위저드 스톤"],
  ])("normalizes export title %s", (input, expected) => {
    expect(normalizeExportWorkTitle(input)).toBe(expected);
  });
});
