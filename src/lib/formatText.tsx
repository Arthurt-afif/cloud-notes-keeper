import React from 'react';

/**
 * Strip all formatting symbols from text (for search purposes).
 */
export function stripFormatSymbols(text: string): string {
  if (!text) return '';
  let result = text;
  // Remove color markers: #r(...), #b(...), #g(...), #y(...)
  result = result.replace(/#[rbgy]\(([^)]*)\)/gi, '$1');
  // Remove bold: **text** or *text*
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');
  result = result.replace(/\*(.+?)\*/g, '$1');
  // Remove italic: _text_
  result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1');
  // Remove strikethrough: ~text~
  result = result.replace(/~(.+?)~/g, '$1');
  return result;
}

/**
 * Parse formatted text into React elements for display.
 * Supports: **bold**, *bold*, _italic_, ~strikethrough~,
 * #r(red), #b(blue), #g(green), #y(yellow)
 */
export function renderFormattedText(text: string): React.ReactNode[] {
  if (!text) return [];

  // Combined regex for all formatting patterns
  const regex = /#([rbgy])\(([^)]*)\)|\*\*(.+?)\*\*|\*(.+?)\*|(?<!\w)_(.+?)_(?!\w)|~(.+?)~/g;

  const colorMap: Record<string, string> = {
    r: '#EF4444',
    b: '#3B82F6',
    g: '#22C55E',
    y: '#EAB308',
  };

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const key = `fmt-${match.index}`;

    if (match[1] && match[2] !== undefined) {
      // Color: #r(text), #b(text), etc.
      const color = colorMap[match[1].toLowerCase()] || 'inherit';
      result.push(
        <span key={key} style={{ color }}>{match[2]}</span>
      );
    } else if (match[3]) {
      // Double bold: **text**
      result.push(<strong key={key}>{match[3]}</strong>);
    } else if (match[4]) {
      // Single bold: *text*
      result.push(<strong key={key}>{match[4]}</strong>);
    } else if (match[5]) {
      // Italic: _text_
      result.push(<em key={key}>{match[5]}</em>);
    } else if (match[6]) {
      // Strikethrough: ~text~
      result.push(<s key={key}>{match[6]}</s>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

/**
 * Component to render a full multi-line text with formatting.
 */
export function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {renderFormattedText(line)}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}
