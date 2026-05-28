import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
    tenantId: string,
  ): Promise<any> {
    const user = await this.usersService.findByEmailAndTenant(email, tenantId);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const tenant = await this.tenantsService.findBySlug(loginDto.tenantSlug);
    if (!tenant) {
      throw new UnauthorizedException('Organização não encontrada');
    }

    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
      tenant.id,
    );
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.buildSessionForUser(user);
  }

  /** Emite JWT + payload de usuário (login, troca de loja no grupo). */
  async buildSessionForUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    level?: string | null;
    photoKey?: string | null;
    updatedAt?: Date;
    tenantId: string;
    tenant?: { id: string; name: string; slug: string; unitLabel?: string | null };
  }) {
    const full = await this.usersService.findOneForAuth(user.id, user.tenantId);
    const payload = {
      email: full.email,
      sub: full.id,
      role: full.role,
      tid: full.tenantId,
    };
    const tenant = (full as any).tenant;
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: full.id,
        email: full.email,
        name: full.name,
        role: full.role,
        level: full.level,
        photoKey: full.photoKey,
        updatedAt: full.updatedAt,
        tenantId: full.tenantId,
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              unitLabel: tenant.unitLabel ?? null,
            }
          : undefined,
      },
    };
  }

  async register(createUserDto: any) {
    const tenantId = createUserDto.tenantId as string;
    if (!tenantId) {
      throw new ConflictException('tenantId é obrigatório');
    }

    const existingUser = await this.usersService.findByEmailAndTenant(
      createUserDto.email,
      tenantId,
    );
    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const user = await this.usersService.create(createUserDto, tenantId);

    const { password: _, ...result } = user;
    return result;
  }
}
