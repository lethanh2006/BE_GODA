import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service.js';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /** Tổng quan các cấp độ: số câu theo dạng bài, số đề, cấu trúc đề. */
  @Get()
  overview() {
    return this.catalog.overview();
  }
}
