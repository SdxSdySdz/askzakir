function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?:;])/g, '$1<em>$2</em>');
  html = html.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?:;])/g, '$1<em>$2</em>');
  return html;
}

export function renderMarkdown(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let codeFence = null;
  let codeLines = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join('\n')).replace(/\n/g, '<br>')}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listType || !listItems.length) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(`<${tag}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</${tag}>`);
    listType = null;
    listItems = [];
  }

  function flushCodeFence() {
    if (codeFence === null) return;
    const langClass = codeFence ? ` class="language-${escapeHtml(codeFence)}"` : '';
    blocks.push(`<pre><code${langClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeFence = null;
    codeLines = [];
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^```([\w-]+)?\s*$/);
    if (fenceMatch) {
      if (codeFence !== null) {
        flushCodeFence();
      } else {
        flushParagraph();
        flushList();
        codeFence = fenceMatch[1] || '';
      }
      continue;
    }

    if (codeFence !== null) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level + 1}>${renderInlineMarkdown(headingMatch[2])}</h${level + 1}>`);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push('<hr>');
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote><p>${renderInlineMarkdown(quoteMatch[1])}</p></blockquote>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(orderedMatch[1]);
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(bulletMatch[1]);
      continue;
    }

    if (listType) flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushCodeFence();

  return blocks.join('') || `<p>${renderInlineMarkdown(String(text || ''))}</p>`;
}
