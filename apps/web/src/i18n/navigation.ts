import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/** Локале-осведомлённые навигационные примитивы (Link, useRouter, …). */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
