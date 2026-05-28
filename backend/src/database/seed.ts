import { AppDataSource } from '../data-source';
import { User, UserRole } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ParkingFacility } from '../parking/entities/parking-facility.entity';
import { ParkingSpot } from '../parking/entities/parking-spot.entity';
import { ParkingTariff } from '../parking/entities/parking-tariff.entity';
import { ParkingSubscription } from '../parking/entities/parking-subscription.entity';
import { ParkingSubscriptionVehicle } from '../parking/entities/parking-subscription-vehicle.entity';
import { ParkingAgreement } from '../parking/entities/parking-agreement.entity';
import { Customer } from '../customers/entities/customer.entity';
import { FinanceAccount, FinanceAccountType } from '../finance/entities/finance.entities';
import { ParkingSegment, ParkingSystemType, ParkingSpotStatus, TariffBillingType, VehicleType, ContractStatus, ParkingDeviceType, ParkingDeviceDirection } from '../parking/entities/parking.enums';
import { ParkingAccessDevice } from '../parking/entities/parking-access-device.entity';
import { ParkingVehicle } from '../parking/entities/parking-vehicle.entity';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const tenantRepository = AppDataSource.getRepository(Tenant);
    const userRepository = AppDataSource.getRepository(User);

    let tenant = await tenantRepository.findOne({ where: { slug: 'home' } });
    if (!tenant) {
      tenant = await tenantRepository.save(
        tenantRepository.create({ name: 'Home', slug: 'home' }),
      );
      console.log('Tenant home created');
    }

    const adminEmail = 'admin@estacionamento.aplopes.com';
    let admin = await userRepository.findOne({
      where: { tenantId: tenant.id, email: adminEmail },
    });

    if (!admin) {
      admin = await userRepository.save(
        userRepository.create({
          tenantId: tenant.id,
          name: 'Administrador',
          email: adminEmail,
          password: await bcrypt.hash('admin123', 10),
          role: UserRole.ADMIN,
          active: true,
        }),
      );
      console.log('Admin created:', admin.email);
    } else {
      admin.password = await bcrypt.hash('admin123', 10);
      await userRepository.save(admin);
      console.log('Admin password reset:', admin.email);
    }

    const facilityRepo = AppDataSource.getRepository(ParkingFacility);
    const spotRepo = AppDataSource.getRepository(ParkingSpot);

    let facility = await facilityRepo.findOne({
      where: { tenantId: tenant.id, name: 'Estacionamento Principal' },
    });
    if (!facility) {
      facility = await facilityRepo.save(
        facilityRepo.create({
          tenantId: tenant.id,
          name: 'Estacionamento Principal',
          systemType: ParkingSystemType.GARAGE,
          segment: ParkingSegment.COMMERCIAL,
          address: 'Unidade demo',
          totalSpots: 0,
          active: true,
        }),
      );
      console.log('Parking facility created');
    }

    const existingSpots = await spotRepo.count({ where: { facilityId: facility.id } });
    if (existingSpots === 0) {
      for (let i = 1; i <= 20; i += 1) {
        await spotRepo.save(
          spotRepo.create({
            tenantId: tenant.id,
            facilityId: facility.id,
            code: `A${String(i).padStart(3, '0')}`,
            floor: 'Térreo',
            zone: 'Bloco A',
            status: ParkingSpotStatus.AVAILABLE,
            active: true,
          }),
        );
      }
      facility.totalSpots = 20;
      await facilityRepo.save(facility);
      console.log('20 parking spots created');
    }

    const tariffRepo = AppDataSource.getRepository(ParkingTariff);
    const tariffCount = await tariffRepo.count({ where: { tenantId: tenant.id } });
    if (tariffCount === 0) {
      const defaults = [
        {
          name: 'Rotativo — 1ª hora',
          billingType: TariffBillingType.HOURLY,
          vehicleType: null,
          price: '8.00',
          graceMinutes: 15,
          blockMinutes: 60,
          maxDailyPrice: '48.00',
          isDefault: true,
          sortOrder: 1,
          description: 'R$ 8/h após 15 min de tolerância. Teto diário R$ 48.',
        },
        {
          name: 'Diária',
          billingType: TariffBillingType.DAILY,
          vehicleType: null,
          price: '35.00',
          graceMinutes: 0,
          blockMinutes: 60,
          maxDailyPrice: null,
          isDefault: true,
          sortOrder: 2,
          description: 'Valor fixo por dia corrido.',
        },
        {
          name: 'Mensalista — Automóvel',
          billingType: TariffBillingType.MONTHLY,
          vehicleType: VehicleType.CAR,
          price: '250.00',
          graceMinutes: 0,
          blockMinutes: 60,
          maxDailyPrice: null,
          isDefault: true,
          sortOrder: 3,
          description: 'Plano mensal para carros.',
        },
        {
          name: 'Mensalista — Motocicleta',
          billingType: TariffBillingType.MONTHLY,
          vehicleType: VehicleType.MOTORCYCLE,
          price: '120.00',
          graceMinutes: 0,
          blockMinutes: 60,
          maxDailyPrice: null,
          isDefault: false,
          sortOrder: 4,
          description: 'Plano mensal para motos.',
        },
      ];

      for (const t of defaults) {
        await tariffRepo.save(
          tariffRepo.create({
            tenantId: tenant.id,
            facilityId: facility.id,
            active: true,
            ...t,
          }),
        );
      }
      console.log('Default parking tariffs created');
    }

    const customerRepo = AppDataSource.getRepository(Customer);
    const subRepo = AppDataSource.getRepository(ParkingSubscription);
    const subVehicleRepo = AppDataSource.getRepository(ParkingSubscriptionVehicle);

    let demoCustomer = await customerRepo.findOne({
      where: { tenantId: tenant.id, name: 'João Mensalista Demo' },
    });
    if (!demoCustomer) {
      demoCustomer = await customerRepo.save(
        customerRepo.create({
          tenantId: tenant.id,
          name: 'João Mensalista Demo',
          document: '52998224725',
          phone: '11999990001',
          email: 'mensalista.demo@estacionamento.aplopes.com',
          active: true,
        }),
      );
      console.log('Demo customer created for mensalista');
    }

    const existingSub = await subRepo.findOne({
      where: { tenantId: tenant.id, customerId: demoCustomer.id },
    });
    if (!existingSub) {
      const monthlyTariff = await tariffRepo.findOne({
        where: {
          tenantId: tenant.id,
          facilityId: facility.id,
          billingType: TariffBillingType.MONTHLY,
          vehicleType: VehicleType.CAR,
        },
      });
      const subscription = await subRepo.save(
        subRepo.create({
          tenantId: tenant.id,
          customerId: demoCustomer.id,
          facilityId: facility.id,
          tariffId: monthlyTariff?.id ?? null,
          code: 'M-DEMO',
          status: ContractStatus.ACTIVE,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: null,
          monthlyPrice: monthlyTariff?.price ?? '250.00',
          notes: 'Contrato demo — placa DEMO1',
        }),
      );
      await subVehicleRepo.save(
        subVehicleRepo.create({
          tenantId: tenant.id,
          subscriptionId: subscription.id,
          plate: 'DEMO1',
          vehicleType: VehicleType.CAR,
          holderName: demoCustomer.name,
          active: true,
        }),
      );
      console.log('Demo mensalista subscription created (placa DEMO1)');
    }

    const vehicleRepo = AppDataSource.getRepository(ParkingVehicle);
    const vehicleExists = await vehicleRepo.findOne({
      where: { tenantId: tenant.id, plate: 'DEMO1' },
    });
    if (!vehicleExists && demoCustomer) {
      await vehicleRepo.save(
        vehicleRepo.create({
          tenantId: tenant.id,
          plate: 'DEMO1',
          vehicleType: VehicleType.CAR,
          customerId: demoCustomer.id,
          holderName: demoCustomer.name,
          brand: 'Demo',
          model: 'Sedan',
          active: true,
        }),
      );
      console.log('Demo vehicle DEMO1 registered');
    }

    const accountRepo = AppDataSource.getRepository(FinanceAccount);
    const cashCount = await accountRepo.count({
      where: { tenantId: tenant.id, type: FinanceAccountType.CASH },
    });
    if (cashCount === 0) {
      await accountRepo.save(
        accountRepo.create({
          tenantId: tenant.id,
          name: 'Caixa — Estacionamento',
          type: FinanceAccountType.CASH,
          description: 'Recebimentos de estacionamento rotativo e valet',
          active: true,
        }),
      );
      console.log('Default cash account created for parking checkout');
    }

    const deviceRepo = AppDataSource.getRepository(ParkingAccessDevice);
    const deviceCount = await deviceRepo.count({ where: { tenantId: tenant.id } });
    if (deviceCount === 0 && facility) {
      const entryKey = `pkhw_demo_entry_${randomBytes(12).toString('hex')}`;
      const exitKey = `pkhw_demo_exit_${randomBytes(12).toString('hex')}`;
      await deviceRepo.save([
        deviceRepo.create({
          tenantId: tenant.id,
          facilityId: facility.id,
          name: 'Câmera LPR — Entrada',
          code: 'LPR-ENT',
          type: ParkingDeviceType.LPR_CAMERA,
          direction: ParkingDeviceDirection.ENTRY,
          vendor: 'demo',
          ipAddress: '192.168.1.101',
          apiKey: entryKey,
          autoEntry: true,
          autoExitWaived: true,
          active: true,
        }),
        deviceRepo.create({
          tenantId: tenant.id,
          facilityId: facility.id,
          name: 'Cancela — Saída',
          code: 'GATE-SAI',
          type: ParkingDeviceType.BARRIER,
          direction: ParkingDeviceDirection.EXIT,
          vendor: 'demo',
          ipAddress: '192.168.1.102',
          apiKey: exitKey,
          autoEntry: false,
          autoExitWaived: true,
          active: true,
        }),
      ]);
      console.log('Demo LPR/barrier devices created');
      console.log('  LPR Entrada API key:', entryKey);
      console.log('  Cancela Saída API key:', exitKey);
    }

    console.log('\n✅ Seed concluído');
    console.log('Login: slug=home |', adminEmail, '| admin123');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
