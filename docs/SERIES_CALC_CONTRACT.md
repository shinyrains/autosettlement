# Series Calc Contract

## 1. 목적

이 문서는 `series` 플랫폼 계산 로직을 구현하기 전에 계산 계약을 문서로 고정하기 위한 기준서다.

시리즈는 원본 정산금 컬럼을 그대로 추출하는 Simple Extract Platform이 아니라, 원본 71개 컬럼 중 필요한 금액 컬럼을 계산 카테고리로 분류하고 카테고리별 합산 및 요율 적용을 통해 `SettlementRow`를 만드는 Formula Platform이다.

이 문서는 코드 상수, 테스트, parser, orchestrator, UI, export, emailer 구현을 포함하지 않는다. 실제 구현 전 사람이 검토할 계산 기준을 잠그는 것이 목적이다.

## 2. authority: 시리즈 계산방법.xlsx 기준

시리즈 계산의 단일 authority는 `시리즈 계산방법.xlsx`다.

원칙:

- AutoSettlement는 임의 산식을 추가하지 않는다.
- AutoSettlement는 `시리즈 계산방법.xlsx`와 다른 컬럼 추출 규칙을 추정하지 않는다.
- 유상 이용권 보정 포함 여부는 AutoSettlement가 별도 판단하지 않는다.
- 무상 금액의 `grossSales` 포함 여부는 AutoSettlement가 별도 판단하지 않는다.
- 마켓수수료(추정치) 재차감 여부는 AutoSettlement가 별도 판단하지 않는다.
- 위 항목들은 모두 `시리즈 계산방법.xlsx`의 결과 기준을 따른다.
- 계산방법 파일과 샘플 원본이 충돌하면 구현을 진행하지 않고 문서/업무 기준을 먼저 갱신한다.

감사에서 확인한 요율은 참고값으로 문서화하되, 구현과 fixture expected value의 최종 기준은 항상 `시리즈 계산방법.xlsx`다.

## 3. 계산 카테고리 정의

시리즈 계산은 원본 금액 컬럼을 아래 카테고리로 분류한 뒤 카테고리별 합계를 만든다.

| 카테고리 | 확인된 요율 | 설명 |
| --- | ---: | --- |
| i쿠키 | 0.49 | i쿠키 계열 매출 카테고리 |
| 쿠키+자동충전 | 0.679 | 쿠키 및 자동충전 계열 매출 카테고리 |
| 구글 | 0.63 | 구글 결제 계열 매출 카테고리 |
| 구글외부 | 0.637 | 구글외부 결제 계열 매출 카테고리 |
| 원스토어 | 0.644 | 원스토어 결제 계열 매출 카테고리 |
| 리딤 | 0.595 | 리딤 계열 매출 카테고리 |
| 무상 | 0.7 | 무상 이용권 또는 무상성 금액 카테고리 |

카테고리명과 요율은 현재 감사 결과 기준이다. 실제 컬럼 매핑과 계산 대상 여부는 `시리즈 계산방법.xlsx`의 정의를 우선한다.

## 4. 원본 컬럼 그룹 정의

원본 시리즈 파일은 `.xls` 확장자를 사용하지만 실제 형식은 HTML table이다. HTML `.xls` adapter 이후 group parser는 71개 컬럼 구조의 `TabularRow[]`를 받는다고 본다.

원본 컬럼 그룹은 아래 방식으로 정의한다.

- 작품/작가 식별 컬럼 그룹
- i쿠키 금액 컬럼 그룹
- 쿠키+자동충전 금액 컬럼 그룹
- 구글 금액 컬럼 그룹
- 구글외부 금액 컬럼 그룹
- 원스토어 금액 컬럼 그룹
- 리딤 금액 컬럼 그룹
- 무상 금액 컬럼 그룹
- 계산에서 제외할 참조/합계/수수료성 컬럼 그룹

각 그룹에 어떤 원본 컬럼이 들어가는지는 `시리즈 계산방법.xlsx` 기준으로 fixture expected value 작성 시 명시한다.

금지:

- 컬럼명을 보고 임의로 카테고리를 추정하지 않는다.
- 파일 내부 컬럼으로 general/app을 구분하지 않는다.
- `마켓수수료(추정치)`를 별도 차감 컬럼으로 재해석하지 않는다.

## 5. general/app 산출물 분리 원칙

시리즈는 하나의 batch 안에서 총 6개 파일을 입력받는다.

- 일반 매출용 3개 파일
- app 매출용 3개 파일

일반/app 구분 원칙:

- upload slot 또는 fixture manifest의 `slot`만 일반/app 구분 기준으로 사용한다.
- 파일명 추측을 금지한다.
- 파일 내부 컬럼으로 general/app을 판단하지 않는다.
- 일반 3개 파일에서 계산된 같은 항목은 일반 결과로 합산한다.
- app 3개 파일에서 계산된 같은 항목은 app 결과로 합산한다.
- 일반 결과와 app 결과는 서로 다른 `SettlementRow`로 유지한다.
- 일반 결과의 `mailerContentTitle`은 `작품명`이다.
- app 결과의 `mailerContentTitle`은 `작품명(app)`이다.
- `workTitle`에는 `(app)` suffix를 붙이지 않는다.

## 6. grossSales 산출 원칙

`grossSales`는 `시리즈 계산방법.xlsx` 기준으로 산출된 총매출성 금액이다.

원칙:

- `grossSales`는 카테고리별 계산 대상 금액의 합산 결과를 기준으로 한다.
- 어떤 카테고리 금액을 `grossSales`에 포함할지는 `시리즈 계산방법.xlsx` 기준을 따른다.
- 무상 금액의 `grossSales` 포함 여부는 별도 추정하지 않는다.
- 취소/차감/보정성 값이 `grossSales`에 반영되는 방식은 `시리즈 계산방법.xlsx` 기준을 따른다.
- parser 구현 시에는 fixture expected value와 계산방법 파일의 결과가 일치해야 한다.

## 7. settlementAmount 산출 원칙

`settlementAmount`는 `시리즈 계산방법.xlsx` 기준으로 계산된 정산금이다.

기본 해석:

```text
카테고리별 금액 합계 = 해당 카테고리에 속한 원본 금액 컬럼 합산
카테고리별 정산금 = 카테고리별 금액 합계 × 카테고리별 요율
settlementAmount = 카테고리별 정산금 합계
```

이 기본 해석은 감사 결과를 설명하기 위한 문서 표현이다. 구현 시 최종 산식과 컬럼 선택은 반드시 `시리즈 계산방법.xlsx` authority를 따른다.

금지:

- 원본의 특정 정산금 컬럼을 그대로 `settlementAmount`로 추출한다고 가정하지 않는다.
- 요율 외 추가 수수료 차감을 임의로 넣지 않는다.
- 유상 이용권 보정 여부를 코드에서 추정하지 않는다.

## 8. 요율/수수료 적용 원칙

요율 적용은 `시리즈 계산방법.xlsx` 기준으로만 수행한다.

확인된 요율:

- i쿠키: `0.49`
- 쿠키+자동충전: `0.679`
- 구글: `0.63`
- 구글외부: `0.637`
- 원스토어: `0.644`
- 리딤: `0.595`
- 무상: `0.7`

수수료 원칙:

- `마켓수수료(추정치)`는 AutoSettlement가 별도 재차감하지 않는다.
- 재차감하지 않는 이유는 요율에 이미 반영된 값으로 보이며, 별도 차감 시 이중 차감 위험이 있기 때문이다.
- 단, 최종 구현 전 `시리즈 계산방법.xlsx`가 다른 결과를 명시하면 계산방법 파일을 우선한다.

## 9. rounding 처리 원칙

rounding은 구현 전에 fixture expected value와 함께 명확히 확인해야 한다.

기본 원칙:

- 소수점 처리 방식은 `시리즈 계산방법.xlsx` 결과를 따른다.
- 카테고리별 계산 단계에서 반올림/버림/올림을 하는지, 최종 합계에서만 처리하는지 임의로 정하지 않는다.
- Excel 표시값과 실제 셀 값이 다를 수 있으므로 expected value 작성 시 기준 값을 명시한다.
- parser 구현 전 rounding 정책을 fixture manifest 또는 calc expected 문서에 기록한다.

미확정 상태에서 구현하면 안 되는 항목:

- 카테고리별 중간값 rounding
- 최종 `settlementAmount` rounding
- 원 단위 이하 처리
- 음수 금액 rounding

## 10. 빈값/null/문자열 숫자 처리 원칙

시리즈 원본은 HTML table 기반이므로 숫자가 문자열로 들어올 수 있다.

처리 원칙:

- 숫자 문자열은 계산 전 숫자로 해석한다.
- 쉼표가 포함된 숫자 문자열은 계산 전 숫자로 해석한다.
- 공백 문자열은 빈값으로 본다.
- 계산 대상 금액 컬럼의 빈값을 0으로 볼지 오류로 볼지는 `시리즈 계산방법.xlsx` 기준과 fixture expected value에 따른다.
- 작품명, 작가명 등 식별 필수값이 비어 있으면 `missing_field` 대상이다.
- 숫자로 해석할 수 없는 계산 대상 값은 `invalid_value` 대상이다.

parser는 원본 컬럼 의미를 알고 계산하는 계층이므로, adapter가 숫자 변환을 대신하지 않는다.

## 11. 음수/취소/차감값 처리 원칙

음수, 취소, 차감값은 임의로 제거하거나 절대값으로 바꾸지 않는다.

원칙:

- 음수 금액은 원본 의미와 `시리즈 계산방법.xlsx` 기준에 따라 계산한다.
- 취소성 금액이 별도 컬럼 또는 음수값으로 제공되면 계산방법 파일의 반영 방식을 따른다.
- 차감값을 `grossSales`와 `settlementAmount` 중 어디에 반영할지는 계산방법 파일을 따른다.
- AutoSettlement는 이메일러의 차감 병합 기능을 재구현하지 않는다.
- 작가차감, 선인세 차감, 이메일 발송용 차감 병합은 기존 메일러 책임이다.

계산방법 파일로 의미를 확인할 수 없는 음수/취소/차감값은 `ParseIssue`로 남기고 구현을 보류한다.

## 12. 중간 결과 타입 초안

실제 타입 파일은 만들지 않는다. 아래는 구현 전 개념을 맞추기 위한 초안이다.

```ts
type SeriesCalcCategory =
  | "icookie"
  | "cookie_auto_charge"
  | "google"
  | "google_external"
  | "onestore"
  | "redeem"
  | "free";

type SeriesCalcGroup = "general" | "app";

type SeriesCategoryAmount = {
  category: SeriesCalcCategory;
  grossAmount: number;
  rate: number;
  settlementAmount: number;
  sourceRefs: SeriesSourceRef[];
};

type SeriesCalculatedItem = {
  group: SeriesCalcGroup;
  workTitle: string;
  author: string;
  publisher?: string;
  categoryAmounts: SeriesCategoryAmount[];
  grossSales: number;
  settlementAmount: number;
  sourceRefs: SeriesSourceRef[];
};

type SeriesSourceRef = {
  sourceFileName: string;
  sourceRowIndex: number;
};
```

`sourceRefs`는 내부 계산 검증용이다. 최종 `SettlementRow`에는 대표 `sourceFileName`과 대표 `sourceRowIndex`만 유지한다.

## 13. 최종 SettlementRow 변환 원칙

시리즈 최종 출력은 반드시 `SettlementRow[] + ParseIssue[]`다.

`SeriesCalculatedItem`에서 `SettlementRow`로 변환할 때의 원칙:

- `company`: parser group context의 회사
- `platform`: `series`
- `saleMonth`: parser group context의 판매월
- `workTitle`: 계산 항목의 원 작품명
- `mailerContentTitle`: general은 `workTitle`, app은 `workTitle + "(app)"`
- `author`: 계산 항목의 작가명
- `publisher`: 있으면 유지하고 없으면 생략
- `grossSales`: 계산된 총매출
- `settlementAmount`: 계산된 정산금
- `sourceFileName`: 대표 source file
- `sourceRowIndex`: 대표 source row
- `issues`: row 단위 issue가 있으면 issue id 연결

대표 source 선택 원칙:

- 내부 `sourceRefs` 중 fixture 파일 순서가 가장 빠른 항목을 우선한다.
- 같은 파일이면 `sourceRowIndex`가 가장 작은 항목을 우선한다.
- 선택 결과는 deterministic해야 한다.

## 14. ParseIssue 발생 케이스

시리즈 계산 계약에서 예상하는 주요 issue는 아래와 같다.

| 케이스 | issueType | 설명 |
| --- | --- | --- |
| 필수 파일 누락 | `missing_file` | general/app 3개씩 총 6개 구성이 불가능한 경우 |
| slot 누락 또는 불명확 | `mapping_failed` | 일반/app 구분 기준이 없는 경우 |
| 원본 HTML table 파싱 실패 | `parse_error` | adapter가 두 번째 table을 만들 수 없는 경우 |
| 계산 필수 컬럼 누락 | `missing_column` | 계산방법 파일 기준 필수 컬럼이 없는 경우 |
| 작품명/작가명 누락 | `missing_field` | 최종 row 식별 필수값이 없는 경우 |
| 금액 파싱 실패 | `invalid_value` | 계산 대상 금액을 숫자로 해석할 수 없는 경우 |
| 합산 key 충돌 | `duplicate_row` | 같은 항목 판정이 충돌하거나 중복 병합이 불명확한 경우 |
| 회사 분리 실패 | `company_split_failed` | context 또는 batch 입력에서 회사 구분이 깨진 경우 |

계산을 계속할 수 없는 issue가 있으면 해당 fixture는 `SettlementRow[]`를 비우거나 성공 가능한 일부 row만 반환하는 정책을 구현 전 fixture별로 명시해야 한다.

## 15. 구현 전 체크리스트

구현 전에 아래 항목을 확인한다.

- `시리즈 계산방법.xlsx`의 기준 sheet와 기준 버전을 확인했다.
- 계산 대상 원본 컬럼 그룹을 카테고리별로 정리했다.
- general/app 구분이 slot 기준으로만 정의되어 있다.
- 파일명 추측 규칙이 없다.
- 파일 내부 컬럼으로 general/app을 판단하지 않는다.
- `grossSales` 산출 기준이 expected value에 반영되어 있다.
- `settlementAmount` 산출 기준이 expected value에 반영되어 있다.
- 유상 이용권 보정, 무상, 마켓수수료 재차감 여부를 임의 판단하지 않는다.
- rounding 기준이 expected value 작성 기준에 명시되어 있다.
- 빈값을 0으로 볼지 issue로 볼지 fixture별로 명시되어 있다.
- 음수/취소/차감값 처리 기준이 계산방법 파일과 충돌하지 않는다.
- 내부 `sourceRefs` 검증 방식을 정했다.
- 최종 `SettlementRow`에는 대표 `sourceFileName/sourceRowIndex`만 유지한다.
- expected output은 `SettlementRow[] + ParseIssue[]`로 작성한다.
- emailer 표시 보정, 작가별 묶기, app 문구 보정, 차감 병합, 발송 처리는 구현 범위에서 제외한다.

