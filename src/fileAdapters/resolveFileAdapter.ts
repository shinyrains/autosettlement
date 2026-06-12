import {
  parseBookcubeXlsxAdapter,
  parseKakaoPageXlsxAdapter,
  parseKyoboXlsxAdapter,
  parseMisterblueXlsxAdapter,
  parseMootoonXlsxAdapter,
  parseNovelpiaHtmlXlsAdapter,
  parseOnestoreXlsxAdapter,
  parsePanmurimXlsxAdapter,
} from ".";
import type { Platform } from "../types/settlement";
import type { FileAdapter, FileKind } from "./types";

export function resolveFileAdapter(
  platform: Platform,
  fileKind: FileKind,
  adapters: Record<FileKind, FileAdapter>,
): FileAdapter | undefined {
  if (platform === "misterblue" && fileKind === "xlsx") {
    return parseMisterblueXlsxAdapter;
  }

  if (platform === "panmurim" && fileKind === "xlsx") {
    return parsePanmurimXlsxAdapter;
  }

  if (platform === "bookcube" && fileKind === "xlsx") {
    return parseBookcubeXlsxAdapter;
  }

  if (platform === "kakao_page" && fileKind === "xlsx") {
    return parseKakaoPageXlsxAdapter;
  }

  if (platform === "kyobo" && fileKind === "xlsx") {
    return parseKyoboXlsxAdapter;
  }

  if (platform === "mootoon" && fileKind === "xlsx") {
    return parseMootoonXlsxAdapter;
  }

  if (platform === "novelpia" && fileKind === "html_xls") {
    return parseNovelpiaHtmlXlsAdapter;
  }

  if (platform === "onestore" && fileKind === "xlsx") {
    return parseOnestoreXlsxAdapter;
  }

  return adapters[fileKind];
}
