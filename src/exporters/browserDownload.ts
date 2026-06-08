import type { ExportPackage } from "./exportPackageBuilder";

const excelMimeType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type BrowserDownloadEnvironment = {
  createElement: Document["createElement"];
  appendChild: HTMLElement["appendChild"];
  createObjectURL: (object: Blob | MediaSource) => string;
  revokeObjectURL: (url: string) => void;
};

export function downloadExportPackage(
  exportPackage: ExportPackage,
  environment: BrowserDownloadEnvironment = getBrowserDownloadEnvironment(),
): void {
  const blob = new Blob([exportPackage.workbookBuffer], {
    type: excelMimeType,
  });
  const objectUrl = environment.createObjectURL(blob);
  const anchor = environment.createElement("a");

  anchor.href = objectUrl;
  anchor.download = exportPackage.fileName;
  anchor.style.display = "none";

  environment.appendChild(anchor);
  anchor.click();
  anchor.remove();
  environment.revokeObjectURL(objectUrl);
}

function getBrowserDownloadEnvironment(): BrowserDownloadEnvironment {
  return {
    createElement: document.createElement.bind(document),
    appendChild: document.body.appendChild.bind(document.body),
    createObjectURL: URL.createObjectURL.bind(URL),
    revokeObjectURL: URL.revokeObjectURL.bind(URL),
  };
}
