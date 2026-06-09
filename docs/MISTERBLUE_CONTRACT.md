# Misterblue Contract

Status: authority-closed for the current repo slice.

Authority source inspected before closing this document:

- `tmp/platform-samples/misterblue/작품별정산_2026-04-01_2026-04-30.xlsx`
- Sheet names observed: `작품별`, `볼륨별`
- Actual usable sheet for row-level settlement parsing: `작품별`
- Actual workbook structure observed on `작품별`:
  - row 1 = title row only (`판매 방식별 매출 상세내역`)
  - rows 2-5 = merged multi-row header
  - row 6+ = data rows

## 1. Input rule

- Accept exactly one Misterblue settlement workbook per parse.
- Use only the `작품별` sheet.
- Ignore `볼륨별` for MVP settlement parsing.
- Ignore row 1 title text.
- Flatten header rows 2-5 into exact hierarchical header keys.
- Data rows start at Excel row 6.

## 2. Header flattening contract

The adapter must preserve the visible Korean hierarchy and emit slash-joined keys.
Representative required keys:

- `작품코드`
- `작품명`
- `작가명`
- `종량 / 블루머니 / 권별 대여 / 매출액`
- `종량 / 블루머니 / 권별 소장 / 매출액`
- `종량 / 블루머니 / 전권 대여 / 매출액`
- `종량 / 블루머니 / 전권 소장 / 매출액`
- `종량 / A.앱머니 / 권별 대여 / 매출액`
- `종량 / A.앱머니 / 권별 소장 / 매출액`
- `종량 / A.앱머니 / 전권 대여 / 매출액`
- `종량 / A.앱머니 / 전권 소장 / 매출액`
- `종량 / i.앱머니 / 권별 대여 / 매출액`
- `종량 / i.앱머니 / 권별 소장 / 매출액`
- `종량 / i.앱머니 / 전권 대여 / 매출액`
- `종량 / i.앱머니 / 전권 소장 / 매출액`
- `합계(정액+종량) / 정산액`

Observed sample fact:

- `정액` section columns exist, but the inspected sample had all-zero values there.
- Current MVP parser does not use `정액` columns for Misterblue output.

## 3. Transform rule

For each usable row:

- `normalGrossSales` = sum of:
  - `종량 / 블루머니 / 권별 대여 / 매출액`
  - `종량 / 블루머니 / 권별 소장 / 매출액`
  - `종량 / 블루머니 / 전권 대여 / 매출액`
  - `종량 / 블루머니 / 전권 소장 / 매출액`
- `appGrossSales` = sum of:
  - `종량 / A.앱머니 / 권별 대여 / 매출액`
  - `종량 / A.앱머니 / 권별 소장 / 매출액`
  - `종량 / A.앱머니 / 전권 대여 / 매출액`
  - `종량 / A.앱머니 / 전권 소장 / 매출액`
  - `종량 / i.앱머니 / 권별 대여 / 매출액`
  - `종량 / i.앱머니 / 권별 소장 / 매출액`
  - `종량 / i.앱머니 / 전권 대여 / 매출액`
  - `종량 / i.앱머니 / 전권 소장 / 매출액`
- `totalSettlementAmount` = `합계(정액+종량) / 정산액`

Output rule:

- If `normalGrossSales > 0`, create one normal row.
- If `appGrossSales > 0`, create one app row.
- If both are zero, create no settlement rows for that source row.

Settlement split rule for mixed rows:

- The inspected workbook exposes one authoritative total settlement amount column, not separate normal/app settlement columns.
- Therefore split `totalSettlementAmount` proportionally by gross share.
- `normalSettlementAmount = round1(totalSettlementAmount * normalGrossSales / totalGrossSales)`
- `appSettlementAmount = round1(totalSettlementAmount - normalSettlementAmount)`
- If only one side has positive gross sales, that side receives the full `totalSettlementAmount`.

`round1(x)` means round to one decimal place to stay aligned with the observed workbook precision.

## 4. Title output

```text
normal row -> 작품명
app row    -> 작품명(app)
```

## 5. Identity and source rules

- `workTitle` uses `작품명` exactly as provided.
- `author` uses `작가명` exactly as provided.
- `sourceFileName` comes from the workbook file name.
- `sourceRowIndex` comes from the Excel row number after header flattening.

## 6. Aggregate-row handling

Skip summary-like rows when all identity fields needed for a real work row are blank.

Current observed example:

- the inspected sample ends with an aggregate row whose gross/settlement totals are filled but `작품명` and `작가명` are blank.
- this row must not create a `SettlementRow` and must not raise a parser issue.

## 7. Forbidden behavior

- Do not read `볼륨별` to invent per-title settlement splits for MVP.
- Do not guess a different sheet when `작품별` is missing.
- Do not merge normal/app into one output row.
- Do not extract settlement amount from a non-authoritative subtotal column when `합계(정액+종량) / 정산액` exists.
- Do not silently reinterpret `정액` columns as active revenue unless a future authority document reopens that rule.
- Do not emit rows for aggregate summary lines.

## 8. Current implementation boundary

Allowed in this repo slice:

- isolated Misterblue single-file parser
- Misterblue-specific XLSX adapter behavior for `작품별` selection and 4-row header flattening
- parser registry wiring
- file/batch orchestrator wiring through the existing single-file path

Still out of scope in this slice:

- UI-specific upload slot redesign for Misterblue
- any alternate sheet-name fallback policy
- any contract that depends on additional non-sanitized workbook families beyond the inspected sample
