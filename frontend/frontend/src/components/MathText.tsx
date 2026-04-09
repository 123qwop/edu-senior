/**
 * Renders mixed text + LaTeX using KaTeX.
 * - Inline math: $...$  e.g. Solve $x^2 + 5x = 0$
 * - Display math: $$...$$ (centered block)
 * - Text without $ is shown as-is (no accidental math).
 * - Unclosed $ is treated as a literal dollar sign to reduce surprises with currency.
 */
import { useMemo } from 'react'
import { Box, type SxProps, type Theme } from '@mui/material'
import katex from 'katex'

export type MathTextProps = {
  /** Raw string from DB / user input (LaTeX in $...$ or $$...$$) */
  text: string | null | undefined
  /** MUI sx on the outer wrapper */
  sx?: SxProps<Theme>
  /** Use for question stems so $$...$$ can use full width */
  block?: boolean
}

type Segment = { type: 'text'; value: string } | { type: 'math'; value: string; display: boolean }

function splitMath(input: string): Segment[] {
  const segments: Segment[] = []
  let i = 0
  while (i < input.length) {
    if (input[i] === '$' && input[i + 1] === '$') {
      const end = input.indexOf('$$', i + 2)
      if (end === -1) {
        segments.push({ type: 'text', value: input.slice(i) })
        break
      }
      segments.push({ type: 'math', value: input.slice(i + 2, end).trim(), display: true })
      i = end + 2
      continue
    }
    if (input[i] === '$') {
      const end = input.indexOf('$', i + 1)
      if (end === -1) {
        segments.push({ type: 'text', value: input.slice(i, i + 1) })
        i += 1
        continue
      }
      segments.push({ type: 'math', value: input.slice(i + 1, end).trim(), display: false })
      i = end + 1
      continue
    }
    const next = input.indexOf('$', i)
    if (next === -1) {
      segments.push({ type: 'text', value: input.slice(i) })
      break
    }
    if (next > i) {
      segments.push({ type: 'text', value: input.slice(i, next) })
    }
    i = next
  }
  return segments
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderKatex(latex: string, displayMode: boolean): string {
  if (!latex) {
    return ''
  }
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    })
  } catch {
    return `<span class="katex-error">${escapeHtml(latex)}</span>`
  }
}

export default function MathText({ text, sx, block = false }: MathTextProps) {
  const raw = text ?? ''
  const segments = useMemo(() => splitMath(raw), [raw])

  const inner = segments.map((seg, idx) => {
    if (seg.type === 'text') {
      return (
        <span key={idx} style={{ whiteSpace: 'pre-wrap' }}>
          {seg.value}
        </span>
      )
    }
    const html = renderKatex(seg.value, seg.display)
    if (seg.display) {
      return (
        <Box
          key={idx}
          component="span"
          sx={{
            display: 'block',
            my: 1,
            overflowX: 'auto',
            textAlign: 'center',
            '& .katex': { fontSize: '1.1em' },
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    }
    return (
      <span
        key={idx}
        style={{ display: 'inline' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  })

  return (
    <Box
      component={block ? 'div' : 'span'}
      sx={{
        ...sx,
        display: block ? 'block' : 'inline',
        verticalAlign: 'middle',
        '& .katex': { fontSize: '1em' },
      }}
    >
      {inner}
    </Box>
  )
}
