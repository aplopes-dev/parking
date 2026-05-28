import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ProductsService, UploadedProductPhoto } from './products.service';
import { SortOrderOnlyDto } from '../common/dto/sort-order-only.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos (paginado)' })
  findAll(@CurrentUser() user: User, @Query() query: ProductListQueryDto) {
    return this.service.findAllPaginated(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter produto por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Criar produto' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: User,
    @UploadedFile() photo?: UploadedProductPhoto,
  ) {
    return this.service.create(dto, user.tenantId, photo);
  }

  @Patch(':id/sort-order')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Atualizar ordem do produto na listagem' })
  setSortOrder(
    @Param('id') id: string,
    @Body() dto: SortOrderOnlyDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, user.tenantId, { sortOrder: dto.sortOrder });
  }

  @Patch(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Atualizar produto' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: User,
    @UploadedFile() photo?: UploadedProductPhoto,
  ) {
    return this.service.update(id, user.tenantId, dto, photo);
  }

  @Delete(':id/photo')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Remover foto do produto' })
  removePhoto(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.removePhoto(id, user.tenantId);
  }

  @Delete(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Excluir produto' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.tenantId);
  }
}
