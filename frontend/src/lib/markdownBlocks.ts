// Small parser for the constrained Markdown the resume prompt produces (headings, bullets,
// paragraphs, **bold**, *italic*, `code`). Shared by the DOCX export and the diff view.

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

export type BlockKind = 'h1' | 'h2' | 'h3' | 'bullet' | 'paragraph' | 'code';

export interface Block {
  kind: BlockKind;
  runs: Run[];
}

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

export function parseInline(text: string): Run[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map(part => {
      if (/^(\*\*|__).+\1$/.test(part)) return { text: part.slice(2, -2), bold: true };
      if (/^`.+`$/.test(part)) return { text: part.slice(1, -1), code: true };
      if (/^([*_]).+\1$/.test(part)) return { text: part.slice(1, -1), italic: true };
      return { text: part };
    });
}

export function parseMarkdownBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let inFence = false;

  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      blocks.push({ kind: 'code', runs: [{ text: line, code: true }] });
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || /^(-{3,}|\*{3,})$/.test(trimmed)) continue;

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({ kind: (['h1', 'h2', 'h3'] as const)[heading[1].length - 1], runs: parseInline(heading[2]) });
      continue;
    }
    const bullet = /^[-*+•]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      blocks.push({ kind: 'bullet', runs: parseInline(bullet[1]) });
      continue;
    }
    blocks.push({ kind: 'paragraph', runs: parseInline(trimmed) });
  }
  return blocks;
}

/** Readable plain text (bullets as "• ") — used to diff a Markdown rewrite against a plain-text original. */
export function markdownToPlainText(markdown: string): string {
  return parseMarkdownBlocks(markdown)
    .map(block => {
      const text = block.runs.map(r => r.text).join('');
      if (block.kind === 'bullet') return `• ${text}`;
      if (block.kind === 'h2') return `\n${text.toUpperCase()}`;
      return text;
    })
    .join('\n')
    .trim();
}
