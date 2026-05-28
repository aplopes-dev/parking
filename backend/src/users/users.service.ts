import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { MinioService } from '../minio/minio.service';

interface UploadedPhoto {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private minioService: MinioService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    tenantId: string,
    photo?: UploadedPhoto,
  ): Promise<User> {
    await this.ensureEmailAvailable(createUserDto.email, tenantId);

    let manager: User | null = null;
    if (createUserDto.role === UserRole.DEVELOPER && createUserDto.managerId) {
      manager = await this.findOneInTenant(createUserDto.managerId, tenantId);
    }

    const user = this.usersRepository.create({
      tenantId,
      email: createUserDto.email,
      password: await bcrypt.hash(createUserDto.password, 10),
      name: createUserDto.name,
      role: createUserDto.role,
      level:
        createUserDto.role === UserRole.DEVELOPER
          ? createUserDto.level
          : null,
      manager,
      active: createUserDto.active ?? true,
    });

    if (photo) {
      Object.assign(user, await this.uploadPhoto(photo));
    }

    return this.usersRepository.save(user);
  }

  async findAll(tenantId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { tenantId },
      relations: ['manager', 'teamMembers'],
    });
  }

  async findOneInTenant(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, tenantId },
      relations: ['manager', 'teamMembers', 'tenant'],
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async findOneForAuth(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, tenantId },
      relations: ['manager', 'teamMembers', 'tenant'],
    });
    if (!user || !user.active) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async findOneVisibleTo(requester: User, targetId: string): Promise<User> {
    return this.findOneInTenant(targetId, requester.tenantId);
  }

  async findByEmailAndTenant(
    email: string,
    tenantId: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.trim().toLowerCase(), tenantId },
      relations: ['manager', 'teamMembers', 'tenant'],
    });
  }

  async findTeamMembers(
    managerId: string,
    tenantId: string,
  ): Promise<User[]> {
    return this.usersRepository.find({
      where: { manager: { id: managerId }, tenantId },
      relations: ['manager'],
    });
  }

  async update(
    id: string,
    tenantId: string,
    updateUserDto: UpdateUserDto,
    photo?: UploadedPhoto,
  ): Promise<User> {
    const user = await this.findOneInTenant(id, tenantId);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      await this.ensureEmailAvailable(updateUserDto.email, tenantId, id);
    }

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }

    if (updateUserDto.active !== undefined) {
      user.active = updateUserDto.active;
    }

    const nextRole = updateUserDto.role ?? user.role;
    const hasManagerUpdate = 'managerId' in updateUserDto;
    user.level =
      nextRole === UserRole.DEVELOPER
        ? updateUserDto.level ?? user.level ?? null
        : null;

    if (nextRole === UserRole.DEVELOPER && updateUserDto.managerId) {
      user.manager = await this.findOneInTenant(
        updateUserDto.managerId,
        tenantId,
      );
    } else if (nextRole === UserRole.DEVELOPER && !hasManagerUpdate) {
      // keep manager
    } else {
      user.manager = null;
    }

    if (photo) {
      const currentPhotoKey = user.photoKey;
      Object.assign(user, await this.uploadPhoto(photo));
      if (currentPhotoKey) {
        await this.removePhotoFromStorage(currentPhotoKey);
      }
    }

    return this.usersRepository.save(user);
  }

  async updateOwnProfile(
    current: User,
    input: { name?: string; email?: string; password?: string },
    photo?: UploadedPhoto,
  ): Promise<User> {
    const user = await this.findOneInTenant(current.id, current.tenantId);
    const nextName = input.name?.trim();
    const nextEmail = input.email?.trim().toLowerCase();
    const nextPassword = input.password?.trim();

    if (nextName !== undefined) {
      if (!nextName) {
        throw new BadRequestException('Informe um nome válido.');
      }
      user.name = nextName;
    }

    if (nextEmail !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        throw new BadRequestException('Informe um e-mail válido.');
      }
      if (nextEmail !== user.email) {
        await this.ensureEmailAvailable(nextEmail, current.tenantId, current.id);
      }
      user.email = nextEmail;
    }

    if (nextPassword) {
      if (nextPassword.length < 6) {
        throw new BadRequestException('A senha deve ter pelo menos 6 caracteres.');
      }
      user.password = await bcrypt.hash(nextPassword, 10);
    }

    if (photo) {
      const currentPhotoKey = user.photoKey;
      Object.assign(user, await this.uploadPhoto(photo));
      if (currentPhotoKey) {
        await this.removePhotoFromStorage(currentPhotoKey);
      }
    }

    return this.usersRepository.save(user);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const user = await this.findOneInTenant(id, tenantId);
    try {
      await this.usersRepository.remove(user);
      if (user.photoKey) {
        await this.removePhotoFromStorage(user.photoKey);
      }
    } catch (error) {
      throw new BadRequestException(
        'Não foi possível excluir o usuário. Verifique se ele possui vínculos no sistema.',
      );
    }
  }

  async findOneWithPhoto(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'name', 'photoKey', 'photoMimeType', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  private async ensureEmailAvailable(
    email: string,
    tenantId: string,
    currentUserId?: string,
  ): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const existingUser = await this.findByEmailAndTenant(normalized, tenantId);
    if (existingUser && existingUser.id !== currentUserId) {
      throw new ConflictException('Email já cadastrado');
    }
  }

  private async uploadPhoto(
    photo: UploadedPhoto,
  ): Promise<Pick<User, 'photoKey' | 'photoMimeType'>> {
    this.validatePhoto(photo);

    const extension =
      extname(photo.originalname) ||
      this.getExtensionFromMimeType(photo.mimetype);
    const photoKey = `users/${randomUUID()}${extension}`;

    await this.minioService.uploadFile(photoKey, photo.buffer);

    return {
      photoKey,
      photoMimeType: photo.mimetype,
    };
  }

  private validatePhoto(photo: UploadedPhoto): void {
    const isImage = photo.mimetype?.startsWith('image/');
    if (!isImage) {
      throw new BadRequestException(
        'Envie uma imagem válida para a foto do usuário.',
      );
    }

    const maxSizeInBytes = 5 * 1024 * 1024;
    if (photo.size > maxSizeInBytes) {
      throw new BadRequestException(
        'A foto deve ter no máximo 5 MB.',
      );
    }
  }

  private getExtensionFromMimeType(mimeType?: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }

  private async removePhotoFromStorage(photoKey: string): Promise<void> {
    try {
      await this.minioService.deleteFile(photoKey);
    } catch (error) {
      console.error('Erro ao remover foto do MinIO:', error);
    }
  }
}
