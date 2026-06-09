# AutoSettlement Parser Contract Test Plan

## 1. 목적

이 문서는 플랫폼 파서 구현 전에 입력 규칙과 출력 계약을 테스트 관점에서 고정하기 위한 계획서다.

목표는 파서 코드를 먼저 작성하지 않고, 복잡한 플랫폼별 예외를 `SettlementRow[]`와 `ParseIssue[]` 계약으로 어떻게 검증할지 정의하는 것이다.

기준 문서와 타입은 다음을 따른다.

- `docs/AUTOSETTLEMENT_DATA_MODEL.md`
- `docs/AUTOSETTLEMENT_SITE_DESIGN.md`
- `docs/MUNPIA_GROUP_PARSER_CONTRACT.md` (Munpia production group parser shape authority)
- `docs/MUNPIA_FIXTURE_PLAN.md` (Munpia fixture family and expected-result planning)
- `src/types/settlement.ts`

이 문서는 구현 문서가 아니다. fixture 파일, 테스트 코드, 파서 함수, 엑셀/HTML 읽기 로직, 실제 계산 로직은 작성하지 않는다.

## 2. 공통 파서 계약

모든 플랫폼 파서는 플랫폼별 원본 파일 구조를 직접 UI에 노출하지 않고, 아래 공통 계약만 반환해야 한다.

```text
입력:
- batchId
- company
- platform
- input fixture group

출력:
- SettlementRow[]
- ParseIssue[]
```

### 2.1 input fixture group

`input fixture group`은 하나의 플랫폼 파서 실행 단위를 표현한다.

테스트 계획에서 fixture group은 다음 정보를 가진 것으로 가정한다.

- `batchId`: 정산 작업 식별자
- `company`: `raon` 또는 `sr`
- `platform`: `series`, `ridibooks`, `munpia`, `misterblue` 등
- `settlementMonth`: `SettlementRow.saleMonth`에 반영될 판매월
- `files`: 플랫폼별 입력 파일 묶음
- `slot`: 파일 내부 컬럼으로 구분할 수 없는 입력을 구분하기 위한 업로드 슬롯 또는 파일 그룹

### 2.2 Platform Type

계약 테스트는 플랫폼을 `Simple Extract Platform`과 `Formula Platform`으로 구분해 검증한다.

#### Simple Extract Platform

원본에서 작품명, 작가명, 총매출, 정산금 등을 주로 추출하는 플랫폼이다.

테스트 초점:

- 원본 컬럼이 올바른 `SettlementRow` 필드로 매핑되는지 확인한다.
- 필수 컬럼 누락, 필수 값 누락, 숫자 변환 실패를 확인한다.
- 원본에 이미 존재하는 금액 컬럼을 임의 산식으로 재계산하지 않는지 확인한다.

#### Formula Platform

원본 금액 컬럼들을 카테고리로 분류하고, 카테고리별 합산과 요율/대체/분리 규칙을 적용해 `SettlementRow`를 직접 계산해 생성하는 플랫폼이다.

테스트 초점:

- 원본 금액 컬럼이 올바른 계산 카테고리로 분류되는지 확인한다.
- 카테고리별 합산이 정확한지 확인한다.
- 요율, 이벤트 대체, 웹/app 분리, 일반/app 분리 규칙이 적용되는지 확인한다.
- `SettlementRow.settlementAmount`가 단순 추출이 아니라 플랫폼 규칙에 따른 계산 결과인지 확인한다.

MVP 기준 Formula Platform:

- `series`
- `munpia`
- `misterblue`
- `ridibooks`

### 2.3 expected SettlementRow[]

각 계약 테스트는 파서 결과가 아래 필드를 채운 `SettlementRow[]`로 정규화되는지 확인해야 한다.

```ts
type SettlementRow = {
  rowId: string;
  company: Company;
  platform: Platform;
  saleMonth: string;
  workTitle: string;
  mailerContentTitle: string;
  author: string;
  publisher?: string;
  grossSales: number;
  settlementAmount: number;
  sourceFileName: string;
  sourceRowIndex: number;
  issues: string[];
};
```

검증 원칙:

- 모든 row는 입력 fixture group의 `company`, `platform`, `settlementMonth`를 정확히 반영한다.
- 플랫폼별 원본 컬럼명은 출력 계약에 남기지 않는다.
- `workTitle`은 원 작품명 또는 검수 기준 제목으로 유지한다.
- `mailerContentTitle`은 메일러 출력용 컨텐츠명으로, 일반/app/이벤트 구분을 반영한다.
- `publisher`는 원본에 없을 수 있으므로 optional이다.
- `sourceFileName`, `sourceRowIndex`는 원본 추적을 위해 반드시 채운다.
- row 단위 문제가 있으면 `issues`에 관련 `ParseIssue.issueId`를 연결한다.

### 2.4 expected ParseIssue[]

각 계약 테스트는 정상 row뿐 아니라 오류, 누락, 매칭 실패를 `ParseIssue[]`로 표현할 수 있어야 한다.

사용 가능한 `ParseIssueType`은 현재 타입 계약을 따른다.

```ts
type ParseIssueType =
  | "parse_error"
  | "missing_file"
  | "missing_column"
  | "missing_field"
  | "mapping_failed"
  | "company_split_failed"
  | "invalid_value"
  | "duplicate_row";
```

검증 원칙:

- 파일 누락은 `missing_file`로 표현한다.
- 필수 컬럼 누락은 `missing_column`으로 표현한다.
- 필수 필드 값 누락은 `missing_field`로 표현한다.
- 회사 분리 실패는 `company_split_failed`로 표현한다.
- 숫자 변환 실패, 음수/비정상 값 등은 `invalid_value`로 표현한다.
- 중복 row는 `duplicate_row`로 표현한다.
- 플랫폼별 원본 구조를 읽을 수 없는 경우는 `parse_error`로 표현한다.

### 2.5 forbidden behavior

모든 플랫폼 공통으로 아래 동작은 금지한다.

- 파서가 UI 전용 구조를 반환하지 않는다.
- 파서가 엑셀 출력 파일 구조를 직접 생성하지 않는다.
- 파서가 이메일 발송, 주소록 보정, 선인세 차감 병합 기능을 호출하지 않는다.
- 파서가 이메일 본문 렌더링, 메일러 표시 로직, 작가별 이메일 묶기, 차감 병합, 발송 처리를 구현하지 않는다.
- 파서가 임의 산식을 추가하거나 기준 문서와 다른 계산 방식을 적용하지 않는다.
- 파서가 플랫폼별 원본 컬럼 구조를 `SettlementRow` 외부로 누출하지 않는다.
- 파서가 일반/app/이벤트 구분을 파일명 추측만으로 확정하지 않는다. 단, 테스트 fixture의 slot 또는 명시적 파일 그룹 정보는 사용할 수 있다.

### 2.6 AutoSettlement와 기존 메일러의 역할 경계

파서 계약 테스트는 AutoSettlement와 기존 메일러의 책임을 분리한 상태에서 작성한다.

AutoSettlement의 책임:

- 플랫폼 원본 파일에서 필요한 값 추출/계산
- 공통 `SettlementRow` 생성
- 회사별 `정산_통합검수용.xlsx` 생성 대상 데이터 준비
- 회사별 `메일러_발송용.xlsx` 생성 대상 데이터 준비

기존 메일러의 책임:

- 이메일 표시 보정
- 작가별 묶기
- app 표시/문구 보정
- 차감 병합
- 실제 발송

`mailerContentTitle`은 메일러에 넘길 최소 컨텐츠명 전달값이다. 예시는 `작품명`, `작품명(app)`, `작품명(이벤트)`, `작품명(이벤트)(app)`이다. 단, 실제 이메일 표시 방식은 기존 메일러 책임이므로 파서 계약 테스트에서는 이메일 본문 표시 결과를 검증하지 않는다.

## 3. 네이버/시리즈 계약 테스트

### 3.1 input fixture group

네이버/시리즈는 `platform = "series"`로 테스트한다.

필수 fixture group:

- 일반 매출용 HTML `.xls` 파일 3개
- 앱 매출용 HTML `.xls` 파일 3개
- 총 6개 파일을 하나의 파서 실행 단위로 묶는다.
- 일반/app 구분은 파일 내부 컬럼이 아니라 업로드 슬롯 또는 파일 그룹 기준으로 제공한다.

확정된 입력 규칙:

- `.xls` 확장자지만 실제 Excel 바이너리가 아니라 HTML table 형식이다.
- 각 파일에는 HTML table이 2개 있다.
- 실제 정산 데이터는 두 번째 table을 사용한다.
- 샘플 기준 6개 파일은 동일한 71개 컬럼 구조를 가진다.
- 각 파일 마지막의 `합계` 행은 데이터 row에서 제외한다.
- 일반 매출용 3개와 앱 매출용 3개는 파일 내부 컬럼으로 구분되지 않는다.
- 계산 방식과 추출 컬럼은 `시리즈 계산방법.xlsx` 기준을 따른다.
- 시리즈는 Simple Extract Platform이 아니라 Formula Platform이다.
- 시리즈는 정산금 컬럼을 그대로 추출하는 플랫폼이 아니다.
- 시리즈 정산금은 카테고리별 금액 합계에 카테고리별 요율을 적용해 계산한다.

### 3.2 expected SettlementRow[]

정상 fixture에서 기대하는 결과:

- 시리즈 결과의 `settlementAmount`는 원본 정산금 컬럼 추출값이 아니라 산식 계산 결과다.
- 카테고리별 금액 합계는 해당 카테고리에 속한 원본 금액 컬럼을 합산해 만든다.
- 정산금은 `Σ(카테고리별 금액 합계 × 카테고리별 요율)`로 계산한다.
- 시리즈 파서는 `시리즈 계산방법.xlsx` 기준으로 필요한 결과값만 산출한다.
- AutoSettlement는 시리즈 결과를 `SettlementRow`와 `메일러_발송용.xlsx`에 필요한 값으로 채우며, 이메일에서 어떻게 보일지는 처리하지 않는다.
- 일반 매출용 3개 파일에서 계산된 값을 같은 항목끼리 합산해 일반 결과 row를 만든다.
- 앱 매출용 3개 파일에서 계산된 값을 같은 항목끼리 합산해 앱 결과 row를 만든다.
- 일반 결과의 `mailerContentTitle`은 `작품명` 형식이다.
- 앱 결과의 `mailerContentTitle`은 `작품명(app)` 형식이다.
- `workTitle`은 `(app)` suffix를 붙이지 않은 원 작품명 또는 검수 기준 제목으로 유지한다.
- 마지막 `합계` 행은 `SettlementRow`로 변환하지 않는다.
- `sourceFileName`, `sourceRowIndex`는 합산 결과의 추적이 가능하도록 기준 파일 또는 대표 원본을 남긴다.

확인된 시리즈 카테고리 요율:

| 카테고리 | 요율 |
| --- | ---: |
| i쿠키 | 0.49 |
| 쿠키+자동충전 | 0.679 |
| 구글 | 0.63 |
| 구글외부 | 0.637 |
| 원스토어 | 0.644 |
| 리딤 | 0.595 |
| 무상 | 0.7 |

계산 기준 확정:

- 시리즈 계산은 `시리즈 계산방법.xlsx`를 단일 기준으로 따른다.
- `유상 이용권 보정` 포함 여부, `무상` 금액의 `grossSales` 포함 여부, `마켓수수료(추정치)` 재차감 여부는 AutoSettlement가 별도 추정하지 않는다.
- 위 항목들은 `시리즈 계산방법.xlsx`에서 정의된 결과값 기준으로 처리한다.
- `마켓수수료(추정치)`는 AutoSettlement에서 임의로 별도 재차감하지 않는다.

대표 테스트 케이스:

- `series_valid_6_html_xls`: 일반 3개 + 앱 3개가 모두 있고 두 번째 table에서 데이터를 읽는 정상 케이스
- `series_general_sum`: 일반 3개 파일의 같은 항목 합산 결과가 `작품명`으로 생성되는 케이스
- `series_app_sum`: 앱 3개 파일의 같은 항목 합산 결과가 `작품명(app)`으로 생성되는 케이스
- `series_exclude_total_row`: 마지막 `합계` 행이 결과 row에 포함되지 않는 케이스
- `series_formula_platform_amount`: 카테고리별 금액 합계와 요율 적용으로 `settlementAmount`를 계산하는 케이스
- `series_calc_method_is_single_source`: `유상 이용권 보정`, `무상`, `마켓수수료(추정치)` 관련 처리가 `시리즈 계산방법.xlsx` 기준을 벗어나지 않는 케이스

### 3.3 expected ParseIssue[]

오류 fixture에서 기대하는 이슈:

- 6개 중 일부 파일이 없으면 `missing_file`
- 두 번째 table이 없으면 `parse_error`
- 71개 기준 컬럼과 다른 구조이면 `missing_column` 또는 `parse_error`
- 일반/app 슬롯 구분이 없으면 `mapping_failed`
- 필수 값이 비어 있으면 `missing_field`
- 금액 필드가 숫자로 해석되지 않으면 `invalid_value`

대표 테스트 케이스:

- `series_missing_app_file`: 앱 매출용 파일 1개 누락
- `series_missing_second_table`: HTML table이 1개뿐인 파일
- `series_unexpected_columns`: 기준 71개 컬럼과 다른 파일
- `series_missing_slot_group`: 일반/app 슬롯 정보 누락
- `series_invalid_amount`: 금액 컬럼에 숫자 변환 불가 값 포함

### 3.4 forbidden behavior

- `.xls` 확장자만 보고 Excel 바이너리 파서로 확정하지 않는다.
- 첫 번째 table을 정산 데이터로 사용하지 않는다.
- 파일 내부 컬럼으로 일반/app을 구분하려고 하지 않는다.
- 파일명 추측만으로 일반/app을 확정하지 않는다.
- 마지막 `합계` 행을 데이터 row로 포함하지 않는다.
- `시리즈 계산방법.xlsx`에 없는 임의 산식을 추가하지 않는다.
- 정산금 컬럼이 있다고 가정하고 단순 추출하지 않는다.
- `유상 이용권 보정`, `무상`, `마켓수수료(추정치)` 관련 처리를 AutoSettlement가 임의 추정하지 않는다.
- `마켓수수료(추정치)`를 `시리즈 계산방법.xlsx` 기준 없이 별도 재차감하지 않는다.

## 4. 리디북스 계약 테스트

### 4.1 input fixture group

리디북스는 `platform = "ridibooks"`로 테스트한다.

우선 고정할 fixture group:

- 기본 정산 파일 1개
- 이벤트 또는 대체 정산 파일 1개
- 총 2개 파일을 하나의 파서 실행 단위로 묶는다.

아직 세부 컬럼과 산식은 확정되지 않았으므로, fixture 준비 단계에서 실제 샘플을 기준으로 컬럼명, 대체 우선순위, 이벤트 표시 규칙을 확정해야 한다.

### 4.2 expected SettlementRow[]

정상 fixture에서 기대하는 결과:

- 일반 정산 결과는 `mailerContentTitle = 작품명` 형식으로 만든다.
- 이벤트 대체 규칙이 적용되는 row는 `mailerContentTitle = 작품명(이벤트)` 형식으로 만든다.
- app 구분이 함께 존재하는 경우에는 `작품명(app)` 또는 `작품명(이벤트)(app)` 형식을 사용할 수 있어야 한다.
- `workTitle`은 이벤트/app suffix를 붙이지 않은 검수 기준 제목으로 유지한다.
- 두 파일 간 같은 항목이 충돌하는 경우, 문서화된 이벤트 대체 규칙에 따라 하나의 결과로 정리한다.

대표 테스트 케이스:

- `ridibooks_valid_two_files`: 기본 파일과 이벤트 대체 파일이 모두 있는 정상 케이스
- `ridibooks_event_replaces_base`: 이벤트 대체 규칙이 일반 row를 대체하는 케이스
- `ridibooks_event_title_suffix`: 이벤트 row가 `작품명(이벤트)`로 생성되는 케이스
- `ridibooks_source_trace`: 대체 후에도 `sourceFileName`, `sourceRowIndex` 추적이 남는 케이스

### 4.3 expected ParseIssue[]

오류 fixture에서 기대하는 이슈:

- 필수 2파일 중 하나가 없으면 `missing_file`
- 대체 기준이 되는 작품/작가 매칭에 실패하면 `mapping_failed`
- 필수 컬럼이 없으면 `missing_column`
- 필수 값이 비어 있으면 `missing_field`
- 금액 필드가 숫자로 해석되지 않으면 `invalid_value`
- 대체 후 동일 key가 중복으로 남으면 `duplicate_row`

대표 테스트 케이스:

- `ridibooks_missing_event_file`: 이벤트 대체 파일 누락
- `ridibooks_missing_base_file`: 기본 정산 파일 누락
- `ridibooks_event_mapping_failed`: 이벤트 row가 기본 row와 매칭되지 않는 케이스
- `ridibooks_duplicate_after_replacement`: 대체 후 중복 row가 남는 케이스

### 4.4 forbidden behavior

- 이벤트 파일을 단순 추가 row로만 합산하지 않는다.
- 이벤트 대체 규칙이 확정되기 전 임의 우선순위를 적용하지 않는다.
- `mailerContentTitle`에 필요한 이벤트 suffix를 누락하지 않는다.
- 대체된 row의 원본 추적 정보를 버리지 않는다.

## 5. 문피아 계약 테스트

### 5.1 input fixture group

문피아는 `platform = "munpia"`로 테스트한다.

우선 고정할 fixture group:

- 웹 매출 파일 또는 웹 매출 슬롯
- app 매출 파일 또는 app 매출 슬롯
- 웹/app 구분은 파일 내부 컬럼, 파일 그룹, 업로드 슬롯 중 실제 샘플에서 확인된 기준으로 확정한다.

문피아 계산식은 거의 확정되었지만, 최종 입력 계약은 아직 미확정이다. 따라서 테스트 계획은 웹/app 분리 결과와 계약 경계를 먼저 고정한다.

현재 미확정 입력 계약:

- Munpia production parser를 single-file로 고정할지, optional correction input을 포함한 group parser로 볼지
- future multi-sheet workbook에서 explicit `sheetName` 입력을 어디서 받을지

현재 안전한 방향:

- author correction은 parser 내부 자동 추정이 아니라 `authorCorrection` 업로드 슬롯 기반 file input으로 와야 한다.
- correction slot은 adapter 이후 `TabularRow[]`로 group parser에 전달되어야 한다.
- correction slot의 최소 컬럼은 `작품코드`, `작품`, `작가명`이다.
- author correction이 개입되므로, production input contract는 single-file-only보다 group parser shape가 더 안전하다.
- Munpia group input slot의 최소 shape는 `settlement` required / `authorCorrection` optional 이다.
- 현재 MVP는 single-sheet settlement file만 허용한다.
- multi-sheet auto-pick은 금지한다.
- 다중 시트가 감지되고 explicit `sheetName`이 없으면 blocking issue와 함께 rows를 생성하지 않는다.
- explicit `sheetName`이 있는 미래 계약이 생기면 해당 시트만 사용한다.

### 5.2 expected SettlementRow[]

정상 fixture에서 기대하는 결과:

- 웹 매출 결과는 `mailerContentTitle = 작품명` 형식으로 만든다.
- app 매출 결과는 `mailerContentTitle = 작품명(app)` 형식으로 만든다.
- `workTitle`은 suffix 없는 검수 기준 제목으로 유지한다.
- 웹/app이 같은 작품에 대해 각각 존재하면 별도 `SettlementRow`로 분리한다.
- `company`는 입력 fixture group의 회사와 일치해야 한다.

대표 테스트 케이스:

- `munpia_valid_web_app_split`: 웹/app 입력이 각각 별도 row로 생성되는 케이스
- `munpia_web_only`: 웹 매출만 있는 작품은 `작품명`으로 생성되는 케이스
- `munpia_app_only`: app 매출만 있는 작품은 `작품명(app)`으로 생성되는 케이스
- `munpia_company_assignment`: 라온/에스알 입력 group에 따라 회사가 올바르게 지정되는 케이스

### 5.3 expected ParseIssue[]

오류 fixture에서 기대하는 이슈:

- 웹/app 구분 기준을 찾을 수 없으면 `mapping_failed`
- 회사 분리에 실패하면 `company_split_failed`
- 필수 컬럼이 없으면 `missing_column`
- 필수 값이 비어 있으면 `missing_field`
- 금액 필드가 숫자로 해석되지 않으면 `invalid_value`
- 동일 회사/플랫폼/작품/app 구분 기준에서 중복 row가 발생하면 `duplicate_row`
- author correction이 필요한 row에 correction이 없으면 해당 row만 `mapping_failed`로 skip하고, group 전체는 계속 처리한다.
- multi-sheet settlement workbook에 explicit `sheetName`이 없으면 `parse_error` 또는 `mapping_failed`로 group-level block을 표현하고 rows는 생성하지 않는다.
- group-level blocked 상태는 새 `blocked` issue type이 아니라 기존 `missing_file`, `missing_column`, `parse_error` 같은 issue와 downstream validator 판단으로 표현한다.
- correction row matching key 우선순위는 `작품코드` 후 `작품`이다.

대표 테스트 케이스:

- `munpia_missing_app_marker`: app 구분 기준 누락
- `munpia_company_split_failed`: 회사 구분 값이 라온/에스알 중 하나로 확정되지 않는 케이스
- `munpia_duplicate_web_row`: 웹 매출 row가 중복되는 케이스

### 5.4 forbidden behavior

- 웹/app 매출을 하나의 row로 무조건 합산하지 않는다.
- app 매출 결과에서 `(app)` suffix를 누락하지 않는다.
- 회사 구분이 불명확한 row를 임의 회사로 배정하지 않는다.
- 문피아 원본 컬럼 구조를 UI가 직접 알도록 만들지 않는다.
- author correction을 parser 내부에서 자동 추정하지 않는다.
- correction row를 explicit `authorCorrection` slot 없이 free-text 휴리스틱으로 만들지 않는다.
- direct in-memory correction table input을 MVP 계약으로 가정하지 않는다.
- 다중 시트 workbook에서 시트를 휴리스틱으로 자동 선택하지 않는다.
- explicit `sheetName` 없이 다중 시트 settlement workbook을 first sheet로 조용히 처리하지 않는다.
- missing author correction을 이유로 whole-group block을 강제하지 않는다.
- contract closure 전 batch/orchestrator wiring, UI 연결, 실사용 경로 연결을 진행하지 않는다.

## 6. 미스터블루 계약 테스트

### 6.1 input fixture group

미스터블루는 `platform = "misterblue"`로 테스트한다.

우선 고정할 fixture group:

- 일반 매출 또는 일반 정산금 기준 입력
- app 매출 또는 app 정산금 기준 입력
- 일반/app 정산금 구분은 실제 샘플에서 확인된 컬럼 또는 업로드 슬롯 기준으로 확정한다.

아직 미스터블루 샘플 구조와 정산금 산식은 확정되지 않았으므로, 테스트 계획은 일반/app 정산금이 각각 `SettlementRow`로 안전하게 분리되는지를 먼저 고정한다.

### 6.2 expected SettlementRow[]

정상 fixture에서 기대하는 결과:

- 일반 정산금 결과는 `mailerContentTitle = 작품명` 형식으로 만든다.
- app 정산금 결과는 `mailerContentTitle = 작품명(app)` 형식으로 만든다.
- `settlementAmount`는 미스터블루 기준 파일에서 지정한 정산금 값을 사용한다.
- `grossSales`는 기준 파일에서 추출 가능한 총매출 또는 매출 기준 값을 사용한다.
- 일반/app이 같은 작품에 대해 각각 존재하면 별도 `SettlementRow`로 분리한다.

대표 테스트 케이스:

- `misterblue_valid_normal_app_amounts`: 일반/app 정산금이 별도 row로 생성되는 케이스
- `misterblue_normal_only`: 일반 정산금만 있는 작품
- `misterblue_app_only`: app 정산금만 있는 작품
- `misterblue_amount_source`: 정산금 추출 컬럼이 올바르게 `settlementAmount`에 반영되는 케이스

### 6.3 expected ParseIssue[]

오류 fixture에서 기대하는 이슈:

- 일반/app 정산금 컬럼 또는 슬롯을 찾을 수 없으면 `missing_column` 또는 `mapping_failed`
- 필수 작품명/작가명 값이 없으면 `missing_field`
- 정산금이 숫자로 해석되지 않으면 `invalid_value`
- 동일 회사/플랫폼/작품/app 구분 기준에서 중복 row가 발생하면 `duplicate_row`

대표 테스트 케이스:

- `misterblue_missing_app_amount`: app 정산금 기준 누락
- `misterblue_missing_normal_amount`: 일반 정산금 기준 누락
- `misterblue_invalid_settlement_amount`: 정산금 숫자 변환 실패
- `misterblue_duplicate_amount_row`: 동일 기준 중복 row

### 6.4 forbidden behavior

- 일반 정산금과 app 정산금을 하나의 row로 무조건 합산하지 않는다.
- app 정산금 결과에서 `(app)` suffix를 누락하지 않는다.
- 기준 파일에 없는 임의 산식으로 `settlementAmount`를 재계산하지 않는다.
- 금액 오류를 0원으로 조용히 보정하지 않는다.

## 7. file adapter 계약 테스트 계획

file adapter는 원본 파일을 읽어 `TabularRow[]`로 변환하는 단계다. parser registry와 플랫폼 파서는 파일 확장자, 바이너리 형식, HTML table 구조, 인코딩 처리 방식을 직접 알지 않는다.

책임 분리:

```text
file adapter: 원본 파일 -> TabularRow[]
parser registry: platform -> parser 선택
platform parser: TabularRow[] -> SettlementRow[] + ParseIssue[]
```

따라서 parser registry는 실제 엑셀/CSV/HTML 파일을 읽지 않는다. 파일 형식별 읽기 책임은 파일 어댑터 단계에서만 다룬다.

### 7.1 공통 adapter 계약

입력:

- `FileAdapterContext`
- 원본 파일 핸들 또는 파일 바이트

출력:

- `rows: TabularRow[]`
- `issues: ParseIssue[]`

금지:

- adapter가 `SettlementRow`를 생성하지 않는다.
- adapter가 플랫폼별 정산금 산식을 계산하지 않는다.
- adapter가 parser registry의 플랫폼 선택 규칙을 복제하지 않는다.
- adapter가 엑셀 출력, 이메일러, UI 상태를 처리하지 않는다.

### 7.2 CSV adapter expected behavior

- 첫 row를 header로 해석해 각 데이터 row를 `TabularRow`로 변환한다.
- 빈 row는 adapter 단계에서 제외할 수 있다.
- 컬럼명 자체는 adapter가 플랫폼별 이름으로 바꾸지 않는다.
- 인코딩 감지 또는 선택은 adapter 책임이다.
- 필수 컬럼 존재 여부와 필수값 누락 여부는 플랫폼 parser 책임이다.

### 7.3 XLSX adapter expected behavior

- 지정된 sheet 또는 기본 첫 sheet를 `TabularRow[]`로 변환한다.
- 첫 유효 row를 header로 해석한다.
- 셀 값의 원시 의미를 보존하고, 금액 컬럼의 정산용 숫자 변환은 parser 책임으로 둔다.
- sheet 누락, header row 부재, 파일 형식 오류는 `ParseIssue`로 표현한다.

### 7.4 HTML .xls adapter expected behavior

- `.xls` 확장자라도 HTML table 형식이면 HTML `.xls` adapter가 처리한다.
- 네이버/시리즈 파일은 HTML table 2개 중 두 번째 table을 실제 데이터 table로 사용한다.
- table 개수가 부족하거나 두 번째 table이 비어 있으면 `ParseIssue`로 표현한다.
- HTML table의 header와 cell 값을 `TabularRow[]`로 변환한다.
- 마지막 `합계` 행 제외는 네이버/시리즈 HTML `.xls` adapter 책임으로 둔다. 이유는 `합계` 행은 데이터 table의 구조적 footer이며, parser가 정산 row로 오인하지 않도록 tabular 변환 단계에서 제거하는 편이 안전하기 때문이다.
- 일반/app 구분은 파일 내부 컬럼이 아니라 업로드 슬롯 또는 파일 그룹 기준이며, adapter context의 `slot` 또는 이후 parser input group에서 유지해야 한다.

### 7.5 adapter/parser/registry 연결 원칙

```text
adapter result rows
-> parsePlatformRows(platform, parserContext, rows)
-> SettlementRow[] + ParseIssue[]
```

adapter에서 발생한 `ParseIssue[]`와 parser에서 발생한 `ParseIssue[]`는 batch 처리 결과에서 함께 표시한다.

## 8. fixture 구성 원칙

fixture 파일은 실제 파서 구현 전에 별도로 준비한다. 이 문서에서는 fixture 파일을 생성하지 않는다.

권장 fixture 디렉터리 구조:

```text
fixtures/parser-contract/
├─ series/
├─ ridibooks/
├─ munpia/
└─ misterblue/
```

각 플랫폼 fixture group은 다음 파일을 함께 두는 것을 권장한다.

- 원본 샘플 파일 또는 최소 재현 샘플
- fixture group manifest
- expected `SettlementRow[]`
- expected `ParseIssue[]`
- 테스트 목적 설명

manifest 예시 필드:

```ts
type ParserFixtureManifest = {
  fixtureId: string;
  batchId: string;
  company: Company;
  platform: Platform;
  settlementMonth: string;
  files: Array<{
    fileName: string;
    slot?: string;
    description?: string;
  }>;
};
```

fixture 작성 원칙:

- 정상 케이스와 오류 케이스를 분리한다.
- 실제 운영 파일 전체가 아니라 최소 재현 가능한 샘플을 우선 만든다.
- 개인정보, 계약상 민감 정보, 실제 매출 민감 값은 익명화한다.
- 익명화하더라도 컬럼 구조, table 개수, row 위치, 합계 행 같은 파서 계약 요소는 유지한다.
- expected 결과는 `src/types/settlement.ts`의 타입 필드만 사용한다.
- 스냅샷식 전체 비교보다 핵심 필드 비교를 우선한다.

## 9. 구현 전 미확정 사항

파서 구현 전 추가 확인이 필요한 사항은 다음과 같다.

- 시리즈 합산 결과에서 `sourceFileName`, `sourceRowIndex`를 대표값으로 둘지, 별도 추적 구조가 필요한지
- 리디북스 2파일의 정확한 파일 역할과 이벤트 대체 우선순위
- 리디북스 이벤트/app 동시 발생 시 `mailerContentTitle` suffix 조합 우선순위
- 문피아 웹/app 구분이 파일 내부 컬럼 기준인지 업로드 슬롯 기준인지
- 문피아 회사 분리 기준이 원본 파일 안에 존재하는지, 업로드 영역 기준으로만 판단하는지
- 문피아 author correction 입력 위치/타입
- 문피아 production parser shape를 single-file로 고정할지, optional correction input을 포함한 group parser로 볼지
- 문피아 다중 시트 workbook에서 explicit `sheetName` 정책이 필요한지
- 미스터블루 일반/app 정산금 추출 컬럼명과 정산금 산식
- 미스터블루 `grossSales`에 어떤 원본 값을 매핑할지
- 모든 플랫폼에서 중복 row 판정 key를 무엇으로 둘지

위 항목은 타입 파일에 즉시 추가하지 않는다. MVP 파서 계약은 우선 `Company`, `Platform`, `SettlementRow`, `ParseIssue`의 기존 필드 안에서 표현 가능한지 검증한다.
