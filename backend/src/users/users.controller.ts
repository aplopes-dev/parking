import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';

interface UploadedPhoto {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Criar novo usuário' })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() current: User,
    @UploadedFile() photo?: UploadedPhoto,
  ) {
    return this.usersService.create(createUserDto, current.tenantId, photo);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuários' })
  findAll(@CurrentUser() user: User) {
    return this.usersService.findAll(user.tenantId);
  }

  @Get('team')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar membros do time' })
  findTeam(@CurrentUser() user: User) {
    return this.usersService.findTeamMembers(user.id, user.tenantId);
  }

  @Patch('me')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Atualizar o próprio perfil' })
  updateMe(
    @Body() body: { name?: string; email?: string; password?: string },
    @CurrentUser() current: User,
    @UploadedFile() photo?: UploadedPhoto,
  ) {
    return this.usersService.updateOwnProfile(current, body, photo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter usuário por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.findOneVisibleTo(user, id);
  }

  @Patch(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Atualizar usuário' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() current: User,
    @UploadedFile() photo?: UploadedPhoto,
  ) {
    return this.usersService.update(id, current.tenantId, updateUserDto, photo);
  }

  @Delete(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Remover usuário' })
  remove(@Param('id') id: string, @CurrentUser() current: User) {
    return this.usersService.remove(id, current.tenantId);
  }
}
