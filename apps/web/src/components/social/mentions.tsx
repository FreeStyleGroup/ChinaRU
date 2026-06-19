import { Fragment, type ReactNode } from 'react';

/** Подсвечивает упоминания вида `@100123` в тексте поста/комментария. */
export function renderWithMentions(text: string): ReactNode {
  return text.split(/(@\d{4,})/g).map((part, i) =>
    /^@\d{4,}$/.test(part) ? (
      <span key={i} className="font-medium text-brand">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}
