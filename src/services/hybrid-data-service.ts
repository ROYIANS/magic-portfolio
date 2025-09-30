import { HaloPostService } from "./halo-post-service";
import { PostAdapter, type LocalPost } from "@/lib/adapters/post-adapter";
import { getPosts } from "@/utils/utils";
import { isHaloAvailable, haloClient } from "@/lib/halo-client";

export interface DataSourceOptions {
  range?: [number] | [number, number];
  columns?: "1" | "2" | "3";
  thumbnail?: boolean;
  direction?: "row" | "column";
  exclude?: string[];
  category?: string;
  tag?: string;
}

/**
 * 混合数据源服务
 * 优先使用 Halo API，在不可用时降级到本地文件系统
 */
export class HybridDataService {
  private haloService: HaloPostService;
  private enableFallback: boolean;

  constructor() {
    this.haloService = new HaloPostService();
    this.enableFallback = process.env.HALO_ENABLE_FALLBACK === "true";
  }

  /**
   * 获取文章列表（支持降级）
   */
  async getPosts(options: DataSourceOptions = {}): Promise<LocalPost[]> {
    // 优先尝试 Halo API
    if (isHaloAvailable) {
      try {
        const posts = await this.haloService.getPosts({
          categoryName: options.category,
          tagName: options.tag,
          size: 100, // 获取足够的数据进行前端过滤
        });

        return this.applyClientFilters(posts, options);
      } catch (error) {
        console.warn("Halo API failed, attempting fallback:", error);
        
        if (!this.enableFallback) {
          throw error;
        }
      }
    }

    // 降级到本地文件系统
    if (this.enableFallback) {
      console.log("📁 Using local file system as fallback");
      return this.getLocalPosts(options);
    }

    throw new Error("Both Halo API and local fallback are unavailable");
  }

  /**
   * 获取单个文章（支持降级）
   */
  async getPostBySlug(slug: string): Promise<LocalPost | null> {
    // 优先尝试 Halo API
    if (isHaloAvailable) {
      try {
        return await this.haloService.getPostBySlug(slug);
      } catch (error) {
        console.warn("Halo API failed for single post, attempting fallback:", error);
        
        if (!this.enableFallback) {
          throw error;
        }
      }
    }

    // 降级到本地文件系统
    if (this.enableFallback) {
      const localPosts = this.getLocalPosts();
      return localPosts.find(post => post.slug === slug) || null;
    }

    throw new Error("Both Halo API and local fallback are unavailable");
  }

  /**
   * 从本地文件系统获取文章
   */
  private getLocalPosts(options: DataSourceOptions = {}): LocalPost[] {
    try {
      const posts = getPosts(["src", "app", "blog", "posts"]);
      return this.applyClientFilters(posts, options);
    } catch (error) {
      console.error("Local file system also failed:", error);
      return [];
    }
  }

  /**
   * 应用客户端过滤器
   */
  private applyClientFilters(posts: LocalPost[], options: DataSourceOptions): LocalPost[] {
    let filteredPosts = [...posts];

    // 排除指定文章
    if (options.exclude && options.exclude.length > 0) {
      filteredPosts = filteredPosts.filter(
        (post) => !options.exclude!.includes(post.slug)
      );
    }

    // 按发布日期排序
    filteredPosts.sort((a, b) => {
      return new Date(b.metadata.publishedAt).getTime() - 
             new Date(a.metadata.publishedAt).getTime();
    });

    // 应用范围切片
    if (options.range) {
      const [start, end] = options.range;
      filteredPosts = filteredPosts.slice(
        start - 1, 
        options.range.length === 2 ? end : filteredPosts.length
      );
    }

    return filteredPosts;
  }

  /**
   * 获取数据源状态
   */
  getDataSourceStatus(): {
    haloAvailable: boolean;
    fallbackEnabled: boolean;
    currentSource: "halo" | "local" | "unavailable";
  } {
    const haloAvailable = isHaloAvailable;
    const fallbackEnabled = this.enableFallback;

    let currentSource: "halo" | "local" | "unavailable";
    if (haloAvailable) {
      currentSource = "halo";
    } else if (fallbackEnabled) {
      currentSource = "local";
    } else {
      currentSource = "unavailable";
    }

    return {
      haloAvailable,
      fallbackEnabled,
      currentSource,
    };
  }

  /**
   * 测试 Halo API 连接
   */
  async testHaloConnection(): Promise<boolean> {
    if (!haloClient) return false;

    try {
      return await haloClient.testConnection();
    } catch (error) {
      console.error("Halo connection test failed:", error);
      return false;
    }
  }
}

// 单例实例
export const hybridDataService = new HybridDataService();