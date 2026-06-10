# AutoSettlement Data Model Draft

## 1. 문서 목적

본 문서는 AutoSettlement MVP의 공통 데이터 모델 초안을 정의한다.

목적은 다음과 같다.

- 모든 플랫폼 파서가 동일한 결과 계약으로 데이터를 반환하도록 기준을 고정한다.
- UI가 플랫폼별 원본 파일 구조를 직접 알지 않도록 공통 데이터 경계를 만든다.
- 검수 화면과 출력 단계가 동일한 데이터 구조를 재사용하도록 한다.

이 문서는 구현 문서가 아니다. 실제 파서 로직, UI 컴포넌트, 엑셀 생성 코드는 포함하지 않는다.

## 2. 핵심 원칙

- 최상위 작업 단위는 `Batch` 1건이다.
- 하나의 `Batch` 안에서 `라온이앤엠`과 `에스알이앤엠` 자료를 함께 다룬다.
- 플랫폼별 원본 형식은 서로 달라도, 파서 결과는 반드시 같은 공통 계약으로 변환한다.
- UI는 플랫폼별 원본 구조를 직접 알지 않는다.
- 검수 화면은 `SettlementRow`와 `ParseIssue`만 본다.
- 출력기는 `SettlementRow`를 기준으로 회사별 2종 출력 파일을 만든다.
- AutoSettlement의 역할은 플랫폼 원본 파일에서 필요한 값을 추출/계산하고, 공통 `SettlementRow`를 생성한 뒤, 회사별 `정산_통합검수용.xlsx`와 `메일러_발송용.xlsx`를 만드는 데까지다.
- 기존 메일러의 역할인 이메일 표시 보정, 작가별 묶기, app 표시/문구 보정, 차감 병합, 실제 발송은 AutoSettlement 책임이 아니다.

요약:

```text
원본 파일별 구조 다양함
-> 플랫폼 파서가 공통 계약으로 변환
-> 검수 / 출력은 공통 모델만 사용
-> 이메일 표시/발송은 기존 메일러 책임
```

## 3. 파서 반환 계약

모든 플랫폼 파서는 아래 계약을 따라야 한다.

```text
입력:
- 플랫폼별 원본 파일 1개 이상

출력:
- SettlementRow[]
- ParseIssue[]
```

즉, 플랫폼별 파서는 최종적으로 아래 두 배열만 반환하는 것을 원칙으로 한다.

- 정상적으로 정규화된 정산 데이터: `SettlementRow[]`
- 파싱 중 발견된 오류, 누락, 매칭 실패, 경고: `ParseIssue[]`

이 계약은 이후 UI, 검수 테이블, 출력기까지 동일하게 이어진다.

### 3.1 Platform Type 구분

플랫폼 파서는 입력 파일의 성격에 따라 크게 두 가지 유형으로 구분한다.

#### Simple Extract Platform

원본에서 작품명, 작가명, 총매출, 정산금 등을 주로 추출하는 플랫폼이다.

특징:

- 플랫폼별 컬럼 매핑이 핵심이다.
- 원본 파일에 이미 정산 결과에 가까운 금액 컬럼이 존재한다.
- 파서는 원본 컬럼을 공통 `SettlementRow` 필드로 정규화하는 역할이 중심이다.

#### Formula Platform

원본 금액 컬럼들을 카테고리로 분류하고, 카테고리별 합산과 요율/대체/분리 규칙을 적용해 `SettlementRow`를 직접 계산해 생성하는 플랫폼이다.

특징:

- 원본 정산금 컬럼을 그대로 추출하는 방식이 아니다.
- 원본 금액 컬럼을 업무 기준 카테고리로 분류한다.
- 카테고리별 금액을 합산한다.
- 카테고리별 요율, 이벤트 대체, 웹/app 분리, 일반/app 분리 같은 플랫폼별 규칙을 적용한다.
- 계산 결과를 `SettlementRow.grossSales`, `SettlementRow.settlementAmount`, `SettlementRow.mailerContentTitle`에 반영한다.

MVP 기준 Formula Platform:

- `series`
- `munpia`
- `misterblue`
- `ridibooks`

이 구분은 타입 파일에 별도 타입을 즉시 추가한다는 의미가 아니다. 파서 설계와 계약 테스트에서 어떤 검증 기준을 적용할지 구분하기 위한 문서상 분류다.

### 3.2 시리즈 플랫폼 입력 계약

시리즈 플랫폼은 하나의 파서 실행 단위에서 총 6개 입력 파일을 받는다.

파일 구성:

- 일반 매출용 파일 3개
- 앱 매출용 파일 3개

파일 형식:

- 네이버/시리즈 입력 파일은 `.xls` 확장자를 사용하지만 실제 Excel 바이너리 형식이 아니라 HTML table 형식이다.
- 각 파일에는 HTML table이 2개 있으며, 실제 정산 데이터는 두 번째 table을 사용한다.
- 샘플 기준 6개 파일은 모두 동일한 71개 컬럼 구조를 가진다.
- 각 파일 마지막의 `합계` 행은 데이터 row에서 제외한다.
- 일반 매출용 3개와 앱 매출용 3개는 파일 내부 컬럼으로 구분되지 않는다.
- 일반/app 구분은 업로드 슬롯 또는 파일 그룹 기준으로 판단한다.

정규화 규칙:

- 시리즈는 Simple Extract Platform이 아니라 Formula Platform이다.
- 시리즈는 정산금 컬럼을 그대로 추출하는 플랫폼이 아니다.
- 시리즈 정산금은 카테고리별 금액 합계에 카테고리별 요율을 적용해 계산한다.
- 일반 매출용 3개 파일은 `시리즈 계산방법.xlsx`의 기존 계산 방식과 추출 컬럼을 따른다.
- 일반 매출용 3개 파일에서 계산된 값은 같은 항목끼리 합산해 일반 결과를 만든다.
- 일반 결과의 `mailerContentTitle`은 `작품명`을 사용하며 `(app)` suffix를 붙이지 않는다.
- 앱 매출용 3개 파일은 `시리즈 계산방법.xlsx`의 기존 계산 방식과 추출 컬럼을 따른다.
- 앱 매출용 3개 파일에서 계산된 값은 같은 항목끼리 합산해 앱 결과를 만든다.
- 앱 결과의 `mailerContentTitle`은 `작품명(app)` 형식으로 만든다.
- 임의 산식 추가 또는 기존 산식 변경은 금지한다.
- 계산 방식 자체는 이 문서에서 구현하거나 확정하지 않으며, `시리즈 계산방법.xlsx` 기준을 따른다는 원칙만 고정한다.

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

계산식 해석:

```text
카테고리별 금액 합계 = 해당 카테고리에 속한 원본 금액 컬럼 합산
정산금 = Σ(카테고리별 금액 합계 × 카테고리별 요율)
```

계산 기준 확정:

- 시리즈 계산은 `시리즈 계산방법.xlsx`를 단일 기준으로 따른다.
- `유상 이용권 보정` 포함 여부, `무상` 금액의 `grossSales` 포함 여부, `마켓수수료(추정치)` 재차감 여부는 AutoSettlement가 별도 추정하지 않는다.
- 위 항목들은 `시리즈 계산방법.xlsx`에서 정의된 결과값 기준으로 처리한다.
- `마켓수수료(추정치)`는 AutoSettlement에서 임의로 별도 재차감하지 않는다.

남은 구현 설계 사항:

- 시리즈 합산 결과에서 `sourceFileName`, `sourceRowIndex`를 대표값으로 둘지, 별도 원본 추적 구조를 둘지 결정해야 한다.

파서 계약 반영:

- 시리즈 파서는 6개 파일을 모두 같은 플랫폼 입력 묶음으로 해석한다.
- 시리즈 파서도 최종 결과는 반드시 `SettlementRow[]`와 `ParseIssue[]`만 반환한다.
- 일반 결과와 앱 결과는 모두 `SettlementRow`로 정규화한다.
- 일반/앱 구분은 업로드 슬롯 또는 파일 그룹, `mailerContentTitle`, 원본 추적 정보로 확인 가능해야 한다.
- 입력 파일 개수 부족, 일반/앱 파일 그룹 구분 실패, 두 번째 table 누락, 기준 파일과 다른 컬럼 구조는 `ParseIssue`로 표현한다.
- grouped browser mutation semantics for `seriesGeneral`/`seriesApp` follow `docs/AUTOSETTLEMENT_GROUPED_UPLOAD_MUTATION_CONTRACT.md`.
- Series grouped UI slot keys map to parser/orchestrator slots as `seriesGeneral -> general`, `seriesApp -> app`.

## 4. 공통 타입 정의

### 4.1 Company

정산 대상 회사를 구분하는 타입이다.

권장 값:

```ts
type Company = "raon" | "sr";
```

표시명 예시:

- `raon` -> `라온이앤엠`
- `sr` -> `에스알이앤엠`

원칙:

- 내부 값은 짧고 고정된 식별자를 사용한다.
- 화면 표시는 별도 레이블 매핑으로 처리한다.

### 4.2 Platform

정산 파일을 제공하는 플랫폼 식별 타입이다.

초기 MVP 대상 후보 예시:

```ts
type Platform =
  | "novelpia"
  | "mootoon"
  | "panmurim"
  | "epyrus"
  | "kyobo"
  | "yes24"
  | "aladin"
  | "guru_company"
  | "series"
  | "joara"
  | "bookcube"
  | "onestore"
  | "munpia"
  | "misterblue"
  | "ridibooks";
```

원칙:

- 플랫폼 값은 내부 식별자 기준으로 고정한다.
- 표시명과 브랜드 표기는 별도 매핑으로 분리한다.
- 추후 플랫폼 추가가 가능하도록 확장성을 남긴다.

### 4.3 Batch

정산 작업 1건을 표현하는 최상위 모델이다.

의미:

- 하나의 정산 기간 또는 작업 묶음
- 라온이앤엠/에스알이앤엠 업로드를 함께 포함
- 공통 검수와 회사별 출력을 묶는 기준 객체

초안 필드:

```ts
type Batch = {
  batchId: string;
  batchName: string;
  settlementMonth: string;
  status: "draft" | "uploaded" | "reviewing" | "ready_for_export" | "exported";
  uploads: BatchPlatformUpload[];
  createdAt: string;
  updatedAt: string;
};
```

필드 설명:

- `batchId`: 배치 고유 식별자
- `batchName`: 운영자가 구분할 수 있는 배치명
- `settlementMonth`: 판매월 또는 정산 기준 월
- `status`: 배치 전체 진행 상태
- `uploads`: 회사/플랫폼별 업로드 상태 목록
- `createdAt`, `updatedAt`: 관리용 시각 정보

현재 브라우저 runtime persistence 경계:

- 현재 브라우저 draft persistence authority는 `docs/AUTOSETTLEMENT_UPLOAD_PERSISTENCE_CONTRACT.md`를 따른다.
- 현재 single-file live browser upload mutation authority는 `docs/AUTOSETTLEMENT_UPLOAD_MUTATION_CONTRACT.md`를 따른다.
- 현재 live-wired single-file browser upload cards는 Misterblue / Panmurim / Bookcube / Yes24 / Kyobo / Mootoon XLSX, Epyrus / Aladin / Guru Company CSV, Novelpia HTML-XLS다.
- grouped/slot-based future mutation authority는 `docs/AUTOSETTLEMENT_GROUPED_UPLOAD_MUTATION_CONTRACT.md`를 따른다.
- mixed-company future mutation authority는 `docs/AUTOSETTLEMENT_MIXED_COMPANY_UPLOAD_MUTATION_CONTRACT.md`를 따른다.
- 현재 slice에서는 raw uploaded file bytes를 `Batch` 안에 저장하지 않는다.
- 현재 slice에서는 localStorage에 저장되는 것은 batch/upload/row/issue/selectedRow metadata snapshot뿐이다.

### 4.4 BatchPlatformUpload

하나의 batch 안에서 특정 회사 + 특정 플랫폼 업로드 상태를 표현하는 모델이다.

의미:

- 업로드 화면의 플랫폼 카드 단위
- 파서 처리 전후 상태 추적 단위
- 파일 단위 운영 정보 저장 위치

초안 필드:

```ts
type BatchPlatformUploadSlot = {
  slotId: string;
  slotKey: "settlement" | "authorCorrection" | "seriesGeneral" | "seriesApp";
  label: string;
  required: boolean;
  acceptedFileKinds: Array<"csv" | "xlsx" | "html_xls">;
  status: "empty" | "uploaded" | "parsed" | "warning" | "error";
  fileCount: number;
  sourceFileNames: string[];
  issueCount: number;
  lastUploadedAt?: string;
};

type BatchPlatformUpload = {
  uploadId: string;
  batchId: string;
  company: Company;
  platform: Platform;
  status: "empty" | "uploaded" | "parsed" | "warning" | "error";
  fileCount: number;
  sourceFileNames: string[];
  parsedRowCount: number;
  issueCount: number;
  lastUploadedAt?: string;
  slots?: BatchPlatformUploadSlot[];
};
```

필드 설명:

- `uploadId`: 업로드 단위 식별자
- `batchId`: 소속 batch 식별자
- `company`: 라온/에스알 구분
- `platform`: 플랫폼 구분
- `status`: 업로드 및 파싱 상태
- `fileCount`: 업로드된 파일 수
- `sourceFileNames`: 원본 파일명 목록
- `parsedRowCount`: 정규화된 결과 행 수
- `issueCount`: 발견된 이슈 수
- `lastUploadedAt`: 마지막 업로드 시각

현재 경계 메모:

- 이 aggregate 모델만으로는 단일 슬롯 플랫폼 상태 표현에는 충분하다.
- 하지만 문피아는 `settlement`(required)와 `authorCorrection`(optional) 슬롯 단위 상태가 필요하므로, 현재 `BatchPlatformUpload` 단독 모델만으로는 실 UI 연결에 충분하지 않다.
- 문피아 UI 연결은 slot-level child model 또는 동등한 authority-approved shape가 추가되기 전까지 `BatchPlatformUpload`만 믿고 진행하면 안 된다.
- Onestore처럼 one-workbook parse result가 여러 `company` slice(`sr` + `raon`)로 fan-out되는 mixed-company 카드도 현재 `BatchPlatformUpload.company` 단일값 모델만으로는 안전하게 표현되지 않는다.
- 따라서 Onestore browser live upload는 별도 mixed-company mutation authority 또는 동등한 authority-approved parent/child shape가 추가되기 전까지 `BatchPlatformUpload` 단독 모델로 연결하면 안 된다.

### 4.5 SettlementRow

모든 플랫폼 파서가 최종적으로 반환해야 하는 핵심 정산 행 모델이다.

이 타입이 가장 중요하다.

- 검수 테이블은 이 타입을 기준으로 표시된다.
- 출력 파일 생성도 이 타입을 기준으로 동작한다.
- 플랫폼별 원본 차이는 여기 오기 전에 모두 흡수되어야 한다.

최소 필드 초안:

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

필수 필드 설명:

- `rowId`: 검수/출력/추적용 고유 행 식별자
- `company`: 라온/에스알 구분
- `platform`: 정산 원본 플랫폼
- `saleMonth`: 판매월. `메일러_발송용.xlsx` 13열에 필요하므로 기본 필수 필드로 둔다.
- `workTitle`: 원 작품명 또는 검수 기준 제목
- `mailerContentTitle`: 메일러 출력용 컨텐츠명. `작품명`, `작품명(app)`, `작품명(이벤트)`, `작품명(이벤트)(app)`처럼 메일러 컨텐츠 컬럼에 들어갈 값을 표현한다.
- `author`: 작가명
- `publisher`: 출판사명. 일부 플랫폼에는 출판사 컬럼이 없으므로 optional로 둔다.
- `grossSales`: 총매출
- `settlementAmount`: 정산금
- `sourceFileName`: 원본 파일명
- `sourceRowIndex`: 원본 파일 내 행 번호 또는 인덱스
- `issues`: 해당 행에 연결된 이슈 코드 또는 식별자 목록

초기 확장 후보 필드:

```ts
type SettlementRowOptionalFields = {
  currency?: string;
  contractName?: string;
  externalWorkId?: string;
  externalAuthorId?: string;
  notes?: string;
};
```

확장 판단 기준:

- 해외 플랫폼 또는 통화 혼재 가능성이 있으면 `currency`를 초기에 두는 것이 안전하다.
- 계약 매칭이나 외부 식별자 연동이 중요하면 보조 ID 필드를 추가할 수 있다.

### 4.6 ParseIssue

파싱 중 발견된 문제를 공통 형식으로 표현하는 모델이다.

이 타입은 다음 용도로 사용된다.

- 처리 상태 페이지의 오류/누락/매칭 실패 목록
- 검수 화면의 이상 항목 강조
- 플랫폼별 업로드 카드의 경고/오류 건수 계산

초안 필드:

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

type ParseIssue = {
  issueId: string;
  batchId: string;
  company: Company;
  platform: Platform;
  severity: "info" | "warning" | "error";
  issueType: ParseIssueType;
  message: string;
  sourceFileName?: string;
  sourceRowIndex?: number;
  rowId?: string;
};
```

필드 설명:

- `issueId`: 이슈 식별자
- `batchId`: 소속 batch
- `company`: 관련 회사
- `platform`: 관련 플랫폼
- `severity`: 심각도
- `issueType`: 이슈 분류. 파일 누락, 컬럼 누락, 행 단위 누락, 매칭 실패, 회사 분리 실패 등을 구분한다.
- `message`: 운영자가 읽을 설명
- `sourceFileName`, `sourceRowIndex`: 원본 참조
- `rowId`: 특정 `SettlementRow`에 연결될 수 있는 참조 키

원칙:

- 검수 화면은 `ParseIssue`를 직접 표시하거나 `SettlementRow.issues`와 연결해 사용할 수 있다.
- 이슈 메시지는 사람이 읽을 수 있는 텍스트여야 한다.
- 심각도와 유형은 필터링 가능한 고정 값으로 관리한다.

### 4.7 ExportArtifact

회사가 최종적으로 다운로드할 출력 파일 1건을 표현하는 모델이다.

의미:

- 회사별 2종 출력
- batch 전체 4개 파일 관리

초안 필드:

```ts
type ExportArtifact = {
  artifactId: string;
  batchId: string;
  company: Company;
  artifactType: "review_excel" | "mailer_excel";
  fileName: string;
  status: "pending" | "ready" | "failed";
  rowCount: number;
  generatedAt?: string;
};
```

필드 설명:

- `artifactId`: 출력물 식별자
- `batchId`: 소속 batch
- `company`: 대상 회사
- `artifactType`: 통합검수용 / 메일러 발송용 구분
- `fileName`: 실제 생성 파일명
- `status`: 생성 상태
- `rowCount`: 포함 행 수
- `generatedAt`: 생성 완료 시각

예상 파일명:

```text
라온_정산_통합검수용.xlsx
라온_메일러_발송용.xlsx
에스알_정산_통합검수용.xlsx
에스알_메일러_발송용.xlsx
```

## 5. 타입 간 관계

관계 구조는 아래처럼 정리할 수 있다.

```text
Batch 1건
├─ BatchPlatformUpload 여러 건
├─ SettlementRow 여러 건
├─ ParseIssue 여러 건
└─ ExportArtifact 4건
```

핵심 연결 축:

- `Batch`는 전체 작업 묶음
- `BatchPlatformUpload`는 업로드 상태 추적
- `SettlementRow`는 검수와 출력의 기준 데이터
- `ParseIssue`는 오류와 예외 관리
- `ExportArtifact`는 최종 산출물 관리

## 6. 화면별 데이터 사용 경계

### 6.1 업로드 화면

주로 보는 모델:

- `Batch`
- `BatchPlatformUpload`
- `ParseIssue` 요약 수치

원칙:

- 업로드 화면은 원본 파일 컬럼 구조를 직접 다루지 않는다.
- 플랫폼 카드에는 업로드 상태, 파일 수, 오류 수 같은 운영 정보만 노출한다.

### 6.2 공통 검수 화면

주로 보는 모델:

- `SettlementRow`
- `ParseIssue`

원칙:

- 검수 화면은 플랫폼별 원본 포맷을 몰라도 동작해야 한다.
- 검수 테이블 컬럼은 `SettlementRow` 기반으로만 설계한다.

### 6.3 출력 단계

주로 보는 모델:

- `SettlementRow`
- `ExportArtifact`

원칙:

- 출력기는 `SettlementRow`만 기준으로 파일을 생성한다.
- 출력 단계는 플랫폼별 원본 파일 구조에 의존하지 않는다.

## 7. 경계 원칙

다음 원칙은 이후 구현 단계에서 반드시 유지해야 한다.

### 7.1 UI 먼저가 아니라 공통 계약 먼저

업로드 UI나 검수 테이블을 먼저 만들면 플랫폼별 예외를 UI가 떠안게 된다. 따라서 공통 데이터 계약을 먼저 잠그고, UI는 그 위에 올라가야 한다.

### 7.2 파일 어댑터와 파서 책임을 분리한다

파일 어댑터의 책임은 원본 파일을 읽어 `TabularRow[]`로 변환하는 데까지다. CSV, XLSX, HTML `.xls` 같은 실제 파일 형식 차이는 파일 어댑터 단계에서만 다룬다.

플랫폼 파서와 parser registry는 파일 형식을 직접 알지 않는다. registry는 `platform`과 `TabularRow[]`를 받아 해당 플랫폼 파서를 선택하고, 플랫폼 파서는 `TabularRow[]`를 `SettlementRow[]`와 `ParseIssue[]`로 정규화한다. 화면 상태나 출력 파일 포맷은 파서 책임이 아니다.

책임 흐름:

```text
file adapter: 원본 파일 -> TabularRow[]
parser registry: platform -> parser 선택
platform parser: TabularRow[] -> SettlementRow[] + ParseIssue[]
```

### 7.3 검수와 출력은 같은 행 모델을 사용한다

검수 화면과 출력기가 서로 다른 중간 구조를 쓰기 시작하면 유지보수 비용이 커진다. 둘 다 동일한 `SettlementRow`를 기준으로 삼아야 한다.

### 7.4 원본 추적 정보는 초기에 포함한다

정산 업무에서는 “이 값이 어디서 왔는가”를 나중에 반드시 확인하게 된다. 따라서 `sourceFileName`, `sourceRowIndex` 같은 원본 추적 필드는 초기 모델에 포함하는 것이 안전하다.

### 7.5 AutoSettlement와 기존 메일러의 역할 경계

AutoSettlement는 정산 자동화 프로그램이며, 이메일러 자체를 대체하지 않는다.

AutoSettlement의 책임:

- 플랫폼 원본 파일에서 필요한 값 추출/계산
- 공통 `SettlementRow` 생성
- 회사별 `정산_통합검수용.xlsx` 생성
- 회사별 `메일러_발송용.xlsx` 생성

기존 메일러의 책임:

- 이메일 표시 보정
- 작가별 묶기
- app 표시/문구 보정
- 차감 병합
- 실제 발송

AutoSettlement에서 하지 않는 것:

- 이메일 본문 렌더링
- 메일러 표시 로직 재구현
- 작가별 이메일 묶기
- 차감 병합
- 발송 처리
- 이메일러 수정

`mailerContentTitle`은 메일러에 넘길 최소 컨텐츠명 전달값이다. 예를 들어 `작품명`, `작품명(app)`, `작품명(이벤트)`, `작품명(이벤트)(app)` 같은 값을 담을 수 있지만, 실제 이메일에서 이 값이 어떻게 표시되고 보정되는지는 기존 메일러 책임이다.

시리즈도 같은 원칙을 따른다. 시리즈 파서는 `시리즈 계산방법.xlsx` 기준으로 필요한 결과값만 산출하고, AutoSettlement는 이 값을 `SettlementRow`와 `메일러_발송용.xlsx`에 채운다. 이메일에서 어떻게 보일지는 AutoSettlement가 처리하지 않는다.

## 8. 제외 범위

이 문서에서 다루지 않는 범위는 다음과 같다.

- 실제 TypeScript 구현
- 실제 파서 함수 시그니처 구현
- 실제 엑셀 컬럼 배치
- 실제 UI 상태 관리
- 기존 이메일러 연동
- 주소록 보정
- 선인세 차감 병합
- 이메일 본문 렌더링
- 메일러 표시 로직 재구현
- 작가별 이메일 묶기
- 발송 처리
- 이메일러 수정

## 9. 다음 단계 제안

이 문서 다음 단계는 아래 순서가 안전하다.

1. `AUTOSETTLEMENT_DATA_MODEL.md` 검토 및 필드 확정
2. 필요 시 `saleMonth`, `currency` 같은 초기 확장 필드 포함 여부 확정
3. 확정된 모델을 기준으로 `src/types/settlement.ts` 초안 작성
4. 그 다음에야 배치/업로드 UI와 플랫폼 파서 설계 진행

핵심 요약:

```text
UI 먼저 X
공통 계약 먼저 O
```
