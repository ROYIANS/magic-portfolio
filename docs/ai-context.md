# AI Context - Magic Portfolio 技术架构文档

## 项目概述

Magic Portfolio 是一个基于 Next.js 的现代化作品集模板，专为设计师和开发者打造。项目采用 TypeScript 开发，集成了 Once UI 设计系统，支持 MDX 内容管理，提供响应式设计和主题定制功能。

## 技术栈详情

### 核心框架
- **Next.js 15.3.1**: 主框架，使用 App Router 架构
- **React 19.0.0**: UI 库
- **TypeScript 5.8.3**: 类型安全

### UI 与样式
- **@once-ui-system/core**: 核心设计系统组件库
- **SASS 1.86.3**: CSS 预处理器
- **classnames**: 动态 CSS 类名管理

### 内容管理
- **@next/mdx 15.3.1**: MDX 支持
- **next-mdx-remote 5.0.0**: 远程 MDX 内容处理
- **gray-matter 4.0.3**: Frontmatter 解析

### 开发工具
- **@biomejs/biome 1.9.4**: 代码格式化和检查
- **ESLint**: 代码质量检查
- **lint-staged**: Git 提交前代码检查

### 其他依赖
- **react-icons 5.5.0**: 图标库
- **transliteration 2.3.5**: 文本转换
- **cookie 1.0.2**: Cookie 处理

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── about/             # 关于页面
│   ├── api/               # API 路由
│   ├── blog/              # 博客页面
│   │   └── posts/         # MDX 博客文章
│   ├── gallery/           # 画廊页面
│   ├── work/              # 作品展示页面
│   │   └── projects/      # MDX 项目文档
│   ├── layout.tsx         # 根布局组件
│   ├── page.tsx           # 首页
│   └── not-found.tsx      # 404 页面
├── components/            # 可复用组件
│   ├── about/             # 关于页面组件
│   ├── blog/              # 博客相关组件
│   ├── gallery/           # 画廊组件
│   ├── Header.tsx         # 页头组件
│   ├── Footer.tsx         # 页脚组件
│   ├── RouteGuard.tsx     # 路由保护
│   └── index.ts           # 组件导出
├── resources/             # 资源配置
│   ├── content.tsx        # 内容配置
│   ├── once-ui.config.ts  # Once UI 配置
│   ├── custom.css         # 自定义样式
│   └── icons.ts           # 图标配置
└── types/                 # TypeScript 类型定义
```

## 配置系统详解

### 1. 内容配置 (src/resources/content.tsx)
- **Person**: 个人信息配置
- **Home**: 首页内容配置
- **About**: 关于页面配置，包含工作经历、技能、教育背景
- **Blog**: 博客页面配置
- **Work**: 作品展示配置
- **Gallery**: 画廊配置
- **Social**: 社交媒体链接
- **Newsletter**: 邮件订阅配置

### 2. Once UI 配置 (src/resources/once-ui.config.ts)
- **Routes**: 页面路由开关控制
- **Display**: 显示选项（位置、时间、主题切换器）
- **Protected Routes**: 密码保护页面配置
- **Fonts**: 字体配置（标题、正文、标签、代码）
- **Style**: 主题样式配置
  - 主题模式：dark/light/system
  - 颜色配置：中性色、品牌色、强调色
  - 视觉效果：边框、表面、过渡动画
- **Effects**: 视觉效果配置
  - 遮罩效果、渐变背景、点状装饰
  - 网格、线条装饰
- **Schema**: SEO 结构化数据配置

## 组件架构

### 1. 布局组件
- **RootLayout** (app/layout.tsx):
  - 根布局，包含主题初始化脚本
  - 字体配置注入
  - 背景效果渲染
  - Provider 包装器

### 2. 核心组件
- **Header**: 导航头部，支持主题切换
- **Footer**: 页脚信息
- **RouteGuard**: 路由保护组件，处理密码验证
- **Providers**: 上下文提供者包装
- **ThemeToggle**: 主题切换组件

### 3. 内容组件
- **CustomMDX**: MDX 内容渲染器
- **Post/Posts**: 博客文章组件
- **ProjectCard**: 项目卡片组件
- **ShareSection**: 社交分享组件
- **TableOfContents**: 目录组件

## API 路由

### 认证相关
- `/api/authenticate`: 密码验证
- `/api/check-auth`: 认证状态检查

### 内容生成
- `/api/og/generate`: OG 图片生成
- `/api/og/fetch`: OG 数据获取
- `/api/og/proxy`: OG 图片代理
- `/api/rss`: RSS 订阅源

## 开发规范

### 代码格式化
- 使用 Biome 进行代码格式化和检查
- 缩进：2 个空格
- 行宽：100 字符
- 引号风格：双引号

### Git 工作流
- 使用 lint-staged 在提交前进行代码检查
- 自动格式化 JS/TS/JSON 文件

### 类型安全
- 严格的 TypeScript 配置
- 路径别名：`@/*` 指向 `./src/*`
- 完整的类型定义覆盖

## 内容管理

### MDX 文件结构
- 博客文章：`src/app/blog/posts/*.mdx`
- 项目文档：`src/app/work/projects/*.mdx`
- 支持 Frontmatter 元数据
- 自动生成 SEO 标签和 OG 图片

### 图片资源
- 存放在 `public/images/` 目录
- 支持响应式图片处理
- 自动 OG 图片生成

## 部署配置

### Next.js 配置 (next.config.mjs)
- MDX 支持配置
- 图片域名白名单
- SASS 编译配置
- 页面扩展名支持：ts, tsx, md, mdx

### 环境变量
- `PAGE_ACCESS_PASSWORD`: 页面访问密码

## 主题系统

### 动态主题切换
- 支持 dark/light/system 模式
- 本地存储持久化
- 媒体查询自适应

### 视觉效果
- 可配置的背景效果（遮罩、渐变、装饰）
- 响应式设计
- 动画过渡效果

## SEO 优化

### 自动化 SEO
- 基于内容配置自动生成 meta 标签
- 结构化数据支持
- Sitemap 和 robots.txt 自动生成
- RSS 订阅源

### 性能优化
- Next.js 静态生成
- 图片优化
- 字体优化（Geist 字体）

## 扩展指南

### 添加新页面
1. 在 `src/app/` 下创建新目录
2. 在 `src/resources/once-ui.config.ts` 中添加路由配置
3. 更新导航组件

### 自定义主题
1. 修改 `src/resources/once-ui.config.ts` 中的 style 配置
2. 在 `src/resources/custom.css` 中添加自定义样式

### 添加新组件
1. 在 `src/components/` 下创建组件
2. 在 `src/components/index.ts` 中导出
3. 遵循 Once UI 设计系统规范

## 常用命令

```bash
npm run dev          # 开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # ESLint 检查
npm run biome-write  # Biome 格式化
```

## 注意事项

1. **内容配置**: 所有内容通过 `src/resources/content.tsx` 统一管理
2. **类型安全**: 所有配置都有完整的 TypeScript 类型支持
3. **主题一致性**: 使用 Once UI 设计系统确保视觉一致性
4. **性能优化**: 利用 Next.js 的静态生成和优化特性
5. **可维护性**: 模块化组件设计，易于扩展和维护