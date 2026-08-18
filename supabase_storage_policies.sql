# Step 20: Supabase 스토리지 보안 정책 (Storage RLS Policies) SQL 스크립트

Supabase SQL Editor에서 실행할 수 있는 `avatars` 및 `chat-images` 버킷 RLS 보안 정책 SQL 문입니다.

```sql
-- =================================================================
-- 1. avatars 버킷 보안 정책 (Public 버킷)
-- =================================================================

-- 기존 정책 삭제 (이미 존재하는 경우 대비)
DROP POLICY IF EXISTS "Public Read Access for Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Insert Avatar Own Folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update Avatar Own Folder" ON storage.objects;

-- 1.1 [SELECT] 누구나 프로필 이미지를 조회(다운로드)할 수 있도록 허용
CREATE POLICY "Public Read Access for Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 1.2 [INSERT] 로그인한 사용자만 자신의 폴더(user_id)에 프로필 이미지 업로드 허용
CREATE POLICY "Authenticated Users Insert Avatar Own Folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 1.3 [UPDATE] 로그인한 사용자만 자신의 폴더(user_id) 내 프로필 이미지 수정 허용
CREATE POLICY "Authenticated Users Update Avatar Own Folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);


-- =================================================================
-- 2. chat-images 버킷 보안 정책
-- =================================================================

-- 기존 정책 삭제 (이미 존재하는 경우 대비)
DROP POLICY IF EXISTS "Public Read Access for Chat Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Insert Chat Images" ON storage.objects;

-- 2.1 [SELECT] 누구나 채팅 이미지를 조회(다운로드)할 수 있도록 허용
CREATE POLICY "Public Read Access for Chat Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- 2.2 [INSERT] 로그인한 사용자만 채팅 이미지 업로드 허용
CREATE POLICY "Authenticated Users Insert Chat Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images');
```
