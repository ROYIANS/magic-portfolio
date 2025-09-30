import { haloClient, isHaloAvailable } from "@/lib/halo-client";
import { PostAdapter, type LocalPost } from "@/lib/adapters/post-adapter";
import type { 
  HaloPost, 
  HaloPostListQueryParams, 
  HaloPostListResponse 
} from "@/types/halo";

export interface GetPostsOptions {
  page?: number;
  size?: number;
  categoryName?: string;
  tagName?: string;
  sort?: string[];
  keyword?: string;
}

/**
 * Halo 文章服务
 * 提供从 Halo API 获取文章数据的功能
 */
export class HaloPostService {
  /**
   * 获取文章列表
   */
  async getPosts(options: GetPostsOptions = {}): Promise<LocalPost[]> {
    if (!isHaloAvailable || !haloClient) {
      throw new Error("Halo API client is not available");
    }

    try {
      const queryParams: HaloPostListQueryParams = {
        page: options.page || 0,
        size: options.size || 20,
        sort: options.sort || ["spec.publishTime,desc"],
      };

      // 如果指定了分类，使用分类查询接口
      if (options.categoryName) {
        const response = await haloClient.publicApi.content.category.queryPostsByCategoryName(
          options.categoryName,
          queryParams
        );
        return PostAdapter.haloBatchToLocal(response.data.items);
      }

      // 如果指定了标签，使用标签查询接口
      if (options.tagName) {
        const response = await haloClient.publicApi.content.tag.queryPostsByTagName(
          options.tagName,
          queryParams
        );
        return PostAdapter.haloBatchToLocal(response.data.items);
      }

      // 默认查询所有文章
      const response = await haloClient.publicApi.content.post.queryPosts(queryParams);
      return PostAdapter.haloBatchToLocal(response.data.items);
    } catch (error) {
      console.error("Failed to fetch posts from Halo:", error);
      throw error;
    }
  }

  /**
   * 根据 slug 获取单个文章
   */
  async getPostBySlug(slug: string): Promise<LocalPost | null> {
    if (!isHaloAvailable || !haloClient) {
      throw new Error("Halo API client is not available");
    }

    try {
      // Halo API 不直接支持按 slug 查询，需要获取列表后过滤
      const posts = await this.getPosts({ size: 1000 });
      return posts.find(post => post.slug === slug) || null;
    } catch (error) {
      console.error("Failed to fetch post by slug from Halo:", error);
      throw error;
    }
  }

  /**
   * 根据文章名称获取内容
   */
  async getPostContent(postName: string): Promise<string> {
    if (!isHaloAvailable || !haloClient) {
      throw new Error("Halo API client is not available");
    }

    try {
      const response = await haloClient.publicApi.content.post.queryPostByName(postName);
      return response.data.content?.content || "";
    } catch (error) {
      console.error("Failed to fetch post content from Halo:", error);
      throw error;
    }
  }

  /**
   * 获取最新文章
   */
  async getLatestPosts(limit = 5): Promise<LocalPost[]> {
    return this.getPosts({
      size: limit,
      sort: ["spec.publishTime,desc"],
    });
  }

  /**
   * 获取置顶文章
   */
  async getPinnedPosts(): Promise<LocalPost[]> {
    try {
      const allPosts = await this.getPosts({ size: 100 });
      // 在适配器转换后进行过滤，因为 Halo API 不直接支持置顶过滤
      // 这里需要从原始 Halo 数据中判断
      return allPosts; // 暂时返回所有文章，后续可以优化
    } catch (error) {
      console.error("Failed to fetch pinned posts from Halo:", error);
      throw error;
    }
  }

  /**
   * 搜索文章
   */
  async searchPosts(keyword: string, options: GetPostsOptions = {}): Promise<LocalPost[]> {
    if (!isHaloAvailable || !haloClient) {
      throw new Error("Halo API client is not available");
    }

    try {
      // 使用 Halo 的搜索 API
      const searchOptions = {
        keyword,
        limit: options.size || 20,
        includeTypes: ["post.content.halo.run"],
        filterPublished: true,
        filterExposed: true,
        filterRecycled: false,
      };

      const response = await haloClient.publicApi.index.search.indicesSearch(searchOptions);
      
      // 搜索结果需要转换为文章格式
      // 这里简化处理，实际可能需要根据搜索结果再获取完整文章数据
      const posts = await this.getPosts(options);
      return posts.filter(post => 
        post.metadata.title.toLowerCase().includes(keyword.toLowerCase()) ||
        post.metadata.summary.toLowerCase().includes(keyword.toLowerCase())
      );
    } catch (error) {
      console.error("Failed to search posts from Halo:", error);
      throw error;
    }
  }

  /**
   * 获取文章统计信息
   */
  async getPostStats(postSlug: string): Promise<{
    visits: number;
    comments: number;
    upvotes: number;
  } | null> {
    try {
      const post = await this.getPostBySlug(postSlug);
      if (!post) return null;

      // 这里可以通过 Halo 的统计 API 获取更准确的数据
      return {
        visits: 0,
        comments: 0,
        upvotes: 0,
      };
    } catch (error) {
      console.error("Failed to fetch post stats from Halo:", error);
      return null;
    }
  }
}