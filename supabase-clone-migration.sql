-- ============================================================
-- SUPABASE CLONE MIGRATION SCRIPT
-- Project: Notes App (Aplikasi Catatan)
-- Generated: 2026-01-24
-- 
-- INSTRUKSI:
-- 1. Buat project Supabase baru
-- 2. Buka SQL Editor di Supabase Dashboard
-- 3. Paste SELURUH isi file ini
-- 4. Klik "Run" untuk eksekusi
-- 5. File storage harus di-upload ulang secara manual
-- ============================================================

BEGIN;

-- ============================================================
-- BAGIAN 1: EXTENSIONS
-- ============================================================
-- Supabase sudah menyertakan extension default, 
-- tapi kita pastikan yang dibutuhkan aktif

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- BAGIAN 2: DATABASE TABLES (SCHEMA)
-- Urutan: Parent tables dulu, lalu child tables
-- ============================================================

-- Table: profiles (parent)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

-- Table: notes (parent)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT notes_pkey PRIMARY KEY (id)
);

-- Table: note_photos (child of notes)
CREATE TABLE IF NOT EXISTS public.note_photos (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL,
    user_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT note_photos_pkey PRIMARY KEY (id),
    CONSTRAINT note_photos_note_id_fkey FOREIGN KEY (note_id) 
        REFERENCES public.notes(id) ON DELETE CASCADE
);

-- ============================================================
-- BAGIAN 3: INDEXES
-- ============================================================

-- Index untuk notes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON public.notes USING GIN(tags);

-- Index untuk note_photos
CREATE INDEX IF NOT EXISTS idx_note_photos_note_id ON public.note_photos(note_id);
CREATE INDEX IF NOT EXISTS idx_note_photos_user_id ON public.note_photos(user_id);

-- Index untuk profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- ============================================================
-- BAGIAN 4: FUNCTIONS
-- ============================================================

-- Function: Update updated_at column automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- BAGIAN 5: TRIGGERS
-- ============================================================

-- Trigger untuk notes
DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger untuk profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- BAGIAN 6: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS pada semua tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_photos ENABLE ROW LEVEL SECURITY;

-- ========== POLICIES: profiles ==========

-- Users can view own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- ========== POLICIES: notes ==========

-- Users can view own notes
CREATE POLICY "Users can view own notes"
ON public.notes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create own notes
CREATE POLICY "Users can create own notes"
ON public.notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own notes
CREATE POLICY "Users can update own notes"
ON public.notes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own notes
CREATE POLICY "Users can delete own notes"
ON public.notes
FOR DELETE
USING (auth.uid() = user_id);

-- ========== POLICIES: note_photos ==========

-- Users can view own note photos
CREATE POLICY "Users can view own note photos"
ON public.note_photos
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own note photos
CREATE POLICY "Users can insert own note photos"
ON public.note_photos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete own note photos
CREATE POLICY "Users can delete own note photos"
ON public.note_photos
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================
-- BAGIAN 7: STORAGE BUCKETS
-- ============================================================

-- Create storage bucket untuk note photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'note-photos',
    'note-photos',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BAGIAN 8: STORAGE POLICIES
-- ============================================================

-- Policy: Anyone can view note photos (public bucket)
CREATE POLICY "Anyone can view note photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'note-photos');

-- Policy: Authenticated users can upload to their folder
CREATE POLICY "Users can upload own note photos"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'note-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own photos
CREATE POLICY "Users can update own note photos"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'note-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete own note photos"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'note-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;

-- ============================================================
-- BAGIAN 9: DATA (INSERT STATEMENTS)
-- ============================================================
-- CATATAN PENTING:
-- Data di bawah ini berisi user_id yang terkait dengan auth.users
-- Anda perlu:
-- 1. Buat user baru di Supabase Auth dengan email yang sama
-- 2. Dapatkan user_id baru
-- 3. Ganti user_id di bawah dengan user_id baru
--
-- ATAU jika ingin data kosong, skip bagian ini.
-- ============================================================

-- ========== DATA: profiles ==========
-- User 1: alvinzcool6@gmail.com -> user_id: 38b2f804-e6d0-406e-aaae-e1244c1c0f99
-- User 2: hikenrogerku@gmail.com -> user_id: aa8b78ca-6586-4b2b-8f7a-ab2fb71248ca

/*
-- UNCOMMENT JIKA INGIN INSERT DATA PROFILES
-- Pastikan user sudah dibuat di Auth terlebih dahulu!

INSERT INTO public.profiles (id, user_id, email, full_name, avatar_url, created_at, updated_at)
VALUES
    (
        '094f86c1-4169-46a5-b44a-ae9fff5a7e48',
        '38b2f804-e6d0-406e-aaae-e1244c1c0f99', -- GANTI dengan user_id baru
        'alvinzcool6@gmail.com',
        NULL,
        NULL,
        '2026-01-24 06:57:02.133116+00',
        '2026-01-24 07:03:20.105556+00'
    ),
    (
        'fad4bc2e-62d3-442e-afcf-df50d3b54cd4',
        'aa8b78ca-6586-4b2b-8f7a-ab2fb71248ca', -- GANTI dengan user_id baru
        'hikenrogerku@gmail.com',
        NULL,
        NULL,
        '2026-01-24 06:59:33.833815+00',
        '2026-01-24 06:59:33.833815+00'
    )
ON CONFLICT (id) DO NOTHING;
*/

-- ========== DATA: notes ==========
/*
-- UNCOMMENT JIKA INGIN INSERT DATA NOTES
-- Pastikan profiles sudah di-insert dan user_id sesuai!

INSERT INTO public.notes (id, user_id, title, content, tags, created_at, updated_at)
VALUES
    (
        '7813d039-5778-4019-9348-8b86ac97d2d7',
        '38b2f804-e6d0-406e-aaae-e1244c1c0f99', -- GANTI dengan user_id baru
        'cara menggunkan seim',
        'Versi manusia normal:

Endpoint bikin event
WEF nyaring event penting
Collector nerima dan nyimpen
Forwarded Events jadi tempat kumpul
SIEM baca, korelasi, bikin alert
SOC analisa',
        ARRAY['seim'],
        '2026-01-24 06:57:59.434187+00',
        '2026-01-24 06:57:59.434187+00'
    ),
    (
        '18fabd4a-86f6-4c4f-90db-592a99446dcf',
        '38b2f804-e6d0-406e-aaae-e1244c1c0f99', -- GANTI dengan user_id baru
        'cara melakukan de coding',
        'sssss',
        ARRAY[]::text[],
        '2026-01-24 06:58:35.321771+00',
        '2026-01-24 06:58:35.321771+00'
    )
ON CONFLICT (id) DO NOTHING;
*/

-- ========== DATA: note_photos ==========
-- Tidak ada data foto saat ini

-- ============================================================
-- BAGIAN 10: VALIDASI
-- ============================================================
-- Jalankan query berikut untuk memastikan migrasi berhasil:

-- SELECT COUNT(*) FROM public.profiles;
-- SELECT COUNT(*) FROM public.notes;
-- SELECT COUNT(*) FROM public.note_photos;
-- SELECT * FROM storage.buckets WHERE id = 'note-photos';

-- ============================================================
-- CATATAN PENTING - STORAGE FILES
-- ============================================================
-- 
-- File fisik di storage TIDAK bisa dipindahkan via SQL.
-- Anda harus:
--
-- OPSI 1: Upload ulang manual
-- 1. Download semua file dari bucket lama
-- 2. Upload ke bucket baru dengan path yang sama
--
-- OPSI 2: Gunakan script sederhana
-- Buat script untuk download dari:
--   https://<OLD_PROJECT>.supabase.co/storage/v1/object/public/note-photos/...
-- Lalu upload ke:
--   https://<NEW_PROJECT>.supabase.co/storage/v1/object/public/note-photos/...
--
-- OPSI 3: Jika tidak ada file penting
-- Skip saja, user akan upload file baru
--
-- ============================================================

-- ============================================================
-- KONFIGURASI APLIKASI
-- ============================================================
--
-- Setelah migrasi selesai, update konfigurasi aplikasi:
--
-- 1. Ganti SUPABASE_URL dengan URL project baru
-- 2. Ganti SUPABASE_ANON_KEY dengan key project baru
-- 3. Test login dengan user yang sudah dibuat
--
-- File yang perlu diupdate:
-- - .env (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
-- - src/integrations/supabase/client.ts (jika hardcoded)
--
-- ============================================================

-- SELESAI! 🎉
