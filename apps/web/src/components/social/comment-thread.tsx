'use client';

import { Button } from '@china-ru/ui';
import { useEffect, useState } from 'react';

import { ClientApiError, socialClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

import { renderWithMentions } from './mentions';

import type { PostCommentDto } from '@china-ru/shared';

function authorName(c: PostCommentDto): string {
  if (c.authorNickname) return `@${c.authorNickname}`;
  return c.authorName ?? `#${c.authorPublicId}`;
}

/** Комментарии под постом: список + форма добавления. */
export function CommentThread({
  postId,
  onAdded,
}: {
  postId: string;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<PostCommentDto[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void socialClient
      .listComments(postId)
      .then(res => {
        setComments(res.items);
      })
      .catch(() => {
        // лента комментариев недоступна — оставляем пусто
      });
  }, [postId]);

  const send = async (): Promise<void> => {
    if (body.trim().length === 0) return;
    setSending(true);
    setError('');
    try {
      const created = await socialClient.addComment(postId, body.trim());
      setComments(prev => [...prev, created]);
      setBody('');
      onAdded();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : 'Не удалось отправить комментарий');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      {comments.map(c => (
        <div key={c.id} className="text-sm">
          <span className="font-medium text-ink">{authorName(c)}</span>{' '}
          {c.authorVerified && <span className="text-xs text-blue-500">✓</span>}
          <p className="text-muted">{renderWithMentions(c.body)}</p>
        </div>
      ))}
      {comments.length === 0 && <p className="text-sm text-muted">Пока нет комментариев.</p>}

      {user && (
        <div className="flex gap-2">
          <input
            value={body}
            maxLength={2000}
            onChange={e => {
              setBody(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') void send();
            }}
            placeholder="Написать комментарий…"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <Button
            size="sm"
            disabled={sending || body.trim().length === 0}
            onClick={() => {
              void send();
            }}
          >
            Отправить
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-brand">{error}</p>}
    </div>
  );
}
