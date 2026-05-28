import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login do usuário' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter usuário atual' })
  async getMe(@CurrentUser() user: User) {
    const tenant = (user as any).tenant;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      level: user.level,
      photoKey: user.photoKey,
      updatedAt: user.updatedAt,
      tenantId: user.tenantId,
      tenant: tenant
        ? { id: tenant.id, name: tenant.name, slug: tenant.slug }
        : undefined,
    };
  }
}
