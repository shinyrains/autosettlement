# Bookcube Contract

Status: authority-closed for the current repo slice.

Authority sources inspected before closing this document:

- `tmp/platform-samples/bookcube/북큐브 상세매출 2026-5~2026-5 (1).xlsx`
- `docs/SPECIAL_PLATFORM_TRANSFORM_CONTRACT.md`
- `docs/AUTOSETTLEMENT_PARSER_CONTRACT_TEST_PLAN.md`

## 1. Current repo-slice scope

This document closes the minimum safe Bookcube parser lane for the current repo slice only.

In scope now:

- single-workbook Raon sample path
- one worksheet only
- one output row per source row
- dedicated XLSX adapter that skips the summary row and uses row 2 as the contracted header
- simple-extract-style parser mapping using the audited sample columns

Out of scope now:

- SR two-file production shape
- any multi-file concatenation / merge / aggregation policy
- duplicate-handling policy across multiple files
- company split inside one workbook
- any future alternate worksheet policy

## 2. Audited sample facts

Audited workbook:

- `tmp/platform-samples/bookcube/북큐브 상세매출 2026-5~2026-5 (1).xlsx`

Audited workbook shape:

- workbook has exactly one sheet in the current sample: `Sheet1`
- row 1 is a summary row, not a header row
- row 2 is the authoritative header row
- row 3+ are data rows
- current audited sample has 5 data rows

Audited summary row:

```text
정산액 합계 = 10,500
```

Audited row-data headers:

```text
제목
저자
출판권자
판매유형
판매처
부수
정가
판매액
할인
수수료
정산대상금액
정산액
정산월
도서번호
ISBN
e-ISBN(PDF)
e-ISBN(ePub)
서비스파일
제휴도서번호
```

## 3. Current parser shape decision

Bookcube is not safe to route through the generic `xlsxAdapter` in the current repo slice because the generic adapter treats row 1 as the header, while the audited sample uses row 1 as a summary line.

Therefore the current safe parser shape is:

```text
bookcube workbook
-> dedicated Bookcube XLSX adapter
-> flat tabular rows
-> dedicated Bookcube parser
-> SettlementRow[] + ParseIssue[]
```

## 4. Input contract

Current input contract for the repo slice:

- one workbook only
- one worksheet only
- use the first worksheet only in the current audited path
- skip row 1 summary
- use row 2 as the authoritative header
- parse row 3+ as source rows

Blocking conditions for the current adapter boundary:

- workbook parse failure
- missing worksheet
- missing row-2 contracted headers
- contracted required header missing

## 5. Row identity and output contract

Current row identity fields:

- `제목`
- `저자`
- `도서번호`

Current output mapping:

```text
workTitle          = 제목
mailerContentTitle = 제목
author             = 저자
publisher          = 출판권자
grossSales         = 판매액
settlementAmount   = 정산액
```

Source trace contract:

- `sourceFileName` must be the workbook filename
- `sourceRowIndex` must point to the original Excel row number (row 3+ in the current slice)

## 6. Money authority

Current audited money authority:

```text
grossSales       = 판매액
settlementAmount = 정산액
```

Current audited support-only money columns:

```text
정가
할인
수수료
정산대상금액
```

Current rule:

- `정산대상금액` is audit context only in the current repo slice.
- do not replace `grossSales` with `정산대상금액`.
- do not recalculate `settlementAmount` from `판매액`, `수수료`, or `정산대상금액`.

## 7. Sample-grounded sanity facts

The first audited source row normalizes as:

```text
제목       = 짝사랑을 끝냈더니 소꿉친구들이 나에게 집착한다 1
저자       = 봄날의복길이
출판권자   = B cafe
grossSales = 3000
settlementAmount = 2100
정산월     = 2026년5월
도서번호   = 230101938
```

The current audited workbook produces:

```text
5 source data rows
5 output rows
sum(settlementAmount) = 10,500
```

## 8. Required columns for the current slice

Required columns:

```text
제목
저자
판매액
정산액
```

Optional but preserved when present:

```text
출판권자
도서번호
정산월
```

## 9. Parse-issue boundary

Use current common issue types only.

Expected issue classes in this slice:

- `parse_error`
- `missing_column`
- `missing_field`
- `invalid_value`

Current rule:

- blank `제목` or `저자` -> `missing_field`
- non-numeric `판매액` or `정산액` -> `invalid_value`
- missing contracted header -> `missing_column`
- workbook/header read failure -> `parse_error`

## 10. Forbidden behavior

- do not treat row 1 summary as a data row
- do not treat row 1 summary as the header row
- do not recalculate settlement from `수수료`
- do not switch `grossSales` authority to `정산대상금액` in the current repo slice
- do not assume SR two-file behavior from the Raon one-file sample
- do not introduce grouped parsing or multi-file merge behavior before the SR contract is separately closed

## 11. Remaining open items

Still intentionally unresolved:

- final SR two-file production contract
- whether SR files are concatenated, summed by key, or treated as distinct source groups
- duplicate-handling rule across multiple Bookcube files
- whether any future non-`Sheet1` worksheet policy is needed
