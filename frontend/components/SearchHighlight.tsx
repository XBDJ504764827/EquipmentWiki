interface SearchHighlightProps {
  /** 高亮片段（后端返回，含 <strong> 标签） */
  snippet?: string | null;
  /** 无片段时显示的默认文本 */
  fallback?: string;
  className?: string;
}

/**
 * 高亮片段渲染：
 * 后端返回的 snippet 包含 `<strong>` 匹配标记（如 `设备<strong>通讯异常</strong>...`），
 * 这里用 dangerouslySetInnerHTML 还原高亮效果（内容来自自有后端，安全可控）。
 */
export function SearchHighlight({ snippet, fallback = "—", className }: SearchHighlightProps) {
  if (!snippet) {
    return <span className={className}>{fallback}</span>;
  }
  return (
    <span
      className={className}
      // snippet 由后端生成（自有数据），仅包含 <strong> 标签
      dangerouslySetInnerHTML={{ __html: snippet }}
    />
  );
}
