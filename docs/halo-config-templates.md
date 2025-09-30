# Magic Portfolio + Halo API 前端配置模板

## 环境变量模板

### 开发环境配置
```bash
# .env.local
# ===========================================
# Halo API 配置
# ===========================================
HALO_API_BASE_URL=http://localhost:8090
HALO_API_TOKEN=pat_your_development_token_here
HALO_ENABLE_FALLBACK=true
HALO_CACHE_TIMEOUT=60
HALO_RETRY_COUNT=3
HALO_RETRY_DELAY=1000

# ===========================================
# Next.js 配置
# ===========================================
NEXT_PUBLIC_HALO_PUBLIC_URL=http://localhost:8090
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ===========================================
# 调试和监控
# ===========================================
NODE_ENV=development
DEBUG_HALO_API=true
ENABLE_API_LOGGING=true
```

### 生产环境配置
```bash
# .env.production
# ===========================================
# Halo API 配置 (生产环境)
# ===========================================
HALO_API_BASE_URL=https://your-halo-instance.com
HALO_API_TOKEN=pat_your_production_token_here
HALO_ENABLE_FALLBACK=false
HALO_CACHE_TIMEOUT=300
HALO_RETRY_COUNT=5
HALO_RETRY_DELAY=2000

# ===========================================
# Next.js 配置 (生产环境)
# ===========================================
NEXT_PUBLIC_HALO_PUBLIC_URL=https://your-halo-instance.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# ===========================================
# 监控和安全
# ===========================================
NODE_ENV=production
DEBUG_HALO_API=false
ENABLE_API_LOGGING=false
ENABLE_MONITORING=true
```

## Next.js 配置模板

### next.config.mjs 更新
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  experimental: {
    mdxRs: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-halo-instance.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8090',
      },
    ],
  },
  // Halo API 代理配置 (开发环境)
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/halo-api/:path*',
          destination: `${process.env.HALO_API_BASE_URL}/:path*`,
        },
      ];
    }
    return [];
  },
  // 缓存配置
  async headers() {
    return [
      {
        source: '/api/posts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## TypeScript 配置模板

### tsconfig.json 更新
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/services/*": ["./src/services/*"],
      "@/types/*": ["./src/types/*"],
      "@/hooks/*": ["./src/hooks/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

## 包管理配置模板

### package.json 脚本更新
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    
    "halo:test": "node scripts/test-halo-connection.js",
    "halo:migrate": "node scripts/migrate-content.js",
    "halo:health": "curl -s $HALO_API_BASE_URL/actuator/health | jq .",
    "halo:backup": "node scripts/backup-content.js",
    
    "dev:halo": "HALO_ENABLE_FALLBACK=false npm run dev",
    "dev:local": "HALO_ENABLE_FALLBACK=true npm run dev",
    
    "test": "jest",
    "test:e2e": "playwright test",
    "test:integration": "jest --testPathPattern=integration",
    "test:coverage": "jest --coverage",
    
    "cache:clear": "node scripts/clear-cache.js",
    "cache:warm": "node scripts/warm-cache.js",
    
    "deploy:staging": "npm run build && npm run deploy:staging:docker",
    "deploy:production": "npm run build && npm run deploy:production:docker"
  }
}
```

## Docker 配置模板

### Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建时环境变量
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# 构建应用
RUN corepack enable pnpm && pnpm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

### docker-compose.yml
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Halo CMS 服务
  halo:
    image: halohub/halo:2.21
    container_name: halo
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - halo_data:/root/.halo2
      - ./halo-config:/root/.halo2/config
    environment:
      - HALO_EXTERNAL_URL=http://localhost:8090
      - SPRING_DATASOURCE_URL=jdbc:h2:file:/root/.halo2/db/halo
      - HALO_CACHE_ENABLED=true
    networks:
      - halo_network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8090/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Magic Portfolio 前端
  magic-portfolio:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: magic-portfolio
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - HALO_API_BASE_URL=http://halo:8090
      - HALO_API_TOKEN=${HALO_API_TOKEN}
      - HALO_ENABLE_FALLBACK=true
      - HALO_CACHE_TIMEOUT=300
      - NEXT_PUBLIC_HALO_PUBLIC_URL=http://localhost:8090
      - NEXT_PUBLIC_BASE_URL=http://localhost:3000
    depends_on:
      halo:
        condition: service_healthy
    networks:
      - halo_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx 反向代理 (可选)
  nginx:
    image: nginx:alpine
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - magic-portfolio
      - halo
    networks:
      - halo_network

volumes:
  halo_data:
    driver: local

networks:
  halo_network:
    driver: bridge
```

## Nginx 配置模板

### nginx.conf
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream magic_portfolio {
        server magic-portfolio:3000;
    }
    
    upstream halo_backend {
        server halo:8090;
    }

    # 前端应用
    server {
        listen 80;
        server_name your-domain.com;
        
        # 重定向到 HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # 前端代理
        location / {
            proxy_pass http://magic_portfolio;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Halo API 代理
        location /apis/ {
            proxy_pass http://halo_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # 静态资源缓存
        location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Halo 管理后台
    server {
        listen 443 ssl http2;
        server_name admin.your-domain.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        location / {
            proxy_pass http://halo_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## GitHub Actions 配置模板

### CI/CD 流水线
```yaml
# .github/workflows/deploy.yml
name: Deploy Magic Portfolio with Halo

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: ${{ env.PNPM_VERSION }}
        
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      
    - name: Type check
      run: pnpm run type-check
      
    - name: Lint check
      run: pnpm run lint
      
    - name: Unit tests
      run: pnpm run test
      
    - name: Build test
      run: pnpm run build

  integration-test:
    runs-on: ubuntu-latest
    needs: test
    
    services:
      halo:
        image: halohub/halo:2.21
        ports:
          - 8090:8090
        env:
          HALO_EXTERNAL_URL: http://localhost:8090
        options: >-
          --health-cmd "wget --quiet --tries=1 --spider http://localhost:8090/actuator/health"
          --health-interval 30s
          --health-timeout 10s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: ${{ env.PNPM_VERSION }}
        
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      
    - name: Wait for Halo to be ready
      run: |
        timeout 300 bash -c 'until curl -f http://localhost:8090/actuator/health; do sleep 5; done'
        
    - name: Setup Halo test data
      run: node scripts/setup-test-data.js
      env:
        HALO_API_BASE_URL: http://localhost:8090
        HALO_API_TOKEN: ${{ secrets.HALO_TEST_TOKEN }}
        
    - name: Integration tests
      run: pnpm run test:integration
      env:
        HALO_API_BASE_URL: http://localhost:8090
        HALO_API_TOKEN: ${{ secrets.HALO_TEST_TOKEN }}

  deploy:
    runs-on: ubuntu-latest
    needs: [test, integration-test]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: |
          ghcr.io/${{ github.repository }}:latest
          ghcr.io/${{ github.repository }}:${{ github.sha }}
        
    - name: Deploy to production
      run: |
        echo "Deploy to production server"
        # 添加部署脚本
```

## 数据库迁移配置

### 内容同步脚本
```javascript
// scripts/setup-test-data.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class HaloTestDataSetup {
  constructor() {
    this.baseURL = process.env.HALO_API_BASE_URL || 'http://localhost:8090';
    this.token = process.env.HALO_API_TOKEN;
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async setupBasicData() {
    console.log('🚀 设置 Halo 测试数据...');
    
    try {
      // 创建测试分类
      await this.createCategory('tech', '技术分享', 'tech');
      await this.createCategory('life', '生活随笔', 'life');
      
      // 创建测试标签
      await this.createTag('javascript', 'JavaScript', '#f7df1e');
      await this.createTag('react', 'React', '#61dafb');
      await this.createTag('nextjs', 'Next.js', '#000000');
      
      // 创建测试文章
      await this.createTestPost();
      
      console.log('✅ 测试数据设置完成');
    } catch (error) {
      console.error('❌ 测试数据设置失败:', error.message);
      process.exit(1);
    }
  }

  async createCategory(name, displayName, slug) {
    const categoryData = {
      metadata: { name },
      spec: {
        displayName,
        slug,
        priority: 0,
        description: `${displayName}相关的文章分类`,
      },
    };

    try {
      await this.api.post('/apis/content.halo.run/v1alpha1/categories', categoryData);
      console.log(`✅ 分类创建成功: ${displayName}`);
    } catch (error) {
      if (error.response?.status !== 409) { // 不是重复创建错误
        throw error;
      }
      console.log(`ℹ️ 分类已存在: ${displayName}`);
    }
  }

  async createTag(name, displayName, color) {
    const tagData = {
      metadata: { name },
      spec: {
        displayName,
        slug: name,
        color,
      },
    };

    try {
      await this.api.post('/apis/content.halo.run/v1alpha1/tags', tagData);
      console.log(`✅ 标签创建成功: ${displayName}`);
    } catch (error) {
      if (error.response?.status !== 409) {
        throw error;
      }
      console.log(`ℹ️ 标签已存在: ${displayName}`);
    }
  }

  async createTestPost() {
    const postData = {
      metadata: { name: 'test-post-001' },
      spec: {
        title: '测试文章：Magic Portfolio 集成 Halo API',
        slug: 'test-post-001',
        excerpt: {
          autoGenerate: false,
          raw: '这是一篇测试文章，用于验证 Magic Portfolio 与 Halo API 的集成功能。',
        },
        categories: ['tech'],
        tags: ['react', 'nextjs'],
        visible: 'PUBLIC',
        allowComment: true,
        pinned: false,
        priority: 0,
        publish: true,
        publishTime: new Date().toISOString(),
      },
    };

    try {
      // 创建文章
      await this.api.post('/apis/content.halo.run/v1alpha1/posts', postData);
      
      // 添加内容
      const contentData = {
        content: '<h2>欢迎使用 Halo API</h2><p>这是通过 Halo API 创建的测试文章。</p>',
        raw: '## 欢迎使用 Halo API\n\n这是通过 Halo API 创建的测试文章。',
        rawType: 'markdown',
      };
      
      await this.api.put('/apis/api.console.halo.run/v1alpha1/posts/test-post-001/content', contentData);
      
      // 发布文章
      await this.api.put('/apis/api.console.halo.run/v1alpha1/posts/test-post-001/publish');
      
      console.log('✅ 测试文章创建成功');
    } catch (error) {
      if (error.response?.status !== 409) {
        throw error;
      }
      console.log('ℹ️ 测试文章已存在');
    }
  }
}

// 执行设置
if (require.main === module) {
  const setup = new HaloTestDataSetup();
  setup.setupBasicData();
}

module.exports = HaloTestDataSetup;
```

## 监控配置模板

### Prometheus 配置
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'magic-portfolio'
    static_configs:
      - targets: ['magic-portfolio:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'halo'
    static_configs:
      - targets: ['halo:8090']
    metrics_path: '/actuator/prometheus'
    scrape_interval: 30s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana 仪表板
```json
{
  "dashboard": {
    "title": "Magic Portfolio + Halo 监控",
    "panels": [
      {
        "title": "API 响应时间",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(halo_api_response_time_seconds)",
            "legendFormat": "Halo API"
          },
          {
            "expr": "avg(nextjs_api_response_time_seconds)",
            "legendFormat": "Next.js API"
          }
        ]
      },
      {
        "title": "错误率",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(halo_api_errors_total[5m])",
            "legendFormat": "错误率"
          }
        ]
      },
      {
        "title": "缓存命中率",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(nextjs_cache_hits_total[5m]) / rate(nextjs_cache_requests_total[5m]) * 100",
            "legendFormat": "缓存命中率"
          }
        ]
      }
    ]
  }
}
```

## 安全配置模板

### 安全头配置
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 安全头设置
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://your-halo-instance.com",
    ].join('; ')
  );

  // API 路由速率限制
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // 实现简单的速率限制逻辑
    const ip = request.ip || 'unknown';
    // 这里可以集成 Redis 或其他存储来实现真正的速率限制
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 环境变量验证
```typescript
// src/lib/env-validation.ts
import { z } from 'zod';

const envSchema = z.object({
  // Halo 配置
  HALO_API_BASE_URL: z.string().url(),
  HALO_API_TOKEN: z.string().min(20).startsWith('pat_'),
  HALO_ENABLE_FALLBACK: z.enum(['true', 'false']).default('true'),
  HALO_CACHE_TIMEOUT: z.coerce.number().min(60).default(300),
  
  // Next.js 配置
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  NEXT_PUBLIC_HALO_PUBLIC_URL: z.string().url().optional(),
  
  // 监控配置
  ENABLE_MONITORING: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ 环境变量验证失败:');
    result.error.errors.forEach(error => {
      console.error(`  - ${error.path.join('.')}: ${error.message}`);
    });
    process.exit(1);
  }
  
  return result.data;
}

// 在应用启动时验证环境变量
export const env = validateEnv();
```

## 测试配置模板

### Jest 配置
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

### Playwright 配置
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'docker run -p 8090:8090 halohub/halo:2.21',
      port: 8090,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

## 部署配置模板

### Kubernetes 完整配置
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: magic-portfolio

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: halo-config
  namespace: magic-portfolio
data:
  api-url: "https://your-halo-instance.com"
  cache-timeout: "300"
  enable-fallback: "false"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: halo-secret
  namespace: magic-portfolio
type: Opaque
data:
  api-token: <base64-encoded-token>

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: magic-portfolio
  namespace: magic-portfolio
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
        image: ghcr.io/your-username/magic-portfolio:latest
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
        - name: HALO_CACHE_TIMEOUT
          valueFrom:
            configMapKeyRef:
              name: halo-config
              key: cache-timeout
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
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

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: magic-portfolio-service
  namespace: magic-portfolio
spec:
  selector:
    app: magic-portfolio
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: magic-portfolio-ingress
  namespace: magic-portfolio
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: magic-portfolio-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: magic-portfolio-service
            port:
              number: 80
```

这些配置模板为 Magic Portfolio 与 Halo API 的集成提供了完整的基础设施配置，涵盖了开发、测试、部署的各个环节，确保迁移过程的顺利进行。