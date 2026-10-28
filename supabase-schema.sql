-- ================================================
-- Supabase 数据库初始化脚本
-- 在 Supabase SQL Editor 中运行此脚本
-- ================================================

-- 1. 用户资料表（扩展 Supabase 自带的 auth.users）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 网站分类表
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 网站收藏表
CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  size TEXT DEFAULT 'normal', -- large / wide / tall / normal
  is_featured BOOLEAN DEFAULT FALSE,
  click_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 自动更新 profiles.updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON bookmarks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 新用户注册自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS 策略（行级安全）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- profiles: 所有人可读；用户只能改自己的「资料列」，不能改 is_admin
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

-- ⚠️ 安全红线：FOR UPDATE 必须同时给 USING 与 WITH CHECK。
-- 只写 USING 时新行不被校验，任何已登录用户都能把自己 profiles.is_admin 改成 true；
-- 而 /admin 守卫（src/middleware.ts）与下方 admin 写策略都只看 is_admin ⇒ 等于自我提权。
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 列级收口：客户端只允许改资料列；is_admin / id / created_at 只能由 service_role 或 SQL 手工设置。
-- 缺了这段，即使补上 WITH CHECK，用户仍可改 is_admin（WITH CHECK 只校验行归属，不限制列）。
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (username, full_name, avatar_url, bio, updated_at) ON public.profiles TO authenticated;

-- categories: 所有人可读
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- bookmarks: 所有人可读
CREATE POLICY "Bookmarks are viewable by everyone" ON bookmarks FOR SELECT USING (true);

-- 管理员才能写（is_admin 只能由 service_role 或 SQL 手工设置，客户端无权修改）
CREATE POLICY "Admins can insert categories" ON categories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete categories" ON categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can insert bookmarks" ON bookmarks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update bookmarks" ON bookmarks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete bookmarks" ON bookmarks FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ================================================
-- 7. 点击计数函数
-- 匿名访问者点击书签时通过 /api/bookmarks/[id]/click 调用此 RPC。
-- SECURITY DEFINER 使函数以所有者身份执行，绕过 RLS 对 bookmarks 的写入限制；
-- 固定 search_path 防止 SQL 注入。
-- ================================================
CREATE OR REPLACE FUNCTION public.increment_bookmark_click(bookmark_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.bookmarks
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE id = bookmark_id
  RETURNING click_count INTO new_count;
  RETURN new_count;
END;
$$;

-- 授权匿名与登录用户调用
GRANT EXECUTE ON FUNCTION public.increment_bookmark_click(INTEGER) TO anon, authenticated;

-- ================================================
-- 初始数据：分类
-- ================================================
INSERT INTO categories (name, slug, color, icon, sort_order) VALUES
  ('常用网站', 'common', '#3b82f6', '🌐', 1),
  ('前端开发', 'frontend', '#10b981', '💻', 2),
  ('工作项目', 'work', '#8b5cf6', '🧩', 3),
  ('AI工具箱', 'ai-tools', '#ec4899', '🤖', 4),
  ('科技资讯', 'tech-news', '#f59e0b', '📰', 5)
ON CONFLICT (slug) DO NOTHING;

-- ================================================
-- 8. 待办事项表
-- 逾期不落库：status 为 todo/doing 且 due_at < now() 时由前端动态算。
-- ================================================
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                                     -- 事件
  detail TEXT,                                             -- 做什么
  place TEXT,                                              -- 地点
  starts_at TIMESTAMPTZ NOT NULL,                          -- 时间
  due_at TIMESTAMPTZ,                                      -- 截止时间，逾期判定只看它
  all_day BOOLEAN NOT NULL DEFAULT FALSE,                  -- 只定哪天、没定几点
  duration_min INTEGER CHECK (duration_min IS NULL OR duration_min >= 0),
  expect TEXT,                                             -- 预期结果
  result TEXT,                                             -- 实际结果
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('met', 'partial', 'missed')),
  actual_min INTEGER CHECK (actual_min IS NULL OR actual_min >= 0),
  priority SMALLINT NOT NULL DEFAULT 1 CHECK (priority IN (0, 1, 2)),   -- 2 高 / 1 中 / 0 低
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done', 'dropped')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  remind_at TIMESTAMPTZ,                                   -- 本期只在页面上标红，不发推送
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT todos_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT todos_due_not_before_start CHECK (due_at IS NULL OR due_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS todos_user_starts_at_idx ON todos (user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS todos_user_status_idx ON todos (user_id, status);

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 每条策略都先 DROP 再建，保证整段脚本可以重复粘贴执行
DROP POLICY IF EXISTS "Users can view own todos" ON todos;
DROP POLICY IF EXISTS "Users can insert own todos" ON todos;
DROP POLICY IF EXISTS "Users can update own todos" ON todos;
DROP POLICY IF EXISTS "Users can delete own todos" ON todos;

CREATE POLICY "Users can view own todos" ON todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own todos" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON todos FOR DELETE USING (auth.uid() = user_id);
