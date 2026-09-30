import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('部署与并发保护', () => {
  it('导航请求采用网络优先且只清理本应用缓存', () => {
    const worker = readFileSync('public/sw.js', 'utf8')
    expect(worker).toContain("request.mode === 'navigate'")
    expect(worker).toContain("key.startsWith(CACHE_PREFIX)")
  })

  it('首次云端保存按用户加事务锁', () => {
    const schema = readFileSync('supabase/schema.sql', 'utf8')
    expect(schema).toContain('pg_advisory_xact_lock')
  })

  it('发布数据表到 Realtime 并监听首次写入与后续更新', () => {
    const schema = readFileSync('supabase/schema.sql', 'utf8')
    const repository = readFileSync('src/data/supabaseRepository.ts', 'utf8')
    expect(schema).toContain('alter publication supabase_realtime add table public.planner_profiles')
    expect(repository).toContain("event: '*'")
  })
})
