import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MinioService } from '../minio/minio.service';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('public/products')
export class ProductsPublicController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly minioService: MinioService,
  ) {}

  @Get(':id/photo')
  @ApiOperation({ summary: 'Obter foto pública do produto' })
  async getProductPhoto(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const product = await this.productsService.findOneWithPhoto(id);

    if (!product.photoKey) {
      throw new NotFoundException('Foto do produto não encontrada');
    }

    const fileBuffer = await this.minioService.getFile(product.photoKey);

    response.setHeader('Content-Type', product.photoMimeType || 'image/jpeg');
    response.setHeader('ETag', `"${product.photoKey}"`);
    response.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');

    return new StreamableFile(fileBuffer);
  }
}
