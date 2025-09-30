
# Magic Portfolio + Halo API 使用指南

## 🚀 快速开始

### 步骤 1: 准备 Halo 服务器

1. **安装 Halo CMS**
   ```bash
   # 使用 Docker 快速启动 Halo
   docker run -it -d --name halo -p 8090:8090 -v ~/.halo2:/root/.halo2 halohub/halo:2.21
   ```

2. **完成 Halo 初始化**
   - 访问 `http://localhost:8090/console`
   - 按照向导完成初始化设置
   - 创建管理员账户

3. **创建个人访问令牌**
   - 登录 Halo 管理后台
   - 进入 `用户中心 > 个人令牌`
   - 点击 `新建令牌`，设置名称为 `Magic Portfolio`
   - 复制生成的令牌（格式如 `pat_xxx...`）

### 步骤 2: 配置 Magic Portfolio

1. **设置环境变量**
   ```bash
   # 复制环境变量模板
   cp .env.example .env.local
   
   # 编辑 .env.local 文件
   HALO_API_BASE_URL=http://localhost:8090
   HALO_API_TOKEN=pat_your_token_here
   HALO_ENABLE_FALLBACK=true
   ```

2. **测试连接**
   ```bash
   # 运行 Halo 连接测试
   npm run halo:test
   ```

   预期输出：
   ```
   🚀 Testing Halo API connection...
   ✅ Halo service is healthy
   ✅ API access successful
   📊 Found X posts in total
   🎉 All tests passed! Halo API integration is ready.
   ```

### 步骤 3: 启动开发服务器

```bash
# 启动 Next.js 开发服务器
npm run dev

# 或者强制使用 Halo API（不降级到本地文件）
npm run dev:halo
```

### 步骤 4: 验证集成效果

1. **访问博客页面**
   - 打开 `http://localhost:3000/blog`
   - 应该看到从 Halo API 获取的文章列表

2. **检查健康状态**
   - 访问 `http://localhost:3000/api/halo/health`
   - 应该返回 Halo 连接状态信息

3. **测试文章详情**
   - 点击任意文章链接
   - 验证文章内容正确显示

## 📝 在 Halo 中创建内容

### 创建文章
1. 登录 Halo 管理后台 `http://localhost:8090/console`
2. 进入 `文章 > 所有文章`
3. 点击 `写文章` 按钮
4. 填写文章信息：
   - **标题**: 文章标题
   - **别名**: URL 中使用的 slug
   - **封面图**: 可选的特色图片
   - **摘要**: 文章简介
   - **内容**: 使用 Markdown 或富文本编辑器
5. 设置分类和标签
6. 点击 `发布` 按钮

### 管理分类和标签
1. **创建分类**
   - 进入 `文章 > 分类`
   - 点击 `新建分类`
   - 设置分类名称和别名

2. **创建标签**
   - 进入 `文章 > 标签`
   - 点击 `新建标签`
   - 设置标签名称、别名和颜色

## 🔧 配置说明

### 环境变量详解

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|---------|------|
| `HALO_API_BASE_URL` | Halo 服务器地址 | `http://localhost:8090` | ✅ |
| `HALO_API_TOKEN` | 个人访问令牌 | - | ✅ |
| `HALO_ENABLE_FALLBACK` | 启用本地文件降级 | `true` | ❌ |
| `HALO_CACHE_TIMEOUT` | 缓存过期时间（秒） | `300` | ❌ |

### 运行模式

#### 1. 混合模式（推荐）
```bash
# 优先使用 Halo API，失败时降级到本地文件
npm run dev
```

#### 2. 纯 Halo 模式
```bash
# 只使用 Halo API，不降级
npm run dev:halo
```

#### 3. 纯本地模式
```bash
# 只使用本地 MDX 文件
HALO_ENABLE_FALLBACK=true npm run dev
```

## 🐛 故障排除

### 常见问题

#### 1. 连接测试失败
**症状**: `npm run halo:test` 显示连接错误

**解决方案**:
```bash
# 检查 Halo 服务状态
curl -I http://localhost:8090/actuator/health

# 检查 API 令牌
curl -H "Authorization: Bearer your_token" \
     http://localhost:8090/apis/api.content.halo.run/v1alpha1/posts?size=1
```

#### 2. 页面显示空内容
**症状**: 博客页面没有显示文章

**检查步骤**:
1. 确认 Halo 中已发布文章
2. 检查 API 令牌权限
3. 查看浏览器控制台错误
4. 检查 `/api/halo/health` 端点状态

#### 3. 文章内容格式异常
**症状**: 文章内容显示不正确

**解决方案**:
- 检查 Halo 中的内容格式
- 确认 Markdown 解析正常
- 验证图片链接是否正确

### 调试模式

启用详细日志：
```bash
# 开发环境自动启用调试日志
DEBUG_HALO_API=true npm run dev
```

查看详细错误信息：
```bash
# 查看 Next.js 构建日志
npm run build -- --debug
```

## 📊 监控和维护

### 健康检查
```bash
# 检查系统状态
curl http://localhost:3000/api/halo/health | jq .

# 预期响应
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "status": "healthy",
  "halo": {
    "available": true,
    "connected": true,
    "currentSource": "halo",
    "fallbackEnabled": true
  }
}
```

### 性能监控

访问以下 URL 监控系统性能：
- **健康状态**: `/api/halo/health`
- **文章列表性能**: `/blog` (查看页面加载时间)
- **单篇文章性能**: `/blog/your-post-slug`

### 缓存管理

Magic Portfolio 使用 Next.js 的内置缓存：
- **文章列表**: 5分钟缓存
- **单个文章**: 5分钟缓存
- **分类标签**: 30分钟缓存

缓存会在以下情况自动更新：
- 达到过期时间
- Halo 中内容有更新
- 手动重启开发服务器

## 🎯 生产环境部署

### 环境变量设置
```bash
# .env.production
HALO_API_BASE_URL=https://your-halo-domain.com
HALO_API_TOKEN=pat_production_token
HALO_ENABLE_FALLBACK=false
HALO_CACHE_TIMEOUT=600
```

### 构建和部署
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

### 性能优化建议
1. **CDN 配置**: 为静态资源配置 CDN
2. **缓存策略**: 根据内容更