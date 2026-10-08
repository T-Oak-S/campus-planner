# 校园时序

一个为大学第一学期设计的中文个人时间管理网页，把按教学周变化的课程、个人安排和待办任务放在一起。

发布地址：<https://t-oak-s.github.io/campus-planner/>

## 已实现的功能

- 今日页：当前教学周、当日课程与活动、临近任务、空闲时段。
- 日历页：第 1–18 教学周周视图、月视图、补课与停课处理。
- 个人安排：单次或每周重复，支持仅修改／取消某一次。
- 任务：截止时间、优先级、完成状态和关联课程。
- 冲突检查：已预置第 1—13 节作息，课程与个人安排共同参与判断。
- 提醒：导出包含课程、活动和未完成任务的 `.ics` 日历文件，默认提前 15 分钟提醒。
- 数据：本机模式开箱即用；配置 Supabase 后可用 GitHub 登录并跨设备同步。
- 安装：支持添加到手机主屏幕，访问过的页面和资源可离线打开。

## 课表和校历约定

- 第 1 教学周从 2026 年 9 月 21 日开始，假期不改变周次编号。
- 9 月 20 日补 10 月 6 日星期二的课；10 月 10 日补 10 月 7 日星期三的课。
- 中秋、国庆、校运会和 2027 年 1 月 11–24 日复习考试期停止课程，不删除个人安排。
- “概论”的教室在原课表截图中不够清晰，目前标为“九五楼-101（截图待核对）”，可在日历中调整某次课程。
- 已根据学校作息预置第 1—13 节时间；今日时间线和日历会同时显示实际时间与节次，设置中仍可修改。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

测试与生产构建：

```bash
npm test
npm run typecheck
npm run build
```

未配置环境变量时，应用自动使用浏览器本机存储。此模式不需要账户，也不会把数据发送到服务器。

## 配置 Supabase 同步

1. 新建一个 Supabase 项目，在 SQL Editor 中完整执行 [`supabase/schema.sql`](supabase/schema.sql)。脚本会创建数据表、每用户行级安全策略和带版本检查的保存函数。
2. 在 GitHub 创建 OAuth App：
   - Homepage URL：`https://t-oak-s.github.io/campus-planner/`
   - Authorization callback URL：Supabase 控制台 GitHub Provider 页面显示的回调地址，格式为 `https://<project-ref>.supabase.co/auth/v1/callback`
3. 在 Supabase 的 Authentication → Providers → GitHub 填入 OAuth Client ID 和 Client Secret。
4. 在 Authentication → URL Configuration 中把 `https://t-oak-s.github.io/campus-planner/` 加入 Redirect URLs。
5. 在 GitHub 仓库 Settings → Secrets and variables → Actions → Variables 新建：
   - `VITE_SUPABASE_URL`：Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`：Supabase public anon key

`anon` key是浏览器端公开密钥；数据安全由登录会话和 SQL 中的行级安全策略保证。不要把 `service_role` key 或 GitHub OAuth Client Secret 放入仓库变量、源代码或 `.env`。

本地调试云同步时，复制 `.env.example` 为 `.env.local` 并填入两个公开值。`.env.local` 已被 Git 忽略。

## 发布到 GitHub Pages

仓库的 `main` 分支每次更新都会执行 `.github/workflows/deploy.yml`：安装依赖、运行全部测试、构建，然后发布 `dist/`。

首次发布时，在仓库 Settings → Pages → Build and deployment 中选择 **GitHub Actions**。工作流完成后即可访问 `https://t-oak-s.github.io/campus-planner/`。

## 日历与备份

- 日历文件是导出当时的快照。建议在手机日历中新建“校园时序”专用日历；重新导出时先清空或替换旧日历，避免重复事件。
- 设置页的“导出备份”会保存课程单次调整、活动、任务和作息设置。恢复前会检查文件版本和记录结构，错误文件不会覆盖现有数据。
- Supabase 免费项目可能因长期不活跃而暂停，建议定期保留 JSON 备份。

## 项目结构

- `src/domain/`：教学周、校历例外、冲突、空闲时段、备份和 ICS 规则。
- `src/data/`：预置课表、本机存储和 Supabase 同步适配器。
- `src/pages/`、`src/components/`：响应式界面与表单。
- `supabase/schema.sql`：数据库、行级安全和冲突检测保存函数。
