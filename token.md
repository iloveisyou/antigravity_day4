# 사용자 식별 방식 비교 및 토큰 기반 인증(JWT) 가이드 문서

본 문서는 **Supabase 회원 관리** 및 **Vercel Serverless Functions**, **Serverless Redis** 환경에서 사용자의 데이터를 안전하게 분리하고 보관하기 위해 적용된 인증 방식의 개념, 차이점 및 코드 비교 내역을 상세히 다룹니다.

---

## 1. 개요 및 개념 비교

### 1) 기존 방식 (프론트엔드 파라미터 직접 전송)
- **개념**: 브라우저(프론트엔드)에서 로그인 세션의 사용자 ID(UUID)를 획득한 후, API 호출 시 요청 본문(`body`) 또는 쿼리 파라미터(`query`)에 문자열 그대로 실어서 서버로 보내는 방식입니다.
- **특징**: 백엔드는 전달받은 ID 문자열이 진짜 본인의 것인지 확인하지 않고 그대로 신뢰하여 데이터를 저장하거나 조회합니다.

### 2) 새로운 방식 (토큰 기반 표준 OAuth 2.0 / JWT 인증)
- **개념**: 브라우저는 사용자 ID를 직접 전송하지 않고, 로그인 성공 시 Supabase로부터 부여받은 암호화 서명 증명서인 **액세스 토큰(JWT - Bearer Token)**을 HTTP 요청 헤더(`Authorization: Bearer <token>`)에 얹어 서버로 보냅니다.
- **특징**: 백엔드 서버리스 함수는 `supabase.auth.getUser(token)`를 통해 해당 토큰의 암호화 서명과 유효성을 검증(Verify)하고, 검증이 통과된 안전한 진짜 사용자 ID(`user.id`)를 백엔드 내부에서만 추출하여 Redis 키를 생성 및 검색합니다.

---

## 2. 장단점 비교 분석

| 구분 | 🔴 기존 방식 (ID 직접 전송) | 🟢 새로운 방식 (JWT 토큰 기반 인증) |
| :--- | :--- | :--- |
| **보안성** | ❌ **매우 취약** (F12 개발자 도구나 API 툴로 ID를 임의 조작하면 타인의 일기 열람/수정/삭제 가능) | ✅ **강력함** (토큰 서명이 위변조 불가능하므로 타인의 ID를 도용해도 백엔드 검증 시 차단됨) |
| **구현 난이도**| ✅ **단순함** (별도의 검증 라이브러리나 백엔드 로직 없이 문자열 전달만 수행) | ⚠️ **중간** (요청 헤더 처리 및 서버리스 함수 내 토큰 검증 로직 추가 필요) |
| **아키텍처** | 단순 스크립팅 방식 | 현업 웹/모바일 표준 보안 패턴 (OAuth 2.0 / JWT) |
| **네트워크/처리**| 추가 인증 통신 없음 | API 호출 시마다 서버에서 토큰 검증 수행 (`supabase.auth.getUser`) |

---

## 3. 소스코드 변경 내역 비교 (Diff)

### 1) `app.js` (프론트엔드 API 호출 지점)

```javascript
// 🔴 기존 방식
const session = (await window.supabaseClient.auth.getSession()).data.session;
const userId = session && session.user ? session.user.id : 'anonymous';

// POST /api/analyze (일기 분석 요청)
fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, userId }), // ❌ userId 직접 전송
});

// GET /api/history (히스토리 조회)
fetch(`/api/history?userId=${userId}`); // ❌ userId 쿼리스트링 전송
```

```javascript
// 🟢 새로 바뀐 방식
const session = (await window.supabaseClient.auth.getSession()).data.session;
const token = session ? session.access_token : null; // ⭕ 암호화된 액세스 토큰 획득

// POST /api/analyze (일기 분석 요청)
fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}) // ⭕ Bearer 토큰 헤더 전송
  },
  body: JSON.stringify({ text }), // ⭕ body에서 userId 제거
});

// GET /api/history (히스토리 조회)
fetch('/api/history', {
  headers: {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}) // ⭕ Bearer 토큰 헤더 전송
  }
});
```

---

### 2) `api/analyze.js` (일기 분석 및 저장 서버리스 함수)

```javascript
// 🔴 기존 방식
export default async function handler(req, res) {
  const { text, userId } = req.body; // ❌ 프론트엔드가 보낸 userId를 그대로 신뢰

  const cleanUserId = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
  const redisKey = `aiary-${cleanUserId}-${yyyy}${mm}${dd}${hh}${min}${ss}`;
}
```

```javascript
// 🟢 새로 바뀐 방식
import { supabase } from './_lib/supabase.js'; // ⭕ 백엔드 Supabase 클라이언트 모듈

export default async function handler(req, res) {
  // 1. HTTP 헤더에서 Authorization (Bearer Token) 추출 및 누락 시 401 반환
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];

  // 2. Supabase 서버에 토큰 검증 의뢰 및 검증된 진짜 user.id 추출
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  const userId = user.id; // ⭕ 검증 완료된 진짜 사용자 ID

  const cleanUserId = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
  const redisKey = `user:${cleanUserId}:diary-${yyyy}${mm}${dd}${hh}${min}${ss}`; // ⭕ 새 규격 레디스 키
}
```

---

### 3) `api/history.js` (히스토리 목록 조회 서버리스 함수)

```javascript
// 🔴 기존 방식
export default async function handler(req, res) {
  const { userId } = req.query; // ❌ 쿼리 스트링의 userId를 그대로 신뢰
  const cleanUserId = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');

  const keys = await redisClient.keys(`aiary-${cleanUserId}-*`);
}
```

```javascript
// 🟢 새로 바뀐 방식
import { supabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  // 1. HTTP 헤더 토큰 검증
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  const userId = user.id; // ⭕ 검증 완료된 진짜 사용자 ID

  const cleanUserId = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '');
  const keys = await redisClient.keys(`user:${cleanUserId}:diary-*`); // ⭕ 해당 사용자의 격리 키만 검색
}
```

---

## 4. 결론 및 요약

- **기존 방식**: 구현이 단순하나, **사용자 ID를 위변조하여 타인의 일기를 열람하거나 훼손할 수 있는 치명적인 보안 허점**이 존재함.
- **토큰 기반 방식**: API 호출마다 암호화된 토큰을 백엔드에서 통제 검증하므로 **위변조를 원천 차단하고 철저한 사용자별 데이터 격리**를 제공함.
