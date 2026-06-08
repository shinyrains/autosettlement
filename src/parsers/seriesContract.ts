export type SeriesFileSlot = "general" | "app";

export type SeriesSourceRef = {
  sourceFileName: string;
  sourceRowIndex: number;
};

export type SeriesCalculatedItem = {
  group: SeriesFileSlot;
  workTitle: string;
  author: string;
  grossSales: number;
  settlementAmount: number;
  sourceRefs: SeriesSourceRef[];
};
