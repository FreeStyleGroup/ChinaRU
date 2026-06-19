'use client';

import { Badge, Button } from '@china-ru/ui';
import { useState } from 'react';

import { ClientApiError, socialClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

import { CommentThread } from './comment-thread';
import { renderWithMentions } from './mentions';

import type { PostAuthorDto, PostDto } from '@china-ru/shared';

function authorLabel(a: PostAuthorDto): string {
  if (a.kind === 'company') return a.companyName;
  if (a.kind === 'ad') return a.advertiser ?? 'Реклама';
  return a.nickname ? `@${a.nickname}` : (a.name ?? `#${a.publicId}`);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

export function PostCard({ post, onDeleted }: { post: PostDto; onDeleted: (id: string) => void }) {
  const { user } = useAuth();
  const a = post.author;
  const label = authorLabel(a);

  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOwn = a.kind === 'user' && a.userId === user?.id;
  const canDelete = isOwn || user?.role === 'admin';
  const canFollow =
    Boolean(user) && a.kind !== 'ad' && !(a.kind === 'user' && a.userId === user?.id);

  const like = async (): Promise<void> => {
    if (!user) return;
    try {
      const res = await socialClient.toggleLike(post.id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      // игнорируем — кнопка вернётся в прежнее состояние при перезагрузке
    }
  };

  const toggleFollow = async (): Promise<void> => {
    setBusy(true);
    try {
      const now = following ?? false;
      if (a.kind === 'company') {
        const res = now
          ? await socialClient.unfollowCompany(a.sellerId)
          : await socialClient.followCompany(a.sellerId);
        setFollowing(res.following);
      } else if (a.kind === 'user') {
        const res = now
          ? await socialClient.unfollowUser(a.userId)
          : await socialClient.followUser(a.userId);
        setFollowing(res.following);
      }
    } catch {
      // no-op
    } finally {
      setBusy(false);
    }
  };

  const report = async (): Promise<void> => {
    try {
      await socialClient.report({ targetType: 'post', targetId: post.id });
      setReported(true);
    } catch (e) {
      if (!(e instanceof ClientApiError)) setReported(false);
    }
  };

  const remove = async (): Promise<void> => {
    try {
      await socialClient.deletePost(post.id);
      onDeleted(post.id);
    } catch {
      // no-op
    }
  };

  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-surface text-sm font-bold text-brand">
          {label.replace(/^[@#]/, '').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-ink">{label}</span>
            {a.kind !== 'ad' && a.verified && (
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white"
                title="Верифицирован"
              >
                ✓
              </span>
            )}
            {post.isAd && <Badge>Реклама</Badge>}
            {a.kind === 'company' && <span className="text-xs text-muted">компания</span>}
          </div>
          <span className="text-xs text-muted">{timeAgo(post.createdAt)}</span>
        </div>
        {canFollow && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void toggleFollow()}>
            {following ? 'Вы подписаны' : 'Подписаться'}
          </Button>
        )}
      </header>

      <p className="mt-3 whitespace-pre-wrap text-ink">{renderWithMentions(post.body)}</p>

      {post.isAd && post.adUrl && (
        <a
          href={post.adUrl}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
        >
          Перейти →
        </a>
      )}

      <footer className="mt-4 flex items-center gap-4 text-sm text-muted">
        <button
          type="button"
          onClick={() => void like()}
          disabled={!user}
          className={liked ? 'font-medium text-brand' : 'hover:text-ink'}
        >
          ♥ {likeCount}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowComments(v => !v);
          }}
          className="hover:text-ink"
        >
          💬 {commentCount}
        </button>
        {user && !isOwn && !post.isAd && (
          <button
            type="button"
            onClick={() => void report()}
            disabled={reported}
            className="ml-auto text-xs hover:text-ink"
          >
            {reported ? 'Жалоба отправлена' : 'Пожаловаться'}
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => void remove()}
            className={`text-xs hover:text-brand ${user && !isOwn && !post.isAd ? '' : 'ml-auto'}`}
          >
            Удалить
          </button>
        )}
      </footer>

      {showComments && (
        <CommentThread
          postId={post.id}
          onAdded={() => {
            setCommentCount(c => c + 1);
          }}
        />
      )}
    </article>
  );
}
