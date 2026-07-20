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



