import type { HaloPost, HaloCategory, HaloTag, HaloContributor } from "@/types/halo";

// 现有的文章数据格式（与 utils.ts 保持一致）
export interface LocalPostMetadata {
  title: string;
  publishedAt: string;
  summary: string;
  image?: string;
  images: string[];
  tag?: string;
  team: Array<{
    name: string;
    role: string;
    avatar: string;
    linkedIn: string;
  }>;
  link?: string;
}

export interface LocalPost {
  metadata: LocalPostMetadata;
  slug: string;
  content: string;
}

/**
 * 文章数据适配器
 * 将 Halo API 的数据格式转换为 Magic Portfolio 的本地格式
 */
export class PostAdapter {
  /**
   * 将 Halo 文章数据转换为本地格式
   */
  static haloToLocal(haloPost: HaloPost): LocalPost {
    return {
      slug: haloPost.spec.slug,
      metadata: {
        title: haloPost.spec.title,
        publishedAt: haloPost.spec.publishTime || haloPost.metadata.creationTimestamp,
        summary: haloPost.status.excerpt || haloPost.spec.excerpt.raw || "",
        image: haloPost.spec.cover,
        images: PostAdapter.extractImagesFromContent(haloPost.content?.content),
        tag: haloPost.spec.tags?.[0], // 取第一个标签，保持与现有结构兼容
        team: PostAdapter.extractTeamFromContributors(haloPost.contributors),
        link: haloPost.status.permalink,
      },
      content: haloPost.content?.content || "",
    };
  }

  /**
   * 从 HTML 内容中提取图片链接
   */
  private static extractImagesFromContent(content?: string): string[] {
    if (!content) return [];

    const imageRegex = /<img[^>]+src="([^">]+)"/g;
    const images: string[] = [];
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      images.push(match[1]);
    }

    return images;
  }

  /**
   * 将 Halo 贡献者转换为团队成员格式
   */
  private static extractTeamFromContributors(
    contributors?: HaloContributor[]
  ): Array<{
    name: string;
    role: string;
    avatar: string;
    linkedIn: string;
  }> {
    if (!contributors || contributors.length === 0) return [];

    return contributors.map((contributor) => ({
      name: contributor.displayName,
      role: "Contributor", // 默认角色
      avatar: contributor.avatar || "/images/avatar.jpg",
      linkedIn: "", // Halo 中没有直接的 LinkedIn 字段
    }));
  }

  /**
   * 批量转换文章列表
   */
  static haloBatchToLocal(haloPosts: HaloPost[]): LocalPost[] {
    return haloPosts.map(this.haloToLocal);
  }
}

/**
 * 分类数据适配器
 */
export class CategoryAdapter {
  static haloToLocal(haloCategory: HaloCategory) {
    return {
      name: haloCategory.metadata.name,
      displayName: haloCategory.spec.displayName,
      slug: haloCategory.spec.slug,
      description: haloCategory.spec.description,
      permalink: haloCategory.status.permalink,
      postCount: haloCategory.status.postCount || 0,
      cover: haloCategory.spec.cover,
    };
  }

  static haloBatchToLocal(haloCategories: HaloCategory[]) {
    return haloCategories.map(this.haloToLocal);
  }
}

/**
 * 标签数据适配器
 */
export class TagAdapter {
  static haloToLocal(haloTag: HaloTag) {
    return {
      name: haloTag.metadata.name,
      displayName: haloTag.spec.displayName,
      slug: haloTag.spec.slug,
      color: haloTag.spec.color,
      permalink: haloTag.status.permalink,
      postCount: haloTag.status.postCount || 0,
      cover: haloTag.spec.cover,
    };
  }

  static haloBatchToLocal(haloTags: HaloTag[]) {
    return haloTags.map(this.haloToLocal);
  }
}