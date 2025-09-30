// Halo API 类型定义
export interface HaloMetadata {
  name: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  creationTimestamp: string;
  version?: number;
}

export interface HaloListResult<T> {
  first: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  items: T[];
  last: boolean;
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

// 文章相关类型
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
  template?: string;
  owner: string;
  deleted: boolean;
  publish: boolean;
}

export interface HaloPostStatus {
  permalink: string;
  excerpt: string;
  lastModifyTime: string;
  commentsCount: number;
  contributors: string[];
  inProgress: boolean;
  observedVersion?: number;
  phase?: string;
}

export interface HaloPost {
  metadata: HaloMetadata;
  spec: HaloPostSpec;
  status: HaloPostStatus;
  stats?: {
    visit: number;
    upvote: number;
    comment: number;
  };
  content?: {
    content: string;
    raw: string;
  };
  categories?: HaloCategory[];
  tags?: HaloTag[];
  contributors?: HaloContributor[];
  owner?: HaloContributor;
}

// 分类相关类型
export interface HaloCategorySpec {
  displayName: string;
  slug: string;
  description?: string;
  cover?: string;
  template?: string;
  priority: number;
  children?: string[];
}

export interface HaloCategoryStatus {
  permalink: string;
  postCount?: number;
  visiblePostCount?: number;
}

export interface HaloCategory {
  metadata: HaloMetadata;
  spec: HaloCategorySpec;
  status: HaloCategoryStatus;
}

// 标签相关类型
export interface HaloTagSpec {
  displayName: string;
  slug: string;
  color?: string;
  cover?: string;
}

export interface HaloTagStatus {
  permalink: string;
  postCount?: number;
  visiblePostCount?: number;
  observedVersion?: number;
}

export interface HaloTag {
  metadata: HaloMetadata;
  spec: HaloTagSpec;
  status: HaloTagStatus;
}

// 贡献者类型
export interface HaloContributor {
  metadata: HaloMetadata;
  avatar?: string;
  bio?: string;
  displayName: string;
  name: string;
  permalink?: string;
}

// 内容类型
export interface HaloContentVo {
  content: string;
  raw: string;
}

// API 响应类型
export type HaloPostListResponse = HaloListResult<HaloPost>;
export type HaloCategoryListResponse = HaloListResult<HaloCategory>;
export type HaloTagListResponse = HaloListResult<HaloTag>;

// 查询参数类型
export interface HaloPostQueryParams {
  page?: number;
  size?: number;
  sort?: string[];
  labelSelector?: string[];
  fieldSelector?: string[];
}

export interface HaloPostListQueryParams extends HaloPostQueryParams {
  categoryName?: string;
  tagName?: string;
  ownerName?: string;
}