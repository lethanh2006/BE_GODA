import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReportStatus, UserRole } from '../../generated/prisma/enums.js';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateReportDto, UpdateReportDto } from './dto/report.dto.js';

@ApiTags('reports')
@Controller()
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Báo lỗi câu hỏi (khách cũng gửi được). */
  @Post('questions/:id/reports')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @Param('id') questionId: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user?: AuthUser,
  ) {
    const exists = await this.prisma.question.count({ where: { id: questionId } });
    if (!exists) throw new NotFoundException('Câu hỏi không tồn tại');
    return this.prisma.questionReport.create({
      data: { questionId, userId: user?.id, reason: dto.reason, message: dto.message },
      select: { id: true, createdAt: true },
    });
  }

  @Get('admin/reports')
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'status', enum: ReportStatus, required: false })
  list(@Query('status', new ParseEnumPipe(ReportStatus, { optional: true })) status?: ReportStatus) {
    return this.prisma.questionReport.findMany({
      where: { status: status ?? ReportStatus.OPEN },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        question: { select: { id: true, level: true, type: true, prompt: true, options: true, answerIndex: true } },
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  @Patch('admin/reports/:id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.prisma.questionReport.update({ where: { id }, data: { status: dto.status } });
  }
}
