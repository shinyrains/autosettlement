import { describe, expect, it, vi } from "vitest";
import type { ExportPackage } from "./exportPackageBuilder";
import { downloadExportPackage } from "./browserDownload";

const packageFixture: ExportPackage = {
  company: "raon",
  artifactType: "review_excel",
  fileName: "raon-review.xlsx",
  workbookBuffer: new Uint8Array([1, 2, 3]).buffer,
  rowCount: 3,
};

describe("downloadExportPackage", () => {
  it("creates a browser download for an export package without mutating it", () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = {
      click,
      remove,
      href: "",
      download: "",
      style: { display: "" },
    } as unknown as HTMLAnchorElement;
    const appendChild = vi.fn();
    const createElement = vi.fn(() => anchor);
    const createObjectURL = vi.fn(() => "blob:export-package");
    const revokeObjectURL = vi.fn();
    const originalPackage = structuredClone({
      ...packageFixture,
      workbookBuffer: Array.from(new Uint8Array(packageFixture.workbookBuffer)),
    });

    try {
      downloadExportPackage(packageFixture, {
        createElement,
        appendChild,
        createObjectURL,
        revokeObjectURL,
      });

      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(createElement).toHaveBeenCalledWith("a");
      expect(appendChild).toHaveBeenCalledWith(anchor);
      expect(anchor.href).toBe("blob:export-package");
      expect(anchor.download).toBe("raon-review.xlsx");
      expect(anchor.style.display).toBe("none");
      expect(click).toHaveBeenCalledOnce();
      expect(remove).toHaveBeenCalledOnce();
      expect(revokeObjectURL).not.toHaveBeenCalled();

      vi.runAllTimers();

      expect(revokeObjectURL).toHaveBeenCalledWith("blob:export-package");
      expect({
        ...packageFixture,
        workbookBuffer: Array.from(new Uint8Array(packageFixture.workbookBuffer)),
      }).toEqual(originalPackage);
    } finally {
      vi.useRealTimers();
    }
  });
});
