# Magic Portfolio + Halo API 前端开发指南

## 快速开始

### 前置条件
1. **Halo 服务器**: 版本 2.17+ 已安装并运行，作为内容管理后端
2. **个人令牌**: 在 Halo 后台创建具有读取权限的 PAT
3. **网络连接**: 确保前端应用能访问 Halo API 端点

### 环境配置

#### 1. 环境变量设置
```bash
# .env.local (开发环境)
HALO_API_BASE_URL=http://localhost:8090
HALO_API_TOKEN=pat_your_development_token
HALO_ENABLE_FALLBACK=true
HALO_CACHE_TIMEOUT=60
NEXT_PUBLIC_HALO_PUBLIC_URL=http://localhost:8090

# .env.production (生产环境)
HALO_API_BASE_URL=https://your-halo-instance.com
HALO_API_TOKEN=pat_your_production_token
HALO_ENABLE_FALLBACK=false
HALO_CACHE_TIMEOUT=300
NEXT_PUBLIC_HALO_PUBLIC_URL=https://your-halo-instance.com
```

#### 2. Package.json 更新
```json
{
  "dependencies": {
    "@halo-dev/api-client": "^2.17.0",
    "axios": "^1.6.0"
  },
  "scripts": {
    "halo:test": "node scripts/test-halo-connection.js",
    "halo:migrate": "node scripts/migrate-content.js",
    "dev:halo": "HALO_ENABLE_FALLBACK=false npm run dev"
  }
}
```

## 分步实施指南

### 第一步：API 客户端集成

#### 创建 Halo 客户端配置
```typescript
// src/lib/halo-client.ts
import axios from 'axios';
import { createPublicApiClient } from '@halo-dev/api-client';

const createHaloClient = () => {
  if (!process.env.HALO_API_BASE_URL || !process.env.HALO_API_TOKEN) {
    console.warn('Halo configuration missing, using fallback mode');
    return null;
  }

  const axiosInstance = axios.create({
    baseURL: process.env.HALO_API_BASE_URL,
    timeout: 10000,
    headers: {
      'Authorization': `Bearer ${process.env.HALO_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  // 请求日志记录
  axiosInstance.interceptors.request.use(config => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔗 Halo API: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  });

  // 错误处理
  axiosInstance.interceptors.response.use(
    response => response,
    error => {
      console.error('Halo API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
      return Promise.reject(error);
    }
  );

  return createPublicApiClient(axiosInstance);
};

export const haloApi = createHaloClient();
export const isHaloAvailable = !!haloApi;
```

#### 连接测试脚本
```javascript
// scripts/test-halo-connection.js
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testHaloConnection() {
  const baseURL = process.env.HALO_API_BASE_URL;
  const token = process.env.HALO_API_TOKEN;

  if (!baseURL || !token) {
    console.error('❌ Missing HALO_API_BASE_URL or HALO_API_TOKEN');
    process.exit(1);
  }

  try {
    const response = await axios.get(`${baseURL}/apis/api.content.halo.run/v1alpha1/posts?size=1`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });

    console.log('✅ Halo API connection successful');
    console.log(`📊 Found ${response.data.total} posts in total`);
  } catch (error) {
    console.error('❌ Halo API connection failed:', error.message);
    process.exit(1);
  }
}

testHaloConnection();
```

### 第二步：逐步替换数据源

#### 2.1 创建混合数据源
```typescript
// src/lib/data-source.ts
import { getPosts as getLocalPosts } from '@/utils/utils';
import { PostService } from '@/services/post-service';
import { isHaloAvailable } from '@/lib/halo-client';

export class HybridDataSource {
  private postService = new PostService();

  async getPosts(options?: GetPostsOptions): Promise<LocalPost[]> {
    if (isHaloAvailable && !process.env.HALO_ENABLE_FALLBACK) {
      try {
        return await this.postService.getPosts(options);
      } catch (error) {
        console.warn('Halo API failed, falling back to local files:', error);
        return this.getLocalPosts();
      }
    }
    
    return this.getLocalPosts();
  }

  private getLocalPosts(): LocalPost[] {
    try {
      return getLocalPosts(["src", "app", "blog", "posts"]);
    } catch (error) {
      console.error('Local file system also failed:', error);
      return [];
    }
  }
}
```

#### 2.2 更新组件以使用混合数据源
```typescript
// src/components/blog/Posts.tsx (过渡版本)
import { HybridDataSource } from '@/lib/data-source';

export async function Posts({ range, columns = "1", thumbnail = false }: PostsProps) {
  const dataSource = new HybridDataSource();
  const allPosts = await dataSource.getPosts();

  // 现有的过滤和渲染逻辑保持不变
  const sortedPosts = allPosts.sort((a, b) => {
    return new Date(b.metadata.publishedAt).getTime() - 
           new Date(a.metadata.publishedAt).getTime();
  });

  const displayedPosts = range
    ? sortedPosts.slice(range[0] - 1, range.length === 2 ? range[1] : sortedPosts.length)
    : sortedPosts;

  return (
    <Grid columns={columns} s={{ columns: 1 }} fillWidth marginBottom="40" gap="16">
      {displayedPosts.map((post) => (
        <Post key={post.slug} post={post} thumbnail={thumbnail} />
      ))}
    </Grid>
  );
}
```

### 第三步：内容同步和迁移

#### 3.1 内容迁移脚本
```javascript
// scripts/migrate-content.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const axios = require('axios');

class ContentMigrator {
  constructor(haloBaseUrl, haloToken) {
    this.baseUrl = haloBaseUrl;
    this.token = haloToken;
    this.axios = axios.create({
      baseURL: haloBaseUrl,
      headers: { Authorization: `Bearer ${haloToken}` },
    });
  }

  async migrateAllPosts() {
    const postsDir = path.join(process.cwd(), 'src', 'app', 'blog', 'posts');
    const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.mdx'));

    console.log(`🚀 开始迁移 ${files.length} 篇文章到 Halo`);

    for (const file of files) {
      try {
        await this.migratePost(path.join(postsDir, file));
        console.log(`✅ 迁移成功: ${file}`);
      } catch (error) {
        console.error(`❌ 迁移失败: ${file}`, error.message);
      }
    }
  }

  async migratePost(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    
    const slug = path.basename(filePath, '.mdx');
    
    // 创建文章
    const postData = {
      metadata: {
        name: slug,
        generateName: slug,
      },
      spec: {
        title: frontmatter.title,
        slug: slug,
        excerpt: {
          autoGenerate: !frontmatter.summary,
          raw: frontmatter.summary || '',
        },
        cover: frontmatter.image,
        publishTime: frontmatter.publishedAt,
        visible: 'PUBLIC',
        allowComment: true,
        pinned: false,
        priority: 0,
        publish: true,
        tags: frontmatter.tag ? [frontmatter.tag] : [],
        categories: [],
      },
    };

    // 先创建文章
    const postResponse = await this.axios.post('/apis/content.halo.run/v1alpha1/posts', postData);
    
    // 再创建内容
    const contentData = {
      content: content,
      raw: content,
      rawType: 'markdown',
    };

    await this.axios.put(
      `/apis/api.console.halo.run/v1alpha1/posts/${slug}/content`,
      contentData
    );

    // 发布文章
    await this.axios.put(`/apis/api.console.halo.run/v1alpha1/posts/${slug}/publish`);
  }
}

// 执行迁移
async function main() {
  const migrator = new ContentMigrator(
    process.env.HALO_API_BASE_URL,
    process.env.HALO_API_TOKEN
  );
  
  await migrator.migrateAllPosts();
  console.log('🎉 内容迁移完成');
}

main().catch(console.error);
```

### 第四步：测试验证

#### 4.1 端到端测试
```typescript
// __tests__/e2e/halo-integration.test.ts
import { test, expect } from '@playwright/test';

test.describe('Halo API Integration', () => {
  test('should load posts from Halo API', async ({ page }) => {
    await page.goto('/blog');
    
    // 验证文章列表加载
    await expect(page.locator('[data-testid="blog-posts"]')).toBeVisible();
    
    // 验证文章数量
    const posts = page.locator('[data-testid="blog-post"]');
    await expect(posts).toHaveCountGreaterThan(0);
    
    // 验证文章链接可点击
    const firstPost = posts.first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();
    
    // 验证文章详情页
    await expect(page.locator('article h1')).toBeVisible();
    await expect(page.locator('article .content')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // 模拟 API 错误
    await page.route('**/apis/api.content.halo.run/**', route => {
      route.fulfill({ status: 500, body: 'Server Error' });
    });

    await page.goto('/blog');
    
    // 验证降级机制
    await expect(page.locator('[data-testid="fallback-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="blog-posts"]')).toBeVisible();
  });
});
```

#### 4.2 API 集成测试
```typescript
// __tests__/integration/api.test.ts
import { PostService } from '@/services/post-service';
import { PostAdapter } from '@/lib/adapters/post-adapter';

describe('API Integration Tests', () => {
  let postService: PostService;

  beforeEach(() => {
    postService = new PostService();
  });

  test('should fetch posts from Halo API', async () => {
    const posts = await postService.getPosts({ size: 5 });
    
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);
    
    const firstPost = posts[0];
    expect(firstPost).toHaveProperty('metadata.title');
    expect(firstPost).toHaveProperty('slug');
    expect(firstPost).toHaveProperty('content');
  });

  test('should handle post by slug correctly', async () => {
    const posts = await postService.getPosts({ size: 1 });
    if (posts.length > 0) {
      const post = await postService.getPostBySlug(posts[0].slug);
      expect(post).not.toBeNull();
      expect(post?.slug).toBe(posts[0].slug);
    }
  });
});
```

### 第五步：部署配置

#### 5.1 Docker Compose 配置
```yaml
# docker-compose.yml
version: '3.8'

services:
  halo:
    image: halohub/halo:2.21
    container_name: halo
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - halo_data:/root/.halo2
    environment:
      - HALO_EXTERNAL_URL=http://localhost:8090
    
  magic-portfolio:
    build: .
    container_name: magic-portfolio
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - HALO_API_BASE_URL=http://halo:8090
      - HALO_API_TOKEN=${HALO_API_TOKEN}
      - HALO_ENABLE_FALLBACK=true
    depends_on:
      - halo

volumes:
  halo_data:
```

#### 5.2 Kubernetes 部署
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: magic-portfolio
spec:
  replicas: 3
  selector:
    matchLabels:
      app: magic-portfolio
  template:
    metadata:
      labels:
        app: magic-portfolio
    spec:
      containers:
      - name: magic-portfolio
        image: magic-portfolio:latest
        ports:
        - containerPort: 3000
        env:
        - name: HALO_API_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: halo-config
              key: api-url
        - name: HALO_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: halo-secret
              key: api-token
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 最佳实践

### 1. 错误处理最佳实践

```typescript
// 服务端组件错误边界
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function BlogPageWithErrorBoundary() {
  return (
    <ErrorBoundary
      fallback={<BlogErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('Blog page error:', error, errorInfo);
        // 发送错误报告到监控服务
      }}
    >
      <Suspense fallback={<BlogLoadingSkeleton />}>
        <BlogPage />
      </Suspense>
    </ErrorBoundary>
  );
}

function BlogErrorFallback() {
  return (
    <div className="error-fallback">
      <h2>内容加载失败</h2>
      <p>正在尝试从本地文件加载内容...</p>
      <button onClick={() => window.location.reload()}>
        重试
      </button>
    </div>
  );
}
```

### 2. 性能优化最佳实践

```typescript
// 分页加载优化
export async function getStaticProps({ params }) {
  const posts = await getCachedPosts({
    page: 0,
    size: 10, // 只获取首页需要的文章数量
  });

  return {
    props: { posts },
    revalidate: 300, // 5分钟 ISR
  };
}

// 图片懒加载优化
import { Image } from '@once-ui-system/core';

function OptimizedPostCard({ post }: { post: LocalPost }) {
  return (
    <Card>
      <Image
        src={post.metadata.image}
        alt={post.metadata.title}
        loading="lazy"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        placeholder="blur"
      />
      <h3>{post.metadata.title}</h3>
    </Card>
  );
}
```

### 3. SEO 优化最佳实践

```typescript
// 动态元数据生成
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getCachedPost(params.slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The requested post could not be found.',
    };
  }

  return {
    title: post.metadata.title,
    description: post.metadata.summary,
    openGraph: {
      title: post.metadata.title,
      description: post.metadata.summary,
      images: post.metadata.image ? [post.metadata.image] : [],
      type: 'article',
      publishedTime: post.metadata.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.metadata.title,
      description: post.metadata.summary,
      images: post.metadata.image ? [post.metadata.image] : [],
    },
  };
}
```

### 4. 安全最佳实践

```typescript
// API 令牌保护
const validateApiToken = (token: string): boolean => {
  // 验证令牌格式
  if (!token.startsWith('pat_')) {
    return false;
  }
  
  // 验证令牌长度
  if (token.length < 20) {
    return false;
  }
  
  return true;
};

// 环境变量验证
export function validateEnvironment(): void {
  const token = process.env.HALO_API_TOKEN;
  
  if (token && !validateApiToken(token)) {
    throw new Error('Invalid HALO_API_TOKEN format');
  }
  
  if (process.env.NODE_ENV === 'production' && !token) {
    throw new Error('HALO_API_TOKEN is required in production');
  }
}
```

## 性能监控

### 1. API 性能监控

```typescript
// src/lib/monitoring.ts
export class ApiMonitor {
  private static metrics = new Map<string, number[]>();

  static recordApiCall(endpoint: string, duration: number, success: boolean) {
    const key = `${endpoint}_${success ? 'success' : 'error'}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const values = this.metrics.get(key)!;
    values.push(duration);
    
    // 保持最近100次记录
    if (values.length > 100) {
      values.shift();
    }
    
    // 输出统计信息
    if (values.length % 10 === 0) {
      this.logStats(key, values);
    }
  }

  private static logStats(key: string, values: number[]) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    console.log(`📊 ${key}: avg=${avg.toFixed(2)}ms, min=${min}ms, max=${max}ms`);
  }

  static getHealthCheck(): Record<string, any> {
    const healthData = {};
    
    this.metrics.forEach((values, key) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      healthData[key] = {
        averageResponseTime: avg,
        sampleCount: values.length,
        isHealthy: avg < 1000, // 1秒阈值
      };
    });
    
    return healthData;
  }
}
```

### 2. 健康检查端点

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { haloApi } from '@/lib/halo-client';
import { ApiMonitor } from '@/lib/monitoring';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {},
  };

  // 检查 Halo API 连接
  try {
    const start = Date.now();
    await haloApi?.content.post.queryPosts({ size: 1 });
    const duration = Date.now() - start;
    
    health.services.halo = {
      status: 'healthy',
      responseTime: duration,
    };
  } catch (error) {
    health.services.halo = {
      status: 'unhealthy',
      error: error.message,
    };
    health.status = 'degraded';
  }

  // 获取性能指标
  health.metrics = ApiMonitor.getHealthCheck();

  return NextResponse.json(health);
}
```

## 故障排除指南

### 常见问题和解决方案

#### 1. API 连接失败
**症状**: 页面显示空内容或错误信息
**检查步骤**:
```bash
# 1. 验证 Halo 服务状态
curl -I http://localhost:8090/actuator/health

# 2. 测试 API 连接
npm run halo:test

# 3. 检查网络连通性
ping your-halo-instance.com

# 4. 验证令牌权限
curl -H "Authorization: Bearer your_token" \
     http://localhost:8090/apis/api.content.halo.run/v1alpha1/posts?size=1
```

#### 2. 数据格式不匹配
**症状**: 页面渲染异常或类型错误
**解决方案**:
```typescript
// 添加运行时数据验证
import { z } from 'zod';

const HaloPostSchema = z.object({
  metadata: z.object({
    name: z.string(),
    creationTimestamp: z.string(),
  }),
  spec: z.object({
    title: z.string(),
    slug: z.string(),
    excerpt: z.object({
      autoGenerate: z.boolean(),
      raw: z.string().optional(),
    }),
  }),
  status: z.object({
    permalink: z.string(),
    excerpt: z.string(),
  }),
});

export function validateHaloPost(data: unknown): HaloPost {
  return HaloPostSchema.parse(data);
}
```

#### 3. 性能问题
**症状**: 页面加载缓慢
**优化措施**:
```typescript
// 实现智能分页
export class SmartPagination {
  static calculateOptimalPageSize(screenWidth: number): number {
    if (screenWidth < 768) return 5;  // 移动端
    if (screenWidth < 1024) return 8; // 平板
    return 12; // 桌面端
  }

  static async loadPostsProgressively(
    service: PostService,
    initialSize = 6
  ): Promise<LocalPost[]> {
    // 先加载少量文章快速展示
    const initialPosts = await service.getPosts({ size: initialSize });
    
    // 后台预加载更多内容
    setTimeout(async () => {
      await service.getPosts({ size: 20, page: 1 });
    }, 100);
    
    return initialPosts;
  }
}
```

## 维护和监控

### 1. 日志配置
```typescript
// src/lib/logger.ts
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static level = process.env.NODE_ENV === 'production' 
    ? LogLevel.WARN 
    : LogLevel.DEBUG;

  static debug(message: string, data?: any) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`🔍 [DEBUG] ${message}`, data);
    }
  }

  static info(message: string, data?: any) {
    if (this.level <= LogLevel.INFO) {
      console.info(`ℹ️ [INFO] ${message}`, data);
    }
  }

  static warn(message: string, data?: any) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`⚠️ [WARN] ${message}`, data);
    }
  }

  static error(message: string, error?: any) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`❌ [ERROR] ${message}`, error);
    }
  }
}
```

### 2. 监控仪表板
```typescript
// src/app/admin/dashboard/page.tsx
export default async function AdminDashboard() {
  const healthData = await fetch('/api/health').then(r => r.json());
  const metrics = ApiMonitor.getHealthCheck();

  return (
    <div className="admin-dashboard">
      <h1>系统监控仪表板</h1>
      
      <div className="health-status">
        <h2>服务状态</h2>
        <div className={`status ${healthData.status}`}>
          {healthData.status === 'ok' ? '✅ 正常' : '⚠️ 异常'}
        </div>
      </div>

      <div className="metrics">
        <h2>性能指标</h2>
        {Object.entries(metrics).map(([key, metric]) => (
          <div key={key} className="metric-item">
            <span>{key}:</span>
            <span>{metric.averageResponseTime.toFixed(2)}ms</span>
            <span className={metric.isHealthy ? 'healthy' : 'unhealthy'}>
              {metric.isHealthy ? '✅' : '❌'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 迁移检查清单

### 迁移前准备
- [ ] Halo 服务器部署和配置完成
- [ ] 个人令牌创建并测试
- [ ] 环境变量配置正确
- [ ] 依赖包安装完成
- [ ] 本地开发环境测试通过

### 迁移过程
- [ ] 代码备份完成
- [ ] API 客户端集成测试通过
- [ ] 数据适配器功能验证
- [ ] 组件重构完成
- [ ] 缓存策略实施
- [ ] 错误处理机制验证

### 迁移后验证
- [ ] 所有页面正常访问
- [ ] 文章内容显示正确
- [ ] 分类和标签功能正常
- [ ] SEO 元数据生成正确
- [ ] 性能指标达标
- [ ] 错误处理机制正常
- [ ] 监控和日志正常

### 生产部署
- [ ] 生产环境配置验证
- [ ] 缓存预热完成
- [ ] 监控报警配置
- [ ] 备份和恢复策略
- [ ] 回滚计划准备

## 总结

通过遵循这个实施指南，你可以安全、高效地将 Magic Portfolio 项目迁移到使用 Halo API 作为后端。关键要点：

1. **渐进式迁移**: 保持向后兼容，逐步替换
2. **完整的错误处理**: 确保系统稳定性
3. **性能优化**: 通过缓存和批量请求提升用户体验
4. **充分测试**: 确保迁移质量
5. **持续监控**: 及时发现和解决问题

这个方案既保持了 Magic Portfolio 的优雅设计，又充分利用了 Halo 强大的 CMS 功能。