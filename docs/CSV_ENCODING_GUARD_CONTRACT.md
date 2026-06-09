# CSV Encoding Guard Contract

## 1. Purpose

This document defines the CSV encoding guard contract for AutoSettlement.

The purpose is to prevent Korean CSV headers from being decoded incorrectly and then silently flowing into parser calculations.

CSV decoding must fail loudly when the file cannot be decoded safely. A malformed or mojibake header must not be allowed to continue into settlement calculation.

```text
broken CSV decode -> block with ParseIssue(parse_error)
broken CSV decode -> never continue as normal settlement rows
```

## 2. Target Platforms

This contract applies to current and future CSV-based platforms, including:

```text
ridibooks
aladin
guru_company
joara
epyrus
future CSV platforms
```

## 3. Sample Audit Result

Confirmed sample results:

```text
ridibooks: UTF-8 BOM, comma
aladin: UTF-8 BOM, comma
guru_company: UTF-8 BOM, comma
joara: UTF-8 BOM, comma
epyrus: CP949/EUC-KR, comma
```

This means UTF-8-only handling is not enough for the current sample set.

## 4. Current Risk

The current CSV adapter accepts string input only.

Risk:

```text
browser File.text()
-> CP949/EUC-KR CSV decoded as UTF-8 or replacement text
-> Korean headers become mojibake
-> parser cannot match required columns
-> missing_column or, worse, incorrect empty/zero calculations
```

Header corruption is a settlement correctness risk. It can produce incorrect output even when the file shape appears to parse.

## 5. Adapter Responsibility

The CSV adapter/file adapter layer is responsible for decoding raw CSV file content before platform parsers run.

Required responsibilities:

- Accept byte-based input such as `ArrayBuffer` or `Uint8Array`.
- Preserve existing string input behavior for tests and already-decoded content.
- Detect and remove UTF-8 BOM.
- Decode UTF-8.
- Decode CP949/EUC-KR.
- Detect likely mojibake or invalid decode results.
- Return `ParseIssue(parse_error)` when decoding is unsafe.
- Return `TabularRow[]` only after a safe decode.

The adapter must not create `SettlementRow`.

The adapter must not interpret platform-specific settlement columns beyond decode/header safety checks.

## 6. Parser Responsibility

Platform parsers receive already-decoded `TabularRow[]`.

Parser responsibilities:

- Validate platform-specific required columns.
- Validate required field values.
- Parse numbers.
- Calculate or extract settlement results.
- Return `SettlementRow[] + ParseIssue[]`.

Parser non-responsibilities:

- Do not guess CSV encoding.
- Do not repair mojibake text.
- Do not re-decode byte content.
- Do not silently treat missing decoded headers as zero values.

## 7. Decode Candidate Order

Recommended decode order:

```text
1. UTF-8 BOM
2. UTF-8
3. CP949 / EUC-KR
```

When UTF-8 BOM is present, prefer UTF-8 BOM handling.

When UTF-8 decode fails, try CP949/EUC-KR.

When multiple non-UTF decoders produce plausible output, choose the one that preserves Korean headers and produces the expected delimiter/header shape.

## 8. Mojibake / Broken Decode Detection

The adapter should treat decoding as unsafe when one or more of these conditions are detected:

- Replacement character `�` appears in header or decoded text.
- Required Korean headers for the expected platform are not detectable.
- Header cells contain obvious mojibake patterns.
- Header row is empty after trimming.
- Delimiter split produces an implausible header shape.
- Row structure is severely inconsistent with the header.

Platform-specific required header checks can remain parser responsibility, but decode guard should prevent clearly broken text from reaching parser logic.

## 9. Delimiter Policy

Current CSV samples use comma delimiters.

```text
current delimiter: comma
```

Automatic delimiter detection is a later enhancement and is not required for the first encoding guard implementation.

If delimiter detection is added later, it must still fail loudly when the detected structure is implausible.

## 10. Implementation Checklist

Before implementation:

- Keep existing string input tests passing.
- Add byte input support with `ArrayBuffer` and/or `Uint8Array`.
- Add sanitized UTF-8 BOM CSV fixture tests.
- Add sanitized CP949 CSV fixture tests.
- Add broken UTF-8/invalid decode tests.
- Ensure failed decode returns `ParseIssue(parse_error)`.
- Ensure raw business CSV samples remain under ignored `tmp/` paths.
- Do not add original CSV samples to the repository.
- Confirm browser upload flow uses `File.arrayBuffer()` rather than relying only on `File.text()`.

## 11. Forbidden Behavior

- Do not silently continue after a broken decode.
- Do not let mojibake headers flow into parser calculations.
- Do not convert missing/garbled amount columns to zero.
- Do not implement platform parsers as a workaround for encoding issues.
- Do not add original CSV business files to Git.
- Do not make parser code responsible for byte decoding.

## 12. Next Step

Recommended implementation task:

```text
CSV-ENCODING-GUARD-001
```

Expected scope:

- CSV adapter byte input support
- UTF-8 BOM / UTF-8 / CP949-EUC-KR decode guard
- Sanitized fixture tests
- No platform parser implementation
