# Magic Portfolio 集成 Halo API 开发计划

## 项目概述

本文档详细规划 Magic Portfolio 项目使用 Halo API 作为后端服务的完整开发方案。项目将作为 Halo CMS 的前端展示层，专注于提供优雅的用户体验。

## 当前架构分析

### 现有系统特点
- **框架**: Next.js 15.3.1 + React 19.0.0 + TypeScript
- **UI 系统**: Once UI 设计系统，提供响应式组件
- **内容管理**: MDX 文件 + gray-matter 解析 frontmatter
- **数据获取**: 文件系统读取（`utils/utils.ts` 中的 `getPosts` 函数）
- **配置管理**: 通过 `src/resources/content.tsx` 集中配置

### 现有数据结构
```typescript
// 当前文章数据结构
type Metadata = {
  title: string;
  publishedAt: string;
  summary: string;
  image?: string;
  images: string[];
  tag?: string;
  team: Team[];
  link?: string;
};
```

## Halo API 架构分析

### API 分组和功能
1. **Public API** (`/apis/api.content.halo.run/v1alpha1/`):
   - 文章列表: `GET /posts`
   - 单个文章: `GET /posts/{name}`
   - 分类管理: `GET /categories`
   - 标签管理: `GET /tags`

2. **Console API** (`/apis/api.console.halo.run/v1alpha1/`):
   - 文章管理和发布
   - 内容编辑和版本控制

3. **认证方式**:
   - 个人令牌（推荐）: `Authorization: Bearer pat_xxx`
   - Basic Auth（需手动开启）

### Halo 数据结构
```typescript
// Halo 文章数据结构
interface HaloPost {
  metadata: {
    name: string;
    creationTimestamp: string;
    annotations?: Record<string, string>;
  };
  spec: {
    title: string;
    slug: string;
    cover?: string;
    publishTime?: string;
    excerpt: {
      autoGenerate: boolean;
      raw?: string;
    };
    categories: string[];
    tags: string[];
    visible: "PUBLIC" | "INTERNAL" | "PRIVATE";
  };
  status: {
    permalink: string;
    excerpt: string;
    lastModifyTime: string;
  };
  stats: {
    visit: number;
    upvote: number;
    comment: number;
  };
}
```

## 迁移策略详细规划

### 第一阶段：基础设施搭建

#### 1.1 依赖管理
```bash
# 新增依赖
pnpm add @halo-dev/api-client axios
pnpm add @types/axios --save-dev
```

#### 1.2 环境配置
```typescript
// .env.local
HALO_API_BASE_URL=http://localhost:8090
HALO_API_TOKEN=pat_your_personal_access_token
```

#### 1.3 API 客户端初始化
```typescript
// src/lib/halo-client.ts
import axios from 'axios';
import { createPublicApiClient, createConsoleApiClient } from '@halo-dev/api-client';

const axiosInstance = axios.create({
  baseURL: process.env.HALO_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.HALO_API_TOKEN}`,
  },
});

export const haloPublicApi = createPublicApiClient(axiosInstance);
export const haloConsoleApi = createConsoleApiClient(axiosInstance);
```

### 第二阶段：类型系统重构

#### 2.1 Halo 类型定义
```typescript
// src/types/halo.ts
export interface HaloMetadata {
  name: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  creationTimestamp: string;
}

export interface HaloPostSpec {
  title: string;
  slug: string;
  cover?: string;
  publishTime?: string;
  excerpt: {
    autoGenerate: boolean;
    raw?: string;
  };
  categories: string[];
  tags: string[];
  visible: "PUBLIC" | "INTERNAL" | "PRIVATE";
  allowComment: boolean;
  pinned: boolean;
  priority: number;
}

export interface HaloPostStatus {
  permalink: string;
  excerpt: string;
  lastModifyTime: string;
  commentsCount: number;
}

export interface HaloPost {
  metadata: HaloMetadata;
  spec: HaloPostSpec;
  status: HaloPostStatus;
  stats: {
    visit: number;
    upvote: number;
    comment: number;
  };
  content?: {
    content: string;
    raw: string;
  };
}
```

#### 2.2 数据映射适配器
```typescript
// src/lib/adapters/post-adapter.ts
export class PostAdapter {
  static haloToLocal(haloPost: HaloPost): LocalPost {
    return {
      slug: haloPost.spec.slug,
      metadata: {
        title: haloPost.spec.title,
        publishedAt: haloPost.spec.publishTime || haloPost.metadata.creationTimestamp,
        summary: haloPost.status.excerpt,
        image: haloPost.spec.cover,
        images: [], // 需要从内容中提取
        tag: haloPost.spec.tags?.[0], // 适配现有单标签结构
        team: [], // 从 contributors 映射
        link: haloPost.status.permalink,
      },
      content: haloPost.content?.content || '',
    };
  }

  static localToHalo(localPost: LocalPost): Partial<HaloPost> {
    return {
      spec: {
        title: localPost.metadata.title,
        slug: localPost.slug,
        cover: localPost.metadata.image,
        publishTime: localPost.metadata.publishedAt,
        excerpt: {
          autoGenerate: !localPost.metadata.summary,
          raw: localPost.metadata.summary,
        },
        tags: localPost.metadata.tag ? [localPost.metadata.tag] : [],
        categories: [], // 默认空分类
        visible: "PUBLIC",
        allowComment: true,
        pinned: false,
        priority: 0,
      },
    };
  }
}
```

### 第三阶段：API 服务层开发

#### 3.1 文章服务
```typescript
// src/services/post-service.ts
export class PostService {
  async getPosts(options?: {
    page?: number;
    size?: number;
    categoryName?: string;
    tagName?: string;
    sort?: string[];
  }): Promise<HaloPost[]> {
    const response = await haloPublicApi.content.post.queryPosts({
      page: options?.page || 0,
      size: options?.size || 20,
      sort: options?.sort || ['spec.publishTime,desc'],
    });
    
    return response.data.items;
  }

  async getPostBySlug(slug: string): Promise<HaloPost | null> {
    // 通过 slug 查找文章
    const posts = await this.getPosts({ size: 1000 });
    return posts.find(post => post.spec.slug === slug) || null;
  }

  async getPostContent(postName: string): Promise<string> {
    const content = await haloPublicApi.content.post.queryPostByName(postName);
    return content.data.content?.content || '';
  }
}
```

#### 3.2 分类和标签服务
```typescript
// src/services/taxonomy-service.ts
export class TaxonomyService {
  async getCategories(): Promise<HaloCategory[]> {
    const response = await haloPublicApi.content.category.queryCategories();
    return response.data.items;
  }

  async getTags(): Promise<HaloTag[]> {
    const response = await haloPublicApi.content.tag.queryTags();
    return response.data.items;
  }
}
```

### 第四阶段：组件重构

#### 4.1 Posts 组件重构
```typescript
// src/components/blog/Posts.tsx (重构版)
interface PostsProps {
  range?: [number] | [number, number];
  columns?: "1" | "2" | "3";
  thumbnail?: boolean;
  direction?: "row" | "column";
  exclude?: string[];
  category?: string;
  tag?: string;
}

export async function Posts({
  range,
  columns = "1",
  thumbnail = false,
  exclude = [],
  category,
  tag,
}: PostsProps) {
  const postService = new PostService();
  
  // 使用 Halo API 获取文章
  const allPosts = await postService.getPosts({
    categoryName: category,
    tagName: tag,
    size: 100, // 调整根据需要
  });

  // 排除指定文章
  const filteredPosts = exclude.length 
    ? allPosts.filter(post => !exclude.includes(post.spec.slug))
    : allPosts;

  // 应用范围切片
  const displayedPosts = range
    ? filteredPosts.slice(range[0] - 1, range.length === 2 ? range[1] : filteredPosts.length)
    : filteredPosts;

  return (
    <Grid columns={columns} s={{ columns: 1 }} fillWidth marginBottom="40" gap="16">
      {displayedPosts.map((post) => (
        <Post 
          key={post.metadata.name} 
          post={PostAdapter.haloToLocal(post)} 
          thumbnail={thumbnail} 
          direction={direction} 
        />
      ))}
    </Grid>
  );
}
```

#### 4.2 动态路由重构
```typescript
// src/app/blog/[slug]/page.tsx (新增)
import { PostService } from '@/services/post-service';
import { PostAdapter } from '@/lib/adapters/post-adapter';

export async function generateStaticParams() {
  const postService = new PostService();
  const posts = await postService.getPosts({ size: 1000 });
  
  return posts.map((post) => ({
    slug: post.spec.slug,
  }));
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const postService = new PostService();
  const haloPost = await postService.getPostBySlug(params.slug);
  
  if (!haloPost) {
    notFound();
  }

  const post = PostAdapter.haloToLocal(haloPost);
  const content = await postService.getPostContent(haloPost.metadata.name);

  return (
    <article>
      <h1>{post.metadata.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  );
}
```

### 第五阶段：缓存和性能优化

#### 5.1 API 响应缓存
```typescript
// src/lib/cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedPosts = unstable_cache(
  async (options?: GetPostsOptions) => {
    const postService = new PostService();
    return await postService.getPosts(options);
  },
  ['halo-posts'],
  {
    revalidate: 300, // 5分钟缓存
    tags: ['posts'],
  }
);
```

#### 5.2 增量静态再生成 (ISR)
```typescript
// src/app/blog/page.tsx
export const revalidate = 300; // 5分钟重新验证

export default async function Blog() {
  const posts = await getCachedPosts({ size: 20 });
  
  return (
    <Column maxWidth="m" paddingTop="24">
      {/* 渲染逻辑 */}
    </Column>
  );
}
```

### 第六阶段：错误处理和回退

#### 6.1 API 错误处理
```typescript
// src/lib/error-handler.ts
export class ApiErrorHandler {
  static async withFallback<T>(
    apiCall: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      console.error('Halo API Error:', error);
      return fallback;
    }
  }
}
```

#### 6.2 降级策略
```typescript
// src/services/fallback-service.ts
export class FallbackService {
  static async getPostsWithFallback(): Promise<LocalPost[]> {
    try {
      // 尝试 Halo API
      const haloService = new PostService();
      const haloPosts = await haloService.getPosts();
      return haloPosts.map(PostAdapter.haloToLocal);
    } catch (error) {
      // 降级到文件系统
      console.warn('Falling back to local files:', error);
      return getPosts(["src", "app", "blog", "posts"]);
    }
  }
}
```

## 关键技术决策

### 数据流架构
```
Halo CMS → API Client → Service Layer → Adapter Layer → React Components
```

### 认证策略
- 使用个人令牌 (PAT) 进行服务端认证
- 在 Next.js API 路由中处理敏感操作
- 客户端只调用公开 API

### 缓存策略
- **服务端缓存**: Next.js `unstable_cache` 和 ISR
- **CDN 缓存**: 静态资源和 API 响应
- **浏览器缓存**: 客户端组件状态管理

## 迁移时间线

### 第一周：基础设施
- [ ] 搭建 Halo API 客户端
- [ ] 创建类型定义和适配器
- [ ] 建立错误处理机制

### 第二周：核心功能
- [ ] 重构 Posts 组件
- [ ] 实现文章详情页
- [ ] 添加分类和标签支持

### 第三周：优化和测试
- [ ] 实现缓存策略
- [ ] 性能优化
- [ ] 全面测试和调试

### 第四周：部署和监控
- [ ] 生产环境配置
- [ ] 监控和日志
- [ ] 文档完善

## 风险评估和缓解

### 高风险项
1. **API 不可用**: 实现降级到本地文件系统
2. **数据格式不兼容**: 通过适配器层解决
3. **性能问题**: 使用缓存和分页策略

### 中风险项
1. **SEO 影响**: 确保 SSG/ISR 正常工作
2. **类型安全**: 完善 TypeScript 类型定义

## 性能目标

- **首屏加载时间**: < 2秒
- **API 响应时间**: < 500ms
- **缓存命中率**: > 90%
- **构建时间**: < 5分钟

## 监控指标

- API 响应时间和成功率
- 页面加载性能指标
- 缓存命中率统计
- 错误率和降级频率

## 向后兼容性

在迁移过程中，确保：
1. 现有 URL 结构保持不变
2. 现有内容格式继续支持
3. 配置系统向后兼容
4. 渐进式迁移，支持并行运行

## 总结

这个迁移计划采用渐进式策略，通过适配器模式和降级机制确保系统稳定性，同时利用 Halo 的强大 CMS 功能提升内容管理体验。整个过程预计需要 4 周时间完成。