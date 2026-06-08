# Series Parser Fixture Plan

## 1. 목적

이 문서는 `series` 플랫폼 파서 구현 전에 6개 입력 파일 fixture, manifest, expected result 계약을 고정하기 위한 계획서다.

시리즈는 Simple Extract Platform이 아니라 Formula Platform이다. 따라서 테스트 fixture는 단일 원본 row를 그대로 `SettlementRow`로 옮기는 방식이 아니라, 6개 HTML `.xls` 파일을 slot 기준으로 묶고 `시리즈 계산방법.xlsx` 기준 계산 결과가 최종 `SettlementRow[]`와 `ParseIssue[]`로 떨어지는지를 검증해야 한다.

이 문서는 구현 문서가 아니다. parser, orchestrator, adapter, UI, export, emailer 코드는 수정하지 않는다.

## 2. fixture group 구조

시리즈 fixture는 6개 파일을 하나의 group으로 다룬다.

권장 디렉터리 구조:

```text
fixtures/parser-contract/series/
└─ series_valid_6_html_xls/
   ├─ manifest.json
   ├─ input/
   │  ├─ general-1.xls
   │  ├─ general-2.xls
   │  ├─ general-3.xls
   │  ├─ app-1.xls
   │  ├─ app-2.xls
   │  └─ app-3.xls
   └─ expected/
      ├─ settlementRows.json
      ├─ parseIssues.json
      └─ calculatedItems.json
```

파일명은 fixture를 사람이 읽기 쉽게 하기 위한 예시일 뿐이다. 실제 일반/app 판정은 파일명으로 하지 않고 manifest의 `slot` 값으로만 한다.

fixture group은 최소 아래 정보를 가져야 한다.

- `batchId`: 정산 작업 ID
- `company`: `raon` 또는 `sr`
- `platform`: 항상 `series`
- `saleMonth`: 모든 expected `SettlementRow.saleMonth`에 반영할 판매월
- `files`: 일반 3개, app 3개 입력 파일 목록
- `expected`: 기대 `SettlementRow[]`, 기대 `ParseIssue[]`, 내부 계산 검증용 `SeriesCalculatedItem[]`

## 3. manifest 타입 초안

실제 타입 파일 생성은 하지 않는다. 아래는 fixture manifest 작성 기준을 고정하기 위한 초안이다.

```ts
type SeriesFixtureManifest = {
  fixtureId: string;
  description: string;
  batchId: string;
  company: "raon" | "sr";
  platform: "series";
  saleMonth: string;
  calcAuthority: "시리즈 계산방법.xlsx";
  files: SeriesFixtureFile[];
  expected: {
    settlementRows: string;
    parseIssues: string;
    calculatedItems?: string;
  };
};

type SeriesFixtureFile = {
  fileId: string;
  fileName: string;
  fileKind: "html_xls";
  slot: "general" | "app";
  expectedTableIndex: 1;
  excludesTotalRow: true;
};
```

`expectedTableIndex`는 zero-based 기준이다. 즉 `1`은 두 번째 HTML table을 의미한다.

## 4. general 3파일 / app 3파일 slot 규칙

시리즈 fixture group은 반드시 아래 slot 구성을 만족해야 한다.

- `slot = "general"` 파일 3개
- `slot = "app"` 파일 3개
- 총 파일 수 6개
- 모든 파일의 `fileKind = "html_xls"`

일반/app 구분 원칙:

- `slot`이 일반/app 구분의 유일한 기준이다.
- 파일명으로 일반/app을 추측하지 않는다.
- 파일 내부 컬럼으로 일반/app을 구분하지 않는다.
- 일반 3개 파일 결과는 같은 항목끼리 합산해 일반 결과 row를 만든다.
- app 3개 파일 결과는 같은 항목끼리 합산해 app 결과 row를 만든다.
- 일반 결과의 `mailerContentTitle`은 `작품명` 형식이다.
- app 결과의 `mailerContentTitle`은 `작품명(app)` 형식이다.
- `workTitle`에는 `(app)` suffix를 붙이지 않는다.

slot이 누락되거나 3개/3개 구성이 맞지 않으면 정상 계산을 진행하지 않고 `ParseIssue`로 표현한다.

## 5. HTML .xls adapter expected input

시리즈 원본 파일은 `.xls` 확장자지만 실제 Excel 바이너리가 아니라 HTML table 형식이다.

adapter 이후 group parser가 받는 입력은 HTML 문자열이 아니라 `TabularRow[]`여야 한다. 따라서 시리즈 group parser는 HTML 파싱을 직접 하지 않는다.

HTML `.xls` adapter 기대 동작:

- 각 파일에서 HTML table 2개를 확인한다.
- 실제 데이터는 두 번째 table만 사용한다.
- 첫 번째 데이터 table row를 header로 사용한다.
- 이후 row를 header 기반 `TabularRow`로 변환한다.
- 6개 파일 모두 동일한 71개 컬럼 구조를 기대한다.
- 마지막 `합계` row는 데이터 row에서 제외한다.
- 각 row에는 `sourceFileName`, `sourceRowIndex` 추적 정보가 유지되어야 한다.

adapter 단계에서 HTML 구조를 읽을 수 없거나 두 번째 table이 없으면 `parse_error`를 반환한다. 이 issue는 group parser 결과의 `ParseIssue[]`에 합쳐져야 한다.

## 6. 시리즈 계산방법.xlsx authority 기준

시리즈 계산 기준은 `시리즈 계산방법.xlsx`다.

계산 원칙:

- AutoSettlement가 임의 산식을 추가하지 않는다.
- AutoSettlement가 계산방법 파일과 다른 컬럼 추출 규칙을 추정하지 않는다.
- 유상 이용권 보정 포함 여부는 별도 추정하지 않고 `시리즈 계산방법.xlsx` 결과 기준으로 처리한다.
- 무상 금액의 `grossSales` 포함 여부는 별도 추정하지 않고 `시리즈 계산방법.xlsx` 결과 기준으로 처리한다.
- 마켓수수료(추정치)는 별도 재차감하지 않는다.
- 마켓수수료를 재차감하지 않는 이유는 요율에 이미 반영된 값으로 보이며, 재차감 시 이중 차감 위험이 있기 때문이다.

감사에서 확인한 시리즈 요율은 아래와 같다. 단, 구현과 fixture 기대값의 최종 authority는 항상 `시리즈 계산방법.xlsx`다.

| 카테고리 | 요율 |
| --- | ---: |
| i쿠키 | 0.49 |
| 쿠키+자동충전 | 0.679 |
| 구글 | 0.63 |
| 구글외부 | 0.637 |
| 원스토어 | 0.644 |
| 리딤 | 0.595 |
| 무상 | 0.7 |

## 7. expected SettlementRow 산출 방식

최종 기대값은 `SettlementRow[]`와 `ParseIssue[]`다.

정상 fixture의 expected `SettlementRow`는 아래 규칙을 따른다.

- `company`: manifest의 `company`
- `platform`: `series`
- `saleMonth`: manifest의 `saleMonth`
- `workTitle`: 원 작품명 또는 검수 기준 제목
- `mailerContentTitle`: 일반은 `작품명`, app은 `작품명(app)`
- `author`: 원본 또는 계산 기준에서 확정된 작가명
- `publisher`: 원본/계산 기준에 있으면 사용하고, 없으면 생략 가능
- `grossSales`: `시리즈 계산방법.xlsx` 기준 계산 결과
- `settlementAmount`: `시리즈 계산방법.xlsx` 기준 계산 결과
- `sourceFileName`: 대표 원본 파일명
- `sourceRowIndex`: 대표 원본 행 번호
- `issues`: row 단위 issue가 있으면 관련 `ParseIssue.issueId`

합산 규칙:

- 일반 3개 파일에서 계산된 값은 같은 항목끼리 합산해 일반 결과를 만든다.
- app 3개 파일에서 계산된 값은 같은 항목끼리 합산해 app 결과를 만든다.
- 일반 결과와 app 결과는 서로 다른 `SettlementRow`로 유지한다.
- 같은 항목 판정 key는 구현 전 별도 확정이 필요하지만, 최소한 `workTitle`, `author`, slot 구분을 포함해야 한다.

`calculatedItems.json`은 내부 계산 검증용 expected artifact다. 최종 output contract는 아니며, `sourceRefs`가 필요한 상세 합산 검증에만 사용한다.

## 8. expected ParseIssue 케이스

시리즈 fixture는 정상 케이스뿐 아니라 아래 오류 케이스를 분리해서 준비한다.

| 케이스 | 기대 issueType | 설명 |
| --- | --- | --- |
| 6개 중 일부 파일 누락 | `missing_file` | general/app slot별 필수 파일 수 부족 |
| general/app slot 누락 | `mapping_failed` | 일반/app 구분 기준이 없어 group 계산 불가 |
| general/app slot 개수 불일치 | `mapping_failed` | general 3개, app 3개 구성이 깨진 경우 |
| HTML table 파싱 실패 | `parse_error` | adapter가 두 번째 table 또는 header를 만들 수 없는 경우 |
| 필수 컬럼 누락 | `missing_column` | 계산방법 기준 필수 컬럼이 없는 경우 |
| 필수 row 값 누락 | `missing_field` | 작품명, 작가명 등 계산/출력 필수값 누락 |
| 금액 변환 실패 | `invalid_value` | 계산 대상 금액이 숫자로 해석되지 않는 경우 |
| 합산 key 중복/충돌 | `duplicate_row` | 동일 key 병합 과정에서 중복 또는 충돌이 확인된 경우 |

오류 fixture도 최종 expected는 `SettlementRow[] + ParseIssue[]`로 작성한다. 일부 파일만 실패하는 케이스에서는 성공 가능한 결과 row와 실패 issue가 함께 반환될 수 있는지를 별도 케이스로 검증한다.

## 9. source 추적 원칙

MVP의 `SettlementRow`에는 상세 `sourceRefs`를 추가하지 않는다.

source 추적 원칙:

- `SeriesCalculatedItem.sourceRefs`는 내부 계산 검증용으로만 사용한다.
- `sourceRefs`는 fixture의 `expected/calculatedItems.json`에서 검증할 수 있다.
- 최종 `SettlementRow`에는 대표 `sourceFileName`과 대표 `sourceRowIndex`만 유지한다.
- 대표 source는 fixture 파일 순서와 `sourceRowIndex`를 기준으로 가장 앞선 source를 선택한다.
- 대표 source 선택 규칙은 deterministic해야 한다.
- UI/export/emailer 계약에는 `sourceRefs`를 노출하지 않는다.

이 원칙은 합산 row가 여러 원본 파일과 여러 원본 row에서 만들어지더라도 MVP 출력 계약을 단순하게 유지하기 위한 것이다.

## 10. 구현 전 체크리스트

시리즈 파서 구현 전 아래 항목이 준비되어야 한다.

- manifest에 6개 파일이 명시되어 있다.
- general slot 3개, app slot 3개가 명시되어 있다.
- 모든 파일의 `fileKind`가 `html_xls`다.
- 일반/app 구분이 slot 기준으로만 작성되어 있다.
- fixture 파일명 추측 규칙이 없다.
- 파일 내부 컬럼으로 일반/app을 구분하는 규칙이 없다.
- HTML `.xls` adapter가 두 번째 table을 `TabularRow[]`로 변환하는 전제를 사용한다.
- 마지막 `합계` row는 expected row에 포함하지 않는다.
- `시리즈 계산방법.xlsx`가 fixture 기대값 산출 authority로 명시되어 있다.
- expected `SettlementRow[]`가 회사, 플랫폼, 판매월, source 추적 필드를 포함한다.
- expected `ParseIssue[]`가 missing file, missing column, invalid value 등 주요 실패 케이스를 포함한다.
- 내부 계산 검증이 필요한 경우 `calculatedItems.json`에 `sourceRefs`를 둔다.
- `SettlementRow`에는 `sourceRefs`를 추가하지 않는다.
- parser 구현 전 합산 key를 최종 확정한다.
- parser 구현 전 대표 source 선택 규칙을 테스트 expectation에 반영한다.

