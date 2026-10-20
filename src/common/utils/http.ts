import { ForbiddenException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';

/** Id dạng UUID trên URL. Id sai định dạng coi như không tồn tại (thay vì để PostgreSQL báo lỗi 500). */
export const parseId = (name = 'Dữ liệu') =>
  new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException(`${name} không tồn tại`) });

/** Lượt làm của khách (userId null) ai có id đều xem được; lượt làm của user chỉ chủ sở hữu xem. */
export function assertOwner(
  resource: { userId: string | null } | null,
  user: AuthUser | undefined,
  name = 'Dữ liệu',
): asserts resource is { userId: string | null } {
  if (!resource) {
    throw new NotFoundException(`${name} không tồn tại`);
  }
  if (resource.userId && resource.userId !== user?.id) {
    throw new ForbiddenException(`Bạn không có quyền truy cập ${name.toLowerCase()} này`);
  }
}
