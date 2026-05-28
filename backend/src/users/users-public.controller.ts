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
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('public/users')
export class UsersPublicController {
  constructor(
    private readonly usersService: UsersService,
    private readonly minioService: MinioService,
  ) {}

  @Get(':id/photo')
  @ApiOperation({ summary: 'Obter foto pública do usuário' })
  async getUserPhoto(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.usersService.findOneWithPhoto(id);

    if (!user.photoKey) {
      throw new NotFoundException('Foto do usuário não encontrada');
    }

    const fileBuffer = await this.minioService.getFile(user.photoKey);

    response.setHeader('Content-Type', user.photoMimeType || 'image/jpeg');
    response.setHeader('Cache-Control', 'public, max-age=3600');

    return new StreamableFile(fileBuffer);
  }
}
