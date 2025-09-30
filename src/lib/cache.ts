import { unstable_cache } from "next/cache";
import { hybridDataService, type DataSourceOptions } from "@/services/hybrid-data-service";
import type { LocalPost } from "@/lib/adapters/post-adapter";

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  posts: {
    revalidate: Number(process.env.HALO_CACHE_TIMEOUT) || 300, // 5分钟
    tags: ["posts"],
  },
  post: {
    revalidate: Number(process.env.HALO_CACHE_TIMEOUT) || 300, // 5分钟
    tags: ["post"],
  },
  categories: {
    revalidate: 1800, // 30分钟
    tags: ["categories"],
  },
};

/**
 * 缓存的文章列表获取
 */
export const getCachedPosts = unstable_cache(
  async (options: DataSourceOptions = {}) => {
    try {
      return await hybridDataService.getPosts(options);
    } catch (error) {
      console.error("Failed to fetch cached posts:", error);
      return [];
    }
  },
  ["halo-posts"],
  CACHE_CONFIG.posts
);

/**
 * 缓存的单个文章获取
 */
export const getCachedPost = unstable_cache(
  async (slug: string): Promise<LocalPost | null> => {
    try {
      return await hybridDataService.getPostBySlug(slug);
    } catch (error) {
      console.error("Failed to fetch cached post:", error);
      return null;
    }
  },
  ["halo-post"],
  CACHE_CONFIG.post
);

/**
 * 缓存的最新文章获取
 */
export const getCachedLatestPosts = unstable_cache(
  async (limit = 5): Promise<LocalPost[]> => {
    try {
      return await hybridDataService.getPosts({ range: [1, limit] });
    } catch (error) {
      console.error("Failed to fetch cached latest posts:", error);
      return [];
    }
  },
  ["halo-latest-posts"],
  CACHE_CONFIG.posts
);

/**
 * 缓存的分类文章获取
 */
export const getCachedPostsByCategory = unstable_cache(
  async (category: string, options: DataSourceOptions = {}): Promise<LocalPost[]> => {
    try {
      return await hybridDataService.getPosts({ ...options, category });
    } catch (error) {
      console.error("Failed to fetch cached posts by category:", error);
      return [];
    }
  },
  ["halo-posts-by-category"],
  CACHE_CONFIG.posts
);

/**
 * 缓存的标签文章获取
 */
export const getCachedPostsByTag = unstable_cache(
  async (tag: string, options: DataSourceOptions = {}): Promise<LocalPost[]> => {
    try {
      return await hybridDataService.getPosts({ ...options, tag });
    } catch (error) {
      console.error("Failed to fetch cached posts by tag:", error);
      return [];
    }
  },
  ["halo-posts-by-tag"],
  CACHE_CONFIG.posts
);

/**
 * 手动缓存失效
 */
export async function revalidateCache(tag: string): Promise<void> {
  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(tag);
    console.log(`✅ Cache invalidated for tag: ${tag}`);
  } catch (error) {
    console.error("Failed to revalidate cache:", error);
  }
}

/**
 * 清除所有相关缓存
 */
export async function clearAllCaches(): Promise<void> {
  const tags = ["posts", "post", "categories"];
  
  for (const tag of tags) {
    await revalidateCache(tag);
  }
  
  console.log("✅ All caches cleared");
}

/**
 * 预热缓存
 */
export async function warmupCache(): Promise<void> {
  try {
    console.log("🔥 Warming up cache...");
    
    // 预热最新文章
    await getCachedLatestPosts(10);
    
    // 预热文章列表
    await getCachedPosts({ range: [1, 20] });
    
    console.log("✅ Cache warmed up successfully");
  } catch (error) {
    console.error("Failed to warm up cache:", error);
  }
}