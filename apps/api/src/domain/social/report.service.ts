import { paginate } from '@china-ru/shared';

import { NotFoundError } from '../../http/errors';
import { toReportDto } from '../dto';

import type {
  NotificationRepository,
  PostRepository,
  ReportRepository,
  UserRepository,
} from '@china-ru/db';
import type {
  AdminReportListQuery,
  CreateReportInput,
  Paginated,
  ReportDto,
  ResolveReportInput,
} from '@china-ru/shared';

/** Жалобы на контент: приём от пользователей, оповещение админов, очередь модерации. */
export class ReportService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly notifications: NotificationRepository,
    private readonly users: UserRepository,
    private readonly posts: PostRepository
  ) {}

  async create(reporterId: string, input: CreateReportInput): Promise<ReportDto> {
    if (input.targetType === 'post') {
      const post = await this.posts.findById(input.targetId);
      if (!post) throw new NotFoundError('Пост не найден', 'post_not_found');
    } else {
      const user = await this.users.findById(input.targetId);
      if (!user) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    }

    const report = await this.reports.create({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason ?? null,
    });

    // Уведомляем всех админов — жалоба попадает в очередь рассмотрения.
    const adminIds = await this.users.idsByRole('admin');
    await this.notifications.createMany(
      adminIds.map(id => ({
        userId: id,
        type: 'report' as const,
        payload: {
          reportId: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
          reporterId,
        },
      }))
    );
    return toReportDto(report);
  }

  async adminList(query: AdminReportListQuery): Promise<Paginated<ReportDto>> {
    const { rows, total } = await this.reports.list({
      page: query.page,
      limit: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
    });
    return paginate(rows.map(toReportDto), total, { page: query.page, pageSize: query.pageSize });
  }

  async resolve(adminId: string, id: string, input: ResolveReportInput): Promise<ReportDto> {
    const updated = await this.reports.resolve(id, input.status, adminId);
    if (!updated) throw new NotFoundError('Жалоба не найдена', 'report_not_found');
    return toReportDto(updated);
  }
}
