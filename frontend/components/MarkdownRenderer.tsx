import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github.css";

interface MarkdownRendererProps {
  /** Markdown 原文 */
  content: string;
}

/**
 * Markdown 渲染器：
 * - remark-gfm：GFM 支持（表格、任务列表、删除线等）
 * - rehype-highlight：代码块语法高亮（highlight.js，github 主题）
 * - 图片/链接自动新窗口打开
 *
 * 组件为服务端渲染（无 "use client"），对 SEO 友好。
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          // 图片自适应宽度
          img: ({ ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...props} className="max-w-full rounded-md" alt={props.alt ?? ""} />
          ),
          // 链接新窗口打开
          a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
