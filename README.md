# 출석체크 웹사이트

React + Supabase 기반 모바일 친화적 출석체크 시스템

## 기능

### 사용자
- QR 코드 스캔으로 간편한 출석 체크
- 이름만 입력하면 출석 완료

### 관리자
- 사용자 등록 및 관리
- 모임/이벤트 생성 및 QR 코드 생성
- 출석 기록 조회 (날짜별)
- 수동 출석 처리 (미출석자 일괄 처리)
- CSV 내보내기

## Supabase 설정

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 회원가입/로그인
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정
4. 리전 선택 (Seoul - Northeast Asia 권장)
5. "Create new project" 클릭

### 2. 데이터베이스 스키마 생성

Supabase 대시보드에서:
1. 왼쪽 메뉴에서 "SQL Editor" 클릭
2. "New query" 클릭
3. 아래 SQL 코드를 복사하여 붙여넣기
4. "Run" 클릭

```sql
-- users 테이블 생성
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_name ON users(name);

-- events 테이블 생성 (모임 정보)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  qr_code_data TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_qr_code ON events(qr_code_data);

-- attendances 테이블 생성 (출석 기록)
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attendances_event ON attendances(event_id);
CREATE INDEX idx_attendances_user ON attendances(user_id);
CREATE INDEX idx_attendances_checkin ON attendances(checked_in_at);

-- 같은 모임에 같은 날 중복 출석 방지
CREATE UNIQUE INDEX idx_attendance_daily ON attendances(
  event_id,
  user_id,
  DATE(checked_in_at)
);
```

### 3. Row Level Security (RLS) 설정

같은 SQL Editor에서 아래 코드 실행:

```sql
-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Public 읽기 권한 (사용자 조회용)
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Attendances are viewable by everyone"
  ON attendances FOR SELECT
  USING (true);

-- Public 삽입 권한 (출석 체크용)
CREATE POLICY "Anyone can insert attendances"
  ON attendances FOR INSERT
  WITH CHECK (true);

-- 관리자는 .env 파일의 service role key를 사용하여 모든 작업 가능
```

### 4. API 키 확인

1. Supabase 대시보드 왼쪽 메뉴에서 "Settings" > "API" 클릭
2. "Project URL" 복사
3. "Project API keys" 섹션에서 "anon public" 키 복사

### 5. 환경변수 설정

프로젝트 루트 디렉토리에 `.env` 파일 생성:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_PASSWORD=admin123
```

**중요**: `.env` 파일은 절대 Git에 커밋하지 마세요! (`.gitignore`에 이미 포함됨)

## 로컬 개발 실행

```bash
# 패키지 설치 (이미 완료됨)
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 가입/로그인
2. "New Project" 클릭
3. GitHub 저장소 연결
4. "Environment Variables" 섹션에서 환경변수 추가:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_PASSWORD`
5. "Deploy" 클릭

## 사용 방법

### 관리자 (처음 시작)

1. `/admin` 접속
2. 비밀번호 입력 (`.env`에 설정한 `VITE_ADMIN_PASSWORD`)
3. "사용자 관리" 탭에서 참여자 이름 등록
4. "이벤트 관리" 탭에서 모임 생성 (예: "알고리즘 스터디")
5. QR 코드 다운로드 또는 인쇄
6. QR 코드를 모임 장소에 부착

### 사용자 (출석 체크)

1. 모임 장소의 QR 코드 스캔
2. 자동으로 웹페이지 열림
3. 이름 입력
4. "출석하기" 버튼 클릭

### 관리자 (출석 관리)

- **출석 기록 조회**: 날짜별로 누가 출석했는지 확인
- **수동 출석 처리**: 미출석자 목록에서 체크박스 선택 후 일괄 출석 처리
- **CSV 내보내기**: 엑셀로 출석 기록 다운로드

## 라이선스

MIT
