import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const components: Components = {
  h1: ({ children }) => <h1 className="mb-4 mt-6 text-2xl font-semibold tracking-tight text-slate-100 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-semibold text-slate-100 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-medium text-slate-200 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mb-4 leading-7 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6">{children}</ol>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-blue-400 underline decoration-blue-500/40 underline-offset-4 hover:text-blue-300">{children}</a>,
  pre: ({ children }) => <pre tabIndex={0} aria-label="Code block" className="mb-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-relaxed [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
  code: ({ className, children }) => <code className={`${className ?? ''} rounded bg-slate-800 px-1 py-0.5 font-mono text-[0.9em]`}>{children}</code>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-blue-500/40 pl-4 text-slate-400">{children}</blockquote>,
  hr: () => <hr className="my-6 border-slate-800" />,
  table: ({ children }) => <div tabIndex={0} aria-label="Markdown table" className="mb-4 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
  th: ({ children }) => <th className="border border-slate-700 bg-slate-800/40 px-3 py-2 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border border-slate-800 px-3 py-2 align-top">{children}</td>,
  img: ({ src, alt }) => <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" className="my-4 max-w-full rounded-xl" />,
}

export const NoteMarkdown = memo(function NoteMarkdown({ content }: { content: string }) {
  return <div className="min-w-0 break-words text-base text-slate-300 [overflow-wrap:anywhere]">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>
  </div>
})
