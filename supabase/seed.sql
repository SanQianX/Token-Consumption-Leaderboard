-- ============================================
-- Sample data for development testing
-- ============================================
-- Note: This assumes profiles already exist via auth.users
-- In development, you can manually insert test profiles.

-- Insert a test profile (run this only in development, not in production)
-- The id must match an actual auth.users id, or you can bypass RLS in dev
insert into public.profiles (id, username, display_name, avatar_url, bio, github_id)
values
  ('00000000-0000-0000-0000-000000000001', 'alice', 'Alice Developer', 'https://github.com/alice.png', 'Full-stack developer & AI enthusiast', 100001),
  ('00000000-0000-0000-0000-000000000002', 'bob', 'Bob Coder', 'https://github.com/bob.png', 'Building with Claude every day', 100002),
  ('00000000-0000-0000-0000-000000000003', 'charlie', 'Charlie AI', 'https://github.com/charlie.png', 'Prompt engineering addict', 100003)
on conflict (username) do nothing;

-- Insert test summaries
insert into public.user_summaries (user_id, total_tokens_all, cost_all, total_tokens_30d, cost_30d, total_tokens_7d, cost_7d, total_tokens_1d, cost_1d, last_submitted_at)
values
  ('00000000-0000-0000-0000-000000000001', 50000000, 150.00, 25000000, 75.00, 8000000, 24.00, 1200000, 3.60, now()),
  ('00000000-0000-0000-0000-000000000002', 35000000, 105.00, 18000000, 54.00, 6000000, 18.00, 900000, 2.70, now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000000003', 20000000, 60.00, 10000000, 30.00, 3500000, 10.50, 500000, 1.50, now() - interval '2 hours')
on conflict (user_id) do nothing;
