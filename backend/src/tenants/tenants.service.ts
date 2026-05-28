import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant } from './entities/tenant.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { StoreGroup } from '../multistore/entities/store-group.entity';
import { RegisterOrganizationDto } from './dto/register-organization.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(StoreGroup)
    private readonly storeGroupsRepository: Repository<StoreGroup>,
    private dataSource: DataSource,
  ) {}

  async lookupStoreGroup(code: string) {
    const normalized = code.trim().toLowerCase();
    const group = await this.storeGroupsRepository.findOne({
      where: { code: normalized },
    });
    if (!group) return { exists: false };
    return { exists: true, code: group.code, name: group.name };
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const normalized = slug.trim().toLowerCase();
    return this.tenantsRepository.findOne({ where: { slug: normalized } });
  }

  async findBySlugOrThrow(slug: string): Promise<Tenant> {
    const tenant = await this.findBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Organização não encontrada');
    }
    return tenant;
  }

  /** Lista pública mínima para escolha no login (slug + nome). */
  async listForLoginSelect(): Promise<Pick<Tenant, 'slug' | 'name'>[]> {
    return this.tenantsRepository.find({
      select: ['slug', 'name'],
      order: { name: 'ASC' },
    });
  }

  async registerOrganization(
    dto: RegisterOrganizationDto,
  ): Promise<{ tenant: Tenant; user: Omit<User, 'password'> }> {
    const slug = dto.slug.trim().toLowerCase();
    const email = dto.adminEmail.trim().toLowerCase();

    const existingSlug = await this.tenantsRepository.findOne({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException('Este identificador da organização já está em uso');
    }

    let storeGroupId: string | null = null;
    if (dto.storeGroupCode?.trim()) {
      const code = dto.storeGroupCode.trim().toLowerCase();
      const group = await this.storeGroupsRepository.findOne({ where: { code } });
      if (!group) {
        throw new NotFoundException('Grupo de lojas não encontrado. Verifique o código.');
      }
      storeGroupId = group.id;
    }

    return this.dataSource.transaction(async (manager) => {
      const tenantRepo = manager.getRepository(Tenant);
      const userRepo = manager.getRepository(User);

      const tenant = await tenantRepo.save(
        tenantRepo.create({
          name: dto.name.trim(),
          slug,
          storeGroupId,
          unitLabel: dto.unitLabel?.trim() || dto.name.trim(),
        }),
      );

      const emailTaken = await userRepo.findOne({
        where: { tenantId: tenant.id, email },
      });
      if (emailTaken) {
        throw new ConflictException('Email já cadastrado nesta organização');
      }

      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
      const userEntity = userRepo.create({
        tenantId: tenant.id,
        email,
        password: passwordHash,
        name: dto.adminName.trim(),
        role: UserRole.ADMIN,
        level: null,
        manager: null,
        active: true,
      });
      const saved = await userRepo.save(userEntity);
      const { password: _, ...safe } = saved;
      return { tenant, user: safe as Omit<User, 'password'> };
    });
  }
}
