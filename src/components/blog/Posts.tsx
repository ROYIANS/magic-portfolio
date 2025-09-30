import { getCachedPosts, getCachedPostsByCategory, getCachedPostsByTag } from "@/lib/cache";
import { Grid, Text, Column } from "@once-ui-system/core";
import Post from "./Post";

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
  direction,
  category,
  tag,
}: PostsProps) {
  try {
    // 使用缓存的数据获取方法
    let allBlogs;
    
    if (category) {
      allBlogs = await getCachedPostsByCategory(category, { exclude });
    } else if (tag) {
      allBlogs = await getCachedPostsByTag(tag, { exclude });
    } else {
      allBlogs = await getCachedPosts({ exclude });
    }

    // 应用范围过滤
    const displayedBlogs = range
      ? allBlogs.slice(range[0] - 1, range.length === 2 ? range[1] : allBlogs.length)
      : allBlogs;

    return (
      <>
        {displayedBlogs.length > 0 && (
          <Grid columns={columns} s={{ columns: 1 }} fillWidth marginBottom="40" gap="16">
            {displayedBlogs.map((post) => (
              <Post key={post.slug} post={post} thumbnail={thumbnail} direction={direction} />
            ))}
          </Grid>
        )}
        {displayedBlogs.length === 0 && (
          <Column fillWidth horizontal="center" paddingY="64" gap="16">
            <Text variant="heading-strong-m" onBackground="neutral-weak">
              No posts available
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {category && "No posts found in this category."}
              {tag && "No posts found with this tag."}
              {!category && !tag && "No posts have been published yet."}
            </Text>
          </Column>
        )}
      </>
    );
  } catch (error) {
    console.error("Failed to load posts:", error);
    
    // 错误时显示友好的错误状态
    return (
      <Column fillWidth horizontal="center" paddingY="64" gap="16">
        <Text variant="heading-strong-m" onBackground="danger-weak">
          Failed to load posts
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Please check your connection and try again later.
        </Text>
      </Column>
    );
  }
}
