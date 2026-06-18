import { z } from 'zod';

import { idSchema, isoDateTime, timestampsShape } from '../common';
import { socialPostStatusSchema } from '../enums';
import { paginationQuerySchema } from '../pagination';

/* ───────────────── Создание контента ───────────────── */

/** Новый пост. `asCompany` — публиковать от лица своей верифицированной компании. */
export const createPostSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  asCompany: z.boolean().default(false),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

/** Рекламный пост (создаёт админ): текст + рекламодатель + ссылка-CTA. */
export const createAdPostSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  advertiser: z.string().trim().min(1).max(120),
  adUrl: z.url(),
});
export type CreateAdPostInput = z.infer<typeof createAdPostSchema>;

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/* ───────────────── Запросы ───────────────── */

export const feedQuerySchema = paginationQuerySchema;
export type FeedQuery = z.infer<typeof feedQuerySchema>;

export const adminPostListQuerySchema = paginationQuerySchema.extend({
  status: socialPostStatusSchema.optional(),
});
export type AdminPostListQuery = z.infer<typeof adminPostListQuerySchema>;

/* ───────────────── DTO ───────────────── */

/** Автор поста в ленте: человек, компания или рекламодатель (нативная реклама). */
export const postAuthorSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('user'),
    userId: idSchema,
    publicId: z.number().int(),
    name: z.string().nullable(),
    nickname: z.string().nullable(),
    verified: z.boolean(),
  }),
  z.object({
    kind: z.literal('company'),
    sellerId: idSchema,
    publicId: z.number().int(),
    companyName: z.string(),
    nickname: z.string().nullable(),
    verified: z.boolean(),
  }),
  z.object({
    kind: z.literal('ad'),
    advertiser: z.string().nullable(),
  }),
]);
export type PostAuthorDto = z.infer<typeof postAuthorSchema>;

export const postDtoSchema = z.object({
  id: idSchema,
  body: z.string(),
  imageUrls: z.array(z.string()),
  status: socialPostStatusSchema,
  isAd: z.boolean(),
  adUrl: z.string().nullable(),
  likeCount: z.number().int(),
  commentCount: z.number().int(),
  /** Лайкнул ли текущий зритель (false для гостя). */
  liked: z.boolean(),
  author: postAuthorSchema,
  ...timestampsShape,
});
export type PostDto = z.infer<typeof postDtoSchema>;

export const postCommentDtoSchema = z.object({
  id: idSchema,
  postId: idSchema,
  body: z.string(),
  authorPublicId: z.number().int(),
  authorName: z.string().nullable(),
  authorNickname: z.string().nullable(),
  authorVerified: z.boolean(),
  createdAt: isoDateTime,
});
export type PostCommentDto = z.infer<typeof postCommentDtoSchema>;
