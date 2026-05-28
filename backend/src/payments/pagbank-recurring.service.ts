import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { PagbankHttpClient } from './pagbank-http.client';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import {
  getPagbankApiBaseUrl,
  getPagbankSubscriptionsBaseUrl,
} from './pagbank-sdk.config';
import {
  assertPagbankOk,
  pagbankIdempotencyKey,
} from './pagbank-api.util';
import { PagbankRecurringPlan } from './entities/pagbank-recurring-plan.entity';
import { PagbankSubscription } from './entities/pagbank-subscription.entity';
import {
  PagbankCreatePlanDto,
  PagbankCreateSubscriptionDto,
} from './dto/pagbank-recurring.dto';

@Injectable()
export class PagbankRecurringService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly http: PagbankHttpClient,
    private readonly flowGuard: PagbankFlowGuard,
    @InjectRepository(PagbankRecurringPlan)
    private readonly planRepo: Repository<PagbankRecurringPlan>,
    @InjectRepository(PagbankSubscription)
    private readonly subRepo: Repository<PagbankSubscription>,
  ) {}

  private subsBase(settings: Awaited<ReturnType<PaymentsService['getOrCreateSettings']>>) {
    return getPagbankSubscriptionsBaseUrl(settings.pagbankEnvironment);
  }

  private subsHeaders() {
    return { 'x-idempotency-key': pagbankIdempotencyKey() };
  }

  async createPlan(tenantId: string, dto: PagbankCreatePlanDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_plans');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);

    const payload: Record<string, unknown> = {
      name: dto.name,
      amount: { value: dto.amountCents, currency: 'BRL' },
      interval: {
        unit: dto.interval?.unit ?? 'MONTH',
        length: dto.interval?.length ?? 1,
      },
    };
    if (dto.referenceId) payload.reference_id = dto.referenceId;
    if (dto.description) payload.description = dto.description;
    if (dto.billingCycles != null) payload.billing_cycles = dto.billingCycles;
    if (dto.paymentMethods?.length) payload.payment_method = dto.paymentMethods;

    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      '/plans',
      payload,
      { baseUrl: this.subsBase(settings), extraHeaders: this.subsHeaders() },
    );
    const data = assertPagbankOk(res, 'Erro ao criar plano PagBank');

    const row = await this.planRepo.save(
      this.planRepo.create({
        tenantId,
        pagbankPlanId: String(data.id),
        referenceId: dto.referenceId ?? null,
        name: dto.name,
        amountCents: dto.amountCents,
        intervalUnit: dto.interval?.unit ?? 'MONTH',
        intervalLength: dto.interval?.length ?? 1,
        status: data.status ? String(data.status) : null,
        rawData: data,
      }),
    );

    return { local: this.mapPlan(row), pagbank: data };
  }

  async listPlans(tenantId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_plans');
    const local = await this.planRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return local.map((p) => this.mapPlan(p));
  }

  async getPlan(tenantId: string, localId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_plans');
    const local = await this.findLocalPlan(tenantId, localId);
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/plans/${local.pagbankPlanId}`,
      undefined,
      { baseUrl: this.subsBase(settings) },
    );
    const data = assertPagbankOk(res);
    local.rawData = data;
    local.status = data.status ? String(data.status) : local.status;
    await this.planRepo.save(local);
    return { local: this.mapPlan(local), pagbank: data };
  }

  async inactivatePlan(tenantId: string, localId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_plans');
    const local = await this.findLocalPlan(tenantId, localId);
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'PUT',
      `/plans/${local.pagbankPlanId}/inactivate`,
      {},
      { baseUrl: this.subsBase(settings), extraHeaders: this.subsHeaders() },
    );
    const data = assertPagbankOk(res, 'Erro ao inativar plano');
    local.status = 'INACTIVE';
    local.rawData = data;
    await this.planRepo.save(local);
    return { local: this.mapPlan(local), pagbank: data };
  }

  async createSubscription(tenantId: string, dto: PagbankCreateSubscriptionDto) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_subscriptions');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);

    const pagbankPlanId = await this.resolvePagbankPlanId(tenantId, dto);
    const payload: Record<string, unknown> = dto.payload
      ? { ...dto.payload }
      : {
          reference_id: dto.referenceId,
          plan: { id: pagbankPlanId },
        };

    if (!dto.payload) {
      if (dto.customerId) {
        payload.customer = { id: dto.customerId };
      } else if (dto.customerName && dto.customerEmail) {
        payload.customer = {
          name: dto.customerName,
          email: dto.customerEmail,
          tax_id: dto.customerTaxId?.replace(/\D/g, ''),
        };
      } else {
        throw new BadRequestException('Informe customerId ou nome/e-mail do assinante');
      }

      if (dto.cardToken) {
        payload.payment_method = [
          {
            type: 'CREDIT_CARD',
            card: {
              token: dto.cardToken,
              security_code: dto.cardSecurityCode,
            },
          },
        ];
      }
    }

    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      '/subscriptions',
      payload,
      { baseUrl: this.subsBase(settings), extraHeaders: this.subsHeaders() },
    );
    const data = assertPagbankOk(res, 'Erro ao criar assinatura');

    const amount = (data.amount as { value?: number })?.value ?? 0;
    const row = await this.subRepo.save(
      this.subRepo.create({
        tenantId,
        localPlanId: dto.localPlanId ?? null,
        pagbankSubscriptionId: String(data.id),
        pagbankPlanId,
        referenceId: dto.referenceId,
        customerEmail: dto.customerEmail ?? null,
        status: data.status ? String(data.status) : null,
        amountCents: Number(amount),
        rawData: data,
      }),
    );

    return { local: this.mapSubscription(row), pagbank: data };
  }

  async listSubscriptions(tenantId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_subscriptions');
    const rows = await this.subRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((s) => this.mapSubscription(s));
  }

  async getSubscription(tenantId: string, localId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_subscriptions');
    const local = await this.findLocalSub(tenantId, localId);
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/subscriptions/${local.pagbankSubscriptionId}`,
      undefined,
      { baseUrl: this.subsBase(settings) },
    );
    const data = assertPagbankOk(res);
    local.rawData = data;
    local.status = data.status ? String(data.status) : local.status;
    await this.subRepo.save(local);
    return { local: this.mapSubscription(local), pagbank: data };
  }

  async cancelSubscription(tenantId: string, localId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_subscriptions');
    const local = await this.findLocalSub(tenantId, localId);
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'PUT',
      `/subscriptions/${local.pagbankSubscriptionId}/cancel`,
      {},
      { baseUrl: this.subsBase(settings), extraHeaders: this.subsHeaders() },
    );
    const data = assertPagbankOk(res, 'Erro ao cancelar assinatura');
    local.status = 'CANCELED';
    local.rawData = data;
    await this.subRepo.save(local);
    return { local: this.mapSubscription(local), pagbank: data };
  }

  async listSubscriptionInvoices(tenantId: string, localId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_subscriptions');
    const local = await this.findLocalSub(tenantId, localId);
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/subscriptions/${local.pagbankSubscriptionId}/invoices`,
      undefined,
      { baseUrl: this.subsBase(settings) },
    );
    return assertPagbankOk(res);
  }

  async getInvoice(tenantId: string, invoiceId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_subscriptions');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'GET',
      `/invoices/${invoiceId}`,
      undefined,
      { baseUrl: this.subsBase(settings) },
    );
    return assertPagbankOk(res);
  }

  async refundInvoicePayment(tenantId: string, paymentId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_subscriptions');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      `/payments/${paymentId}/refunds`,
      {},
      {
        baseUrl: getPagbankApiBaseUrl(settings.pagbankEnvironment),
        extraHeaders: this.subsHeaders(),
      },
    );
    return assertPagbankOk(res, 'Erro ao estornar pagamento');
  }

  private async resolvePagbankPlanId(
    tenantId: string,
    dto: PagbankCreateSubscriptionDto,
  ): Promise<string> {
    if (dto.planId?.startsWith('PLAN_')) return dto.planId;
    if (dto.localPlanId) {
      const plan = await this.findLocalPlan(tenantId, dto.localPlanId);
      return plan.pagbankPlanId;
    }
    if (dto.planId) {
      const plan = await this.planRepo.findOne({
        where: { id: dto.planId, tenantId },
      });
      if (plan) return plan.pagbankPlanId;
      throw new NotFoundException('Plano local não encontrado');
    }
    throw new BadRequestException('Informe planId (PLAN_…) ou localPlanId');
  }

  private async findLocalPlan(tenantId: string, id: string) {
    const row = await this.planRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Plano não encontrado');
    return row;
  }

  private async findLocalSub(tenantId: string, id: string) {
    const row = await this.subRepo.findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Assinatura não encontrada');
    return row;
  }

  private mapPlan(p: PagbankRecurringPlan) {
    return {
      id: p.id,
      pagbankPlanId: p.pagbankPlanId,
      referenceId: p.referenceId,
      name: p.name,
      amountCents: p.amountCents,
      intervalUnit: p.intervalUnit,
      intervalLength: p.intervalLength,
      status: p.status,
      createdAt: p.createdAt,
    };
  }

  private mapSubscription(s: PagbankSubscription) {
    return {
      id: s.id,
      pagbankSubscriptionId: s.pagbankSubscriptionId,
      pagbankPlanId: s.pagbankPlanId,
      localPlanId: s.localPlanId,
      referenceId: s.referenceId,
      customerEmail: s.customerEmail,
      status: s.status,
      amountCents: s.amountCents,
      createdAt: s.createdAt,
    };
  }
}
