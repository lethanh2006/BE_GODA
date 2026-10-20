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
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { parseId } from '../../common/utils/http.js';
import { Question, QuestionReport } from '../../database/entities/index.js';
import { ReportStatus, UserRole } from '../../database/enums.js';
import { CreateReportDto, UpdateReportDto } from './dto/report.dto.js';

@ApiTags('reports')
@Controller()
export class ReportsController {
  constructor(
    @InjectRepository(QuestionReport) private readonly reports: Repository<QuestionReport>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
  ) {}

  /** Báo lỗi câu hỏi (khách cũng gửi được). */
  @Post('questions/:id/reports')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @Param('id') questionId: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user?: AuthUser,
  ) {
    if (!(await this.questions.existsBy({ id: questionId }))) {
      throw new NotFoundException('Câu hỏi không tồn tại');
    }
    const report = await this.reports.save(
      this.reports.create({
        questionId,
        userId: user?.id ?? null,
        reason: dto.reason,
        message: dto.message ?? null,
      }),
    );
    return { id: report.id, createdAt: report.createdAt };
  }

  @Get('admin/reports')
  @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'status', enum: ReportStatus, required: false })
  list(@Query('status', new ParseEnumPipe(ReportStatus, { optional: true })) status?: ReportStatus) {
    return this.reports.find({
      where: { status: status ?? ReportStatus.OPEN },
      order: { createdAt: 'DESC' },
      take: 200,
      relations: { question: true, user: true },
      select: {
        id: true,
        questionId: true,
        userId: true,
        reason: true,
        message: true,
        status: true,
        createdAt: true,
        question: { id: true, level: true, type: true, prompt: true, options: true, answerIndex: true },
        user: { id: true, email: true, displayName: true },
      },
    });
  }

  @Patch('admin/reports/:id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id', parseId('Báo lỗi')) id: string, @Body() dto: UpdateReportDto) {
    const { affected } = await this.reports.update({ id }, { status: dto.status });
    if (!affected) throw new NotFoundException('Báo lỗi không tồn tại');
    return this.reports.findOneByOrFail({ id });
  }
}
