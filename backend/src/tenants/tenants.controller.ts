import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nova organização e administrador' })
  register(@Body() dto: RegisterOrganizationDto) {
    return this.tenantsService.registerOrganization(dto);
  }

  @Get('login-options')
  @ApiOperation({ summary: 'Listar organizações para seleção no login' })
  loginOptions() {
    return this.tenantsService.listForLoginSelect();
  }

  @Get('store-group/:code')
  @ApiOperation({ summary: 'Validar código de grupo de lojas (cadastro)' })
  async lookupStoreGroup(@Param('code') code: string) {
    return this.tenantsService.lookupStoreGroup(code);
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Verificar se organização existe (slug)' })
  async lookupBySlug(@Param('slug') slug: string) {
    const tenant = await this.tenantsService.findBySlug(slug);
    if (!tenant) {
      return { exists: false };
    }
    return {
      exists: true,
      name: tenant.name,
      slug: tenant.slug,
    };
  }
}
