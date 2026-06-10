# Onestore Contract

Status: authority-closed for the current repo slice.

Authority sources inspected before closing this document:

- `tmp/platform-samples/onestore/정산내역_20260608_163327.xlsx`
- `docs/SPECIAL_PLATFORM_TRANSFORM_CONTRACT.md`
- `docs/AUTOSETTLEMENT_PARSER_CONTRACT_TEST_PLAN.md`

## 1. Current repo-slice scope

This document closes the minimum safe Onestore parser lane for the current repo slice only.

In scope now:

- single audited workbook path
- single worksheet only
- two-row merged-header XLSX input
- one output row per valid source row
- publisher-based company split inside one workbook
- dedicated XLSX adapter + dedicated parser

Out of scope now:

- any alternate workbook layout
- multi-file reconciliation
- slot-based grouped parsing
- future publisher alias expansion beyond the audited current normalization set
- channel-specific title suffix policy derived from `구매요청POC`

## 2. Audited sample facts

Audited workbook:

- `tmp/platform-samples/onestore/정산내역_20260608_163327.xlsx`

Audited workbook shape:

- workbook has one sheet in the current sample: `multimedia`
- row 1 is the top merged-header row
- row 2 is the leaf-header row
- row 3+ are source data rows
- current audited sample has `13209` source rows

Audited sample-wide facts:

- `파트너명` is currently always `주식회사 라온이앤엠`
- `사업자구분` is currently always `원스토어㈜`
- `정산유형` is currently always `정규`
- current publisher distribution:
  - `라온E&M` = `11530`
  - `Arete` = `1302`
  - `라온이앤엠` = `376`
  - `라온 E&M` = `1`

## 3. Parser shape decision

Onestore is not safe to route through the generic `xlsxAdapter` in the current repo slice because the audited workbook uses a two-row merged-header shape.

The current safe parser shape is:

```text
onestore workbook
-> dedicated Onestore XLSX adapter
-> flattened tabular rows
-> dedicated Onestore parser
-> SettlementRow[] + ParseIssue[]
```

It is also not safe as plain Simple Extract wiring because company split happens inside the parser boundary.

## 4. Input contract

Current input contract for the repo slice:

- one workbook only
- use the first worksheet only in the current audited path
- flatten row 1 + row 2 into contracted header keys
- parse row 3+ as source rows
- keep one source row -> one output row

Current required contracted headers:

```text
상품명
출판사
글작가
합계
정산지급액
```

Current important support headers:

```text
채널상품명
구매요청POC
정산유형
판매 / 금액
취소 / 금액
서비스이용료 / 고객결제 서비스이용료
서비스이용료 / 쿠폰/시다무/포인트등
서비스이용료 / 차감
```

## 5. Row identity and output contract

Current row identity fields:

- `상품명`
- `글작가`
- `출판사`

Current output mapping:

```text
workTitle          = 상품명
mailerContentTitle = 상품명
author             = 글작가
publisher          = 출판사
grossSales         = 합계
settlementAmount   = 정산지급액
```

Source trace contract:

- `sourceFileName` must be the workbook filename
- `sourceRowIndex` must point to the original Excel row number (row 3+)

## 6. Company split authority

Current company split is part of the parser contract.

Current audited normalization set:

```text
publisher in { Arete, arete, ARETE } -> sr
publisher in { 라온E&M, 라온이앤엠, 라온 E&M } -> raon
```

Current rule:

- recognized SR publisher rows produce `SettlementRow.company = sr`
- recognized Raon publisher rows produce `SettlementRow.company = raon`
- unmatched publisher rows must not silently default; they surface `company_split_failed` and the affected row is skipped

Current audited sample result under this rule:

```text
sr   = 1302 rows
raon = 11907 rows
unknown = 0 rows
```

## 7. Money authority

Current audited money authority:

```text
grossSales       = 합계
settlementAmount = 정산지급액
```

Current support-only audit columns:

```text
판매 / 금액
취소 / 금액
서비스이용료 / 고객결제 서비스이용료
서비스이용료 / 쿠폰/시다무/포인트등
서비스이용료 / 차감
```

Current audited arithmetic relationship:

```text
합계 = 판매 / 금액 - 취소 / 금액
정산지급액 = 합계 - 서비스이용료 / 고객결제 서비스이용료 - 서비스이용료 / 쿠폰/시다무/포인트등 - 서비스이용료 / 차감
```

Current rule:

- use direct audited columns `합계`, `정산지급액` as the output authority
- do not recalculate output amounts from support columns inside the current parser lane
- support columns remain audit-only guards in the current repo slice

## 8. Sample-grounded sanity facts

The first audited SR row normalizes as:

```text
상품명       = 레이드 커맨더 4권
채널상품명   = 레이드 커맨더
출판사       = Arete
글작가       = 산호초
grossSales   = 3200
settlementAmount = 2016
company      = sr
```

The first audited Raon row normalizes as:

```text
상품명       = 플레이어 시스템 4권
채널상품명   = 플레이어 시스템
출판사       = 라온E&M
글작가       = 현무지기
grossSales   = 3200
settlementAmount = 2016
company      = raon
```

The current audited workbook produces:

```text
13209 source rows
13209 output rows
0 company-split failures
```

## 9. Parse-issue boundary

Use current common issue types only.

Expected issue classes in this slice:

- `parse_error`
- `missing_column`
- `missing_field`
- `invalid_value`
- `company_split_failed`

Current rule:

- blank `상품명`, `글작가`, or `출판사` -> `missing_field`
- non-numeric `합계` or `정산지급액` -> `invalid_value`
- unmatched publisher normalization -> `company_split_failed`
- missing contracted header -> `missing_column`
- workbook/header read failure -> `parse_error`

## 10. Browser live-upload design boundary

Current judgment for browser live upload:

- Onestore is **not** authorized under the current single-file live-upload contract.
- Reason: one audited workbook produces rows for both `sr` and `raon` in the same parse result.
- The current single-file live-upload authority assumes one upload card maps to one committed `(company, platform)` slice.
- Current `BatchPlatformUpload` shape also carries a single `company` per upload card, so plain reuse would force an invalid one-card/one-company simplification.

Current authority-safe future direction:

- keep the existing parser/orchestrator output unchanged (`SettlementRow.company` remains row-level truth)
- do **not** split the workbook into fake separate browser uploads by filename or manual company guess
- freeze a future mixed-company upload-mutation contract before UI wiring (`docs/AUTOSETTLEMENT_MIXED_COMPANY_UPLOAD_MUTATION_CONTRACT.md`)
- that future contract must define:
  - one Onestore workbook selection event
  - two committed replacement targets: `(sr, onestore)` and `(raon, onestore)` together
  - one aggregate upload-card metadata surface for the shared workbook
  - safe failure semantics when only one company slice returns issues

Until that authority exists, Onestore remains parser/orchestrator-complete but browser-live-upload-blocked.

## 11. Forbidden behavior

- do not route the current path through the generic `xlsxAdapter`
- do not silently default unknown publishers to `raon`
- do not silently default unknown publishers to `sr`
- do not recalculate `grossSales` from support columns when `합계` already exists
- do not recalculate `settlementAmount` from service-fee columns when `정산지급액` already exists
- do not derive title suffixes from `구매요청POC` in the current repo slice
- do not force Onestore into the current single-company live-upload card model without a separate mixed-company mutation authority

## 12. Remaining open items

Still intentionally unresolved:

- future publisher alias table expansion beyond the current audited set
- whether `채널상품명` should later override or supplement `상품명` in some export paths
- whether future alternate worksheets or alternate workbook formats exist
- whether downstream UI wants channel-specific display derived from `구매요청POC`
