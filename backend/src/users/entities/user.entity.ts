import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  DEVELOPER = 'developer',
  HR = 'hr',
  GARCOM = 'garcom',
  COZINHA = 'cozinha',
}

/** Valores aceitos na API (validação e mensagens de erro). */
export const ALL_USER_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.DEVELOPER,
  UserRole.HR,
  UserRole.GARCOM,
  UserRole.COZINHA,
];

export enum DeveloperLevel {
  JUNIOR = 'junior',
  PLENO = 'pleno',
  SENIOR = 'senior',
}

@Entity('users')
@Unique(['tenantId', 'email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.DEVELOPER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: DeveloperLevel,
    nullable: true,
  })
  level: DeveloperLevel;

  @Column({ nullable: true })
  photoKey: string;

  @Column({ nullable: true })
  photoMimeType: string;

  @ManyToOne(() => User, (user) => user.teamMembers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  manager: User;

  @OneToMany(() => User, (user) => user.manager)
  teamMembers: User[];

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
