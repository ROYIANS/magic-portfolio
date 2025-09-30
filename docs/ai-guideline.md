# AI 编程指南 - Magic Portfolio 最佳实践

## 概述

本文档为 Magic Portfolio 项目制定了完整的编程规范和最佳实践指南，确保 AI 助手和开发者在编写代码时保持一致性，符合项目的设计理念和技术标准。

## 1. 项目哲学与设计原则

### 设计理念
- **简洁优雅**: 优先考虑简洁、直观的解决方案
- **配置驱动**: 通过配置文件管理内容，而非硬编码
- **类型安全**: 利用 TypeScript 确保代码的类型安全
- **性能优先**: 利用 Next.js 的静态生成和优化特性
- **渐进增强**: 确保基础功能在没有 JavaScript 的情况下仍可用

### Once UI 设计系统原则
- **一致性**: 使用 Once UI 组件确保视觉和交互一致性
- **响应式**: 所有组件都应支持响应式设计
- **可访问性**: 遵循 ARIA 标准和可访问性最佳实践
- **模块化**: 组件应该是独立的、可复用的

## 2. TypeScript 编码规范

### 类型定义规范

```typescript
// ✅ 正确：明确的接口定义
interface PostProps {
  range?: [number] | [number, number];
  columns?: "1" | "2" | "3";
  thumbnail?: boolean;
  direction?: "row" | "column";
  exclude?: string[];
}

// ✅ 正确：使用联合类型限制取值
type ThemeMode = "light" | "dark" | "system";

// ✅ 正确：扩展基础接口
interface About extends BasePageConfig {
  tableOfContent: {
    display: boolean;
    subItems: boolean;
  };
}
```

### 组件类型约定

```typescript
// ✅ 正确：React 函数组件定义
export const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2 = defaultValue,
  ...props
}) => {
  // 组件逻辑
  return <div>{/* JSX */}</div>;
};

// ✅ 正确：使用泛型约束
type IconName = keyof typeof icons;

// ✅ 正确：路径类型约束
type ImagePath = `/images/${string}`;
```

### 导入导出规范

```typescript
// ✅ 正确：明确的导入语句
import { Heading, Text, Button } from "@once-ui-system/core";
import { person, social } from "@/resources";
import styles from "./Component.module.scss";

// ✅ 正确：统一的导出方式
export { ComponentName };
export type { ComponentProps };
```

## 3. React 组件开发规范

### 组件结构模式

```typescript
"use client"; // 仅在需要客户端功能时使用

import React, { useEffect, useState } from "react";
import { ComponentFromOnceUI } from "@once-ui-system/core";
import { resourceImports } from "@/resources";
import styles from "./Component.module.scss";

// 类型定义
interface ComponentProps {
  required: string;
  optional?: boolean;
}

// 主组件
export const ComponentName: React.FC<ComponentProps> = ({
  required,
  optional = false,
}) => {
  // Hooks（按顺序：状态、副作用、自定义 hooks）
  const [state, setState] = useState("");

  useEffect(() => {
    // 副作用逻辑
  }, []);

  // 事件处理函数
  const handleEvent = () => {
    // 事件处理逻辑
  };

  // 渲染逻辑
  return (
    <ComponentFromOnceUI>
      {/* JSX 内容 */}
    </ComponentFromOnceUI>
  );
};
```

### 组件命名约定

- **组件文件**: PascalCase (如 `Header.tsx`)
- **组件名称**: PascalCase (如 `export const Header`)
- **Props 接口**: `ComponentNameProps` (如 `HeaderProps`)
- **样式文件**: `Component.module.scss`

### 条件渲染模式

```typescript
// ✅ 正确：使用 && 进行条件渲染
{display.themeSwitcher && (
  <ThemeToggle />
)}

// ✅ 正确：复杂条件使用三元运算符
{isAuthenticated ? (
  <AuthenticatedContent />
) : (
  <LoginForm />
)}

// ✅ 正确：多条件渲染
{routes["/about"] && (
  <>
    <Row s={{ hide: true }}>
      <ToggleButton
        prefixIcon="person"
        href="/about"
        label={about.label}
        selected={pathname === "/about"}
      />
    </Row>
    <Row hide s={{ hide: false }}>
      <ToggleButton
        prefixIcon="person"
        href="/about"
        selected={pathname === "/about"}
      />
    </Row>
  </>
)}
```

## 4. Once UI 组件使用规范

### 布局组件使用

```typescript
// ✅ 正确：使用 Once UI 布局组件
<Column fillWidth gap="xl" paddingY="12" horizontal="center">
  <Row gap="16" vertical="center">
    <Flex flex={1} paddingLeft="l">
      <Heading as="h2" variant="display-strong-xs">
        标题内容
      </Heading>
    </Flex>
  </Row>
</Column>

// ✅ 正确：响应式属性
<Grid
  columns="3"
  s={{ columns: 1 }}
  fillWidth
  gap="16"
>
  {items.map(item => <Item key={item.id} />)}
</Grid>
```

### 组件属性规范

```typescript
// ✅ 正确：文本变体使用
<Text variant="body-default-s" onBackground="neutral-weak">
  {description}
</Text>

// ✅ 正确：按钮配置
<Button
  variant="secondary"
  size="m"
  weight="default"
  arrowIcon
  href="/about"
>
  按钮文本
</Button>

// ✅ 正确：图标按钮
<IconButton
  icon="github"
  tooltip="GitHub"
  size="s"
  variant="ghost"
  href={socialLink}
/>
```

### 动画效果使用

```typescript
// ✅ 正确：RevealFx 动画效果
<RevealFx
  translateY="4"
  delay={0.2}
  fillWidth
  horizontal="center"
>
  <Heading variant="display-strong-l">
    {title}
  </Heading>
</RevealFx>
```

## 5. 样式和 SCSS 规范

### SCSS 模块化规范

```scss
// Component.module.scss
@use "./breakpoints.scss" as breakpoints;

.componentName {
  // 样式规则
  pointer-events: none;
  backdrop-filter: blur(0.5rem);

  // 嵌套规则
  &:hover {
    opacity: 0.8;
  }
}

// 响应式断点使用
@media (max-width: breakpoints.$s) {
  .componentName {
    // 小屏幕样式
  }
}
```

### CSS 变量使用

```scss
// ✅ 正确：使用 Once UI 的 CSS 变量
.custom-element {
  background: var(--page-background);
  color: var(--neutral-on-background-weak);
  border: 1px solid var(--neutral-alpha-weak);
}

// ✅ 正确：自定义颜色方案（在 custom.css 中）
:root {
  --scheme-brand-600: #5071cc;
  --scheme-accent-600: #8a989f;
}
```

### 响应式断点

```scss
// 标准断点
$s: 768px;   // 小屏幕（手机）
$m: 1024px;  // 中等屏幕（平板）
$l: 1440px;  // 大屏幕（桌面）

// 使用方式
@media (max-width: #{$s}) {
  // 移动端样式
}
```

## 6. 配置管理规范

### 内容配置结构

```typescript
// src/resources/content.tsx
const person: Person = {
  firstName: "Name",
  lastName: "Surname",
  name: "Display Name",
  role: "Job Title",
  avatar: "/images/avatar.jpg",
  email: "email@example.com",
  location: "Asia/Jakarta", // IANA 时区
  languages: ["English", "Chinese"],
};

// ✅ 正确：类型安全的配置
const home: Home = {
  path: "/",
  image: "/images/og/home.jpg",
  label: "Home",
  title: `${person.name}'s Portfolio`,
  description: `Portfolio description`,
  headline: <>Building amazing things</>,
  featured: {
    display: true,
    title: <>Featured Project</>,
    href: "/work/project-slug",
  },
  subline: <>Detailed description</>,
};
```

### Once UI 配置规范

```typescript
// src/resources/once-ui.config.ts
const routes: RoutesConfig = {
  "/": true,
  "/about": true,
  "/work": true,
  "/blog": true,
  "/gallery": false, // 明确禁用
};

const style: StyleConfig = {
  theme: "system", // dark | light | system
  neutral: "gray", // 中性色
  brand: "cyan",   // 品牌色
  accent: "red",   // 强调色
  // ... 其他配置
};
```

## 7. 数据获取和处理规范

### 文件系统数据处理

```typescript
// ✅ 正确：博客文章获取
export function Posts({
  range,
  columns = "1",
  thumbnail = false,
  exclude = [],
}: PostsProps) {
  let allBlogs = getPosts(["src", "app", "blog", "posts"]);

  // 排除指定文章
  if (exclude.length) {
    allBlogs = allBlogs.filter((post) => !exclude.includes(post.slug));
  }

  // 按发布日期排序
  const sortedBlogs = allBlogs.sort((a, b) => {
    return new Date(b.metadata.publishedAt).getTime() -
           new Date(a.metadata.publishedAt).getTime();
  });

  // 范围切片
  const displayedBlogs = range
    ? sortedBlogs.slice(range[0] - 1, range.length === 2 ? range[1] : sortedBlogs.length)
    : sortedBlogs;

  return (
    <Grid columns={columns} s={{ columns: 1 }}>
      {displayedBlogs.map((post) => (
        <Post key={post.slug} post={post} thumbnail={thumbnail} />
      ))}
    </Grid>
  );
}
```

## 8. API 路由规范

### 路由处理模式

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 处理逻辑
    const data = await fetchData();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证数据
    if (!body.required) {
      return NextResponse.json(
        { error: "Missing required field" },
        { status: 400 }
      );
    }

    // 处理逻辑
    const result = await processData(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

## 9. SEO 和元数据规范

### 元数据生成模式

```typescript
// ✅ 正确：页面元数据生成
export async function generateMetadata() {
  return Meta.generate({
    title: page.title,
    description: page.description,
    baseURL: baseURL,
    path: page.path,
    image: page.image,
  });
}

// ✅ 正确：结构化数据
<Schema
  as="webPage"
  baseURL={baseURL}
  path={page.path}
  title={page.title}
  description={page.description}
  image={`/api/og/generate?title=${encodeURIComponent(page.title)}`}
  author={{
    name: person.name,
    url: `${baseURL}${about.path}`,
    image: `${baseURL}${person.avatar}`,
  }}
/>
```

## 10. 性能优化规范

### 图片优化

```typescript
// ✅ 正确：图片组件使用
<Carousel
  sizes="(max-width: 960px) 100vw, 960px"
  items={images.map((image) => ({
    slide: image,
    alt: title,
  }))}
/>

// ✅ 正确：Avatar 组件
<Avatar
  src={person.avatar}
  size="m"
  priority={isAboveTheFold}
/>
```

### 懒加载和代码分割

```typescript
// ✅ 正确：动态导入
const DynamicComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <Spinner />,
});

// ✅ 正确：条件加载
{shouldLoadComponent && (
  <Suspense fallback={<Spinner />}>
    <HeavyComponent />
  </Suspense>
)}
```

## 11. 错误处理和用户体验

### 加载状态处理

```typescript
// ✅ 正确：加载状态
if (loading) {
  return (
    <Flex fillWidth paddingY="128" horizontal="center">
      <Spinner />
    </Flex>
  );
}

// ✅ 正确：错误状态
if (error) {
  return (
    <Column paddingY="128" gap="24" center>
      <Heading>Something went wrong</Heading>
      <Text onBackground="neutral-weak">{error.message}</Text>
      <Button onClick={retry}>Try again</Button>
    </Column>
  );
}
```

### 表单验证

```typescript
// ✅ 正确：表单处理
const [error, setError] = useState<string | undefined>();

const handleSubmit = async () => {
  try {
    // 验证逻辑
    if (!password) {
      setError("Password is required");
      return;
    }

    // 提交逻辑
    await submitForm(password);
    setError(undefined);
  } catch (err) {
    setError("Submission failed");
  }
};
```

## 12. 可访问性规范

### ARIA 和语义化

```typescript
// ✅ 正确：语义化 HTML
<Column as="main" role="main">
  <Heading as="h1" id="page-title">
    页面标题
  </Heading>
</Column>

// ✅ 正确：ARIA 标签
<ToggleButton
  prefixIcon="theme"
  onClick={toggleTheme}
  aria-label={`Switch to ${nextTheme} mode`}
/>

// ✅ 正确：焦点管理
<Button
  id="primary-action"
  autoFocus={shouldFocus}
>
  主要操作
</Button>
```

## 13. 测试和质量保证

### 组件测试模式

```typescript
// ✅ 正确：组件测试结构
describe("ComponentName", () => {
  it("renders correctly with required props", () => {
    render(<ComponentName required="value" />);
    expect(screen.getByText("value")).toBeInTheDocument();
  });

  it("handles user interactions", async () => {
    const user = userEvent.setup();
    render(<ComponentName onAction={mockAction} />);

    await user.click(screen.getByRole("button"));
    expect(mockAction).toHaveBeenCalled();
  });
});
```

## 14. 部署和环境配置

### 环境变量管理

```typescript
// ✅ 正确：环境变量使用
const baseURL = process.env.NODE_ENV === "production"
  ? "https://your-domain.com"
  : "http://localhost:3000";

// ✅ 正确：类型安全的环境变量
interface EnvironmentConfig {
  baseURL: string;
  pageAccessPassword?: string;
}

const config: EnvironmentConfig = {
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  pageAccessPassword: process.env.PAGE_ACCESS_PASSWORD,
};
```

## 15. 常见问题和解决方案

### Hydration 问题

```typescript
// ✅ 正确：避免 hydration 不匹配
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) {
  return null; // 或者返回占位符
}
```

### 主题切换

```typescript
// ✅ 正确：主题切换实现
const { theme, setTheme } = useTheme();
const [currentTheme, setCurrentTheme] = useState("light");

useEffect(() => {
  setCurrentTheme(
    document.documentElement.getAttribute("data-theme") || "light"
  );
}, [theme]);
```

## 16. 代码审查检查清单

### 提交前检查项

- [ ] 所有组件都有适当的 TypeScript 类型
- [ ] 使用了 Once UI 组件而非原生 HTML 元素
- [ ] 响应式设计已实现 (`s={{}}` 属性)
- [ ] 可访问性标签已添加
- [ ] 性能优化已考虑（图片、懒加载）
- [ ] 错误处理已实现
- [ ] 代码已通过 Biome 格式化
- [ ] 符合命名约定
- [ ] 配置化而非硬编码
- [ ] 适当的注释和文档

### 性能检查项

- [ ] 避免不必要的重新渲染
- [ ] 正确使用 `useMemo` 和 `useCallback`
- [ ] 图片使用了适当的尺寸和格式
- [ ] 动态导入重组件
- [ ] CSS 模块化，避免全局样式冲突

## 结语

遵循本指南将确保 Magic Portfolio 项目的代码质量、一致性和可维护性。所有开发者和 AI 助手都应严格按照这些规范进行开发，以创造出色的用户体验和可靠的技术解决方案。

记住：**简洁、类型安全、性能优先、用户体验至上**。