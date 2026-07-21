# 안티그래비티 바이브 코딩 입문 (박규하 지음)
## 4일차

## day5. 내 서비스에 AI 비서 붙이기
- 나의 감정일기 (AI 감정 일기)
- AI API를 활용해서 내가 일기를 작성하면 실시간으로 AI가 내 감정을 설명해줌
- 브라우저의 로컬 스토리지에 내용을 저장해서. 새로고침해도 내용 유지

## day6. 서버리스로 한 단계 업그레이드
- 브라우저 저장이 아닌 서버저장, vercel 연결
- 나만의 API 파일을 만들어서 백엔드에서만 호출 (로컬 부팅시는 env파일 활용)
- vercel, Serverless Redis 데이터베이스 생성 및 연결
- 연결프로젝트: storage탭 > create > Redis Serverless 선택 
- 옵션: region(한국) > High Availability(none) > Plans(무료) > Create(Redis 데이터베이스이름)

## day7. 진짜 서비스의 시작: 사용자 인증
- Vercel 마켓플레이스에서 Supabase 연결
- 연결프로젝트: storage탭 > create > Supabase 선택
- 옵션: region(한국) > Plans(무료) > 접두어기본설정값사용 > 데이터베이스이름(책이랑동일하게)
- strong에서 연결(SUPABASE_SERVICE_ROLE_KEY: 서버에서 사용할 비밀키 / 다른키들은 공개해도 무방)
- vercel dev: Vercel에 설정된 환경변수가 자동으로 로컬에 적용
- 그래도 환경변수가 인식안된다면, vercel env pull (Vercel CLI를 통해, 환경변수를 .env.local파일로 가져옴)
- redis-cli -u redis://default:1gX04zT0Af7Y16VFmLiF7cn1hG5lgG81@twinkling-helpful-top-24270.db.redis.io:13365
- redis 설치: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/homebrew/
ㄴ 서버시작: redis-server $(brew --prefix)/etc/redis.conf
ㄴ 모듈로드확인: redis-cli MODULE LIST
ㄴ 레디스중지: redis-cli SHUTDOWN

- 소셜로그인 추가하기 (Google)
(1) vercel > 프로젝트 > Storage > Supabase > Open in Supabase 
(2) Supabase > 프로젝트 > Authentication(lnb) > Sign in / Providers > Google(활성화)
(3) Google > Enable Sign in with Google (활성)
ㄴ Client: 
ㄴ Client Secret (for OAuth):
ㄴ Callback URL: 복사
(4) Google Cloud Console (console.cloud.google.com) 접속
ㄴ 검색에 oauth > OAuth 동의화면 > (클라이언트)
ㄴ 브랜딩 (앱정보) 설정해야 클라이언트 설정 가능함
(5) 클라이언트 > 클라이언트 만들기
ㄴ 애플리케이션 유형: 웹 애플리케이션
ㄴ 승인된 JavaScript 원본: vercel 배포 URL, 로컬 URL(http://127.0.0.1:3000)
ㄴ 승인된 리디렉션 URL: 3번 Callback URL 복사한 값 넣기
ㄴ 만들기 후, 3번에 클라이언트 Id, 클라이언트 보안 비밀번호 복사 붙여넣기 > save
(6) OAuth 클라이언트 생성
클라이언트 ID: [GOOGLE_OAUTH_CLIENT_ID]
ㄴ Clint IDs
클라이언트 보안 비밀번호: [GOOGLE_OAUTH_CLIENT_SECRET]
ㄴ Client Secret (for OAuth)
(7) AI에게 Google 로그인 추가해달라하면됨
Google로 로그인 버튼에 기능을 추가해줘.
사용자가 이 버튼을 클릭하면, Supabase를 통해 Google 계정으로 로그인할 수 있게 해줘.
(supabase.auth.signinWithOAuth 함수를 사용하고, Provider는 google 로 설정하면 됨)

- 사용자별 데이터 분리하기
(1) 프론트엔드에 직접전송 (그냥 만들어 달라고 했더니)
Supabase에서 게정을 추가하면, 추가할때 ID를 생성해서, 해당 ID를 키값(+날짜시간)으로 새로운 ID 값을 생성해서
Redius 에 저장함
가져올때 Redius에 저장할때 사용한 id값을 확인해서 사용자를 구분함
(2) 토큰 기반 (표준(OAuth 2.0 / JWT) 보안 패턴)
Supabase에서 계정 생성할때 암호화 된 토큰을 발급 후, API가 호출될때마다 백엔드 가서 검증 함.
보안은 강해졌지만 복잡성 조금 증가와 백엔드로 갔다와야하므로 네트워크 비용이 조금 들긴 함
(3) 자세한 내용은 token.md 파일 참고 (자세히 기록하라고 함)

## 4일차 모두 정리하면
- 회원관리, 로그인 기능을 추가하고
- 구글 로그인 기능도 추가해보고
- AI API에 연결해서 실시간으로 AI가 답변해주는 앱을 만듬
- vercel은 서비스를 배포뿐만 아니라
- 서버리스 함수로 API를 처리하고
- Serverless Redis로 데이터를 저장하고, 
- DB같이 수정도 가능하고 데이터를 볼수도 뽑을수도 있음. 하지만 엄청 간단한 data 처리만 가능할듯
- Supabase는 사용자의 신원을 확인하고 관리

