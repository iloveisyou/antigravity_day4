# 안티그래비티 바이브 코딩 입문 (박규하 지음)
## 4일차

## day5. 내 서비스에 AI 비서 붙이기
- 나의 감정일기 (AI 감정 일기)
- AI API를 활용해서 내가 일기를 작성하면 실시간으로 AI가 내 감정을 설명해줌
- 브라우저의 로컬 스토리지에 내용을 저장해서. 새로고침해도 내용 유지

## day6. 서버리스로 한 단계 업그레이드 (vercel, Serverless Redis)
- 브라우저 저장이 아닌 서버저장, vercel 연결
- 나만의 API 파일을 만들어서 백엔드에서만 호출 (로컬 부팅시는 env파일 활용)
- vercel, Serverless Redis 데이터베이스 생성 및 연결
- 연결프로젝트: storage탭 > create > Redis Serverless 선택 
- 옵션: region(한국) > High Availability(none) > Plans(무료) > Create(Redis 데이터베이스이름)

## day7. 진짜 서비스의 시작: 사용자 인증 (vercel, Supabase)
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

## day8. 실시간 데이터 연동하기 (서버로 업그레이드, vercel, Supabase)
- Serverless Redis 는 키-값 형태로 데이터를 빠르게 저장하고 꺼내오는데 탁월함. 일기같은 단순구조
- 채팅(누가/언제/어떤방/무슨말했는지)구조를 체계적으로 관리하고, 새로운 메시지 추가될때 실시간으로 알림
- 이런채팅구조에 탁월한 복잡한 관계형 데이터 실시간 기능의 Supabase의 데이터베이스, PostgersSQL 제격
- 또한 데이터베이스의 보안기능, 로우레벨보안(Row Level Security, RLS)규칙 = 로그인한사용자만 글쓰기
- 데이터 한한줄에 대한 접근 권한을 정교하게 제어 기술
- Supabase는 로그인과 같은 견고만 문도 만들어주고
- Supabase는 실시간 데이터베이스(Realtime Database) = 새로고침 없이 다름사람화면에 나타나는 기능

- 메세지 담을 테이블 만들기
(1) Supabase 대시보드 > Table Editor > Create a table(New Table)
(2) 테이블 이름(Name): messages, Enable Row Level Security(RLS): 체크
(3) 테이블 열(Columns) 추가
    ㄴ id: (기본) int8 / NULL
    ㄴ created_at: (기본) text / now()
    ㄴ content: (메시지를 담을그릇) text / NULL
    ㄴ userid: (누가 썻는지) uuid / auth.uid() -> 메시지를 작성한 사용자의 고유 ID 자동기록
    ㄴ user_email: (보낸사람의이메일) text / NULL
    ㄴ save
- 데이터 접근 규칙, RLS 정책 설정하기
(1) Supabase > Table Editor > messages 테이블화면 > Add RLS policy(Row Level Security 정책추가) 버튼 클릭
(2) Create a new Row Level Security policy 양식 작성
    ㄴ Policy name(정책이름): Allow logged-in users to view messages (알아듣기 쉬운 이름으로)
    ㄴ Policy Command(정책 명령어): SELECT
    ㄴ USE OPTIONS ABOVE TO EDIT 에디터 가장 아래에 auth.uid() IS NOT NULL 추가 (로그인하여 사용자 ID가 존재하는 사람만 허용하라는 설정)
    ㄴ Save policy
(3) 메시지 작성(INSERT) 정책 만들기
    ㄴ 로그인한 사용자가 자기 자신의 ㅑㅇ로만 새로운 메시지를 작성할 수 있도록, 허용하는 정책 추가
    ㄴ 이는 다른 사람인척 메시지를 쓰는 것을 방지하는 중요한 규칙
    ㄴ 다시 Table Editor > messages 테이블화면 > Add RLS policy(Row Level Security 정책추가) 버튼 클릭
    ㄴ Policy name(정책이름): Allow individual users to insert their own messages
    ㄴ Policy Command(정책 명령어): INSERT
    ㄴ USE OPTIONS ABOVE TO EDIT 에디터 가장 아래에 auth.uid() = user_id 추가 (글을 쓰려는 사람의 ID(auth.uid())와 데이터에 기록될 user_id가 반드시 같을때만 가능하도록 설정) 
    ㄴ Save policy
(4) messages 테이블은 오직 로그인한 사용자만이 메시지를 보고 쓸수 있으며, 절대로 다른 사람을 사칭할 수 없도록 규칙을 정했음   
(5) 채팅화면읆 만들고 messages완 연결하고 추가로 실시간 기능을 사용해야함(messages>Enable realtime)
(6) 그리고 실시간으로 메시지를 받아오는 기능을 추가로 소스에서 구현해야 함
(연결된 supabase의 messages 테이블의 모든 INSERT 이벤트를 구독)

## 4일차 모두 정리하면
- 회원관리, 로그인 기능을 추가하고
- 구글 로그인 기능도 추가해보고
- AI API에 연결해서 실시간으로 AI가 답변해주는 앱을 만듬
- vercel은 서비스를 배포뿐만 아니라
- 서버리스 함수로 API를 처리하고
- Serverless Redis로 데이터를 저장하고, 
- DB같이 수정도 가능하고 데이터를 볼수도 뽑을수도 있음. 하지만 엄청 간단한 data 처리만 가능할듯
- Supabase는 사용자의 신원을 확인하고 관리
- Supabase DataBase 는 SQL로 관리함 (수정, 삭제, 추가 다가능, 테이블 구조도 변경가능, RLS 기능으로 보안도 설정가능)
- 사용한 사이트: github, vercel, supabse, google Cloud (Console)
