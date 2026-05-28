import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { PagbankHttpClient } from './pagbank-http.client';
import { PagbankFlowGuard } from './pagbank-flow.guard';
import { PagbankOrdersService } from './pagbank-orders.service';
import { Pagbank3dsService } from './pagbank-3ds.service';
import { PagbankSplitService } from './pagbank-split.service';
import { mergePagbankFlowsConfig, PagbankFlowsConfigMap } from './pagbank-flows.catalog';
import { PaymentSplitReceiverRole } from './entities/payment-split-receiver.entity';
import { extractPagbankSplitId } from './pagbank-split.builder';
import {
  PagbankEnvironment,
  PaymentSettings,
} from './entities/payment-settings.entity';
import {
  getPagbankApiBaseUrl,
  getPagbankSubscriptionsBaseUrl,
} from './pagbank-sdk.config';
import {
  formatPagbankApiError,
  formatPagbankDateTimeBr,
  pagbankIdempotencyKey,
} from './pagbank-api.util';
import { preparePagbankToken } from './pagbank-token.util';
import {
  generateSandboxCustomerTaxId,
  sandboxCustomerEmail,
} from './pagbank-sandbox-customer.util';
import {
  encryptPagbankCardSdk,
  RecurringCardPlain,
} from './pagbank-card-encrypt.util';
import { PagbankRecurringPlan } from './entities/pagbank-recurring-plan.entity';
import { PagbankSubscription } from './entities/pagbank-subscription.entity';
import { PagbankTransactionStatus } from './entities/pagbank-transaction.entity';
import {
  RECURRING_TEST_GROUP_LABELS,
  RECURRING_TEST_SCENARIOS,
  getRecurringTestScenario,
  RecurringTestScenario,
} from './pagbank-recurring-test.catalog';
import {
  ORDERS_TEST_GROUP_LABELS,
  ORDERS_TEST_SCENARIOS,
  getOrdersTestScenario,
} from './pagbank-orders-test.catalog';
import {
  cardScenarioToPlainCard,
  maskCardPan,
  ordersScenarioToPlainCard,
} from './pagbank-orders-test.cards';
import {
  ORDERS_3DS_DEBIT_GROUP_LABELS,
  ORDERS_3DS_DEBIT_SCENARIOS,
  getOrders3dsDebitScenario,
} from './pagbank-orders-3ds-test.catalog';
import {
  buildPagbank3dsAuthenticateRequest,
  sandbox3dsCustomerName,
} from './pagbank-3ds-authenticate.builder';
import {
  buildSandboxBoletoHolder,
  buildSandboxBoletoPaymentFields,
} from './pagbank-boleto.builder';

const TEST_PLAN_REFERENCE = 'aplopes-sandbox-recurring-test';

type SandboxRecurringAttempt = {
  cardStrategy: string;
  endpoint: string;
  ok: boolean;
  httpStatus: number;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  error: string | null;
};

@Injectable()
export class PagbankSandboxTestService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly http: PagbankHttpClient,
    private readonly flowGuard: PagbankFlowGuard,
    private readonly ordersService: PagbankOrdersService,
    private readonly threeDs: Pagbank3dsService,
    private readonly splitService: PagbankSplitService,
    @InjectRepository(PagbankRecurringPlan)
    private readonly planRepo: Repository<PagbankRecurringPlan>,
    @InjectRepository(PagbankSubscription)
    private readonly subRepo: Repository<PagbankSubscription>,
  ) {}

  async verifyToken(
    tenantId: string,
    tokenOverride?: string,
    environmentOverride?: PagbankEnvironment,
  ) {
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const rawToken = tokenOverride?.trim() || settings.pagbankToken?.trim();
    if (!rawToken) {
      throw new BadRequestException(
        'Informe o token no campo ou salve um token em Configuração antes de testar',
      );
    }
    const token = preparePagbankToken(rawToken);

    const environment = environmentOverride ?? settings.pagbankEnvironment;
    const envLabel = environment === PagbankEnvironment.SANDBOX ? 'Sandbox' : 'Produção';

    const primary = await this.probeTokenOnEnvironment(settings, token, environment);

    let environmentMismatch: {
      detected: boolean;
      suggestedEnvironment: PagbankEnvironment;
      suggestedLabel: string;
      message: string;
    } | null = null;

    const primaryAuthFailed =
      !primary.orders.ok &&
      (primary.orders.httpStatus === 401 || primary.orders.authRejected);

    if (primaryAuthFailed) {
      const alternate =
        environment === PagbankEnvironment.SANDBOX
          ? PagbankEnvironment.PRODUCTION
          : PagbankEnvironment.SANDBOX;
      const altLabel = alternate === PagbankEnvironment.SANDBOX ? 'Sandbox' : 'Produção';
      const alternateProbe = await this.probeTokenOnEnvironment(settings, token, alternate);
      if (alternateProbe.orders.ok) {
        environmentMismatch = {
          detected: true,
          suggestedEnvironment: alternate,
          suggestedLabel: altLabel,
          message: `Este token foi aceito em ${altLabel}, mas recusado em ${envLabel}. Altere o seletor "Ambiente" para ${altLabel} e salve.`,
        };
      }
    }

    const valid = primary.orders.ok;
    let message: string;

    if (environmentMismatch) {
      message = environmentMismatch.message;
    } else if (valid && primary.subscriptions.ok) {
      message = `Token válido no ambiente ${envLabel} (API de Pedidos e Assinaturas).`;
    } else if (valid) {
      message = `Token válido no ambiente ${envLabel} para Pedidos. Assinaturas não respondeu — confira se a conta tem Pagamento Recorrente ou se o token de assinaturas é outro.`;
    } else if (primary.orders.httpStatus === 401 || primary.orders.authRejected) {
      message = `Token recusado no ambiente ${envLabel}. Confira se o token é de ${envLabel} (portal sandbox vs produção).`;
    } else {
      message =
        primary.orders.error ??
        `Não foi possível validar o token no ambiente ${envLabel}.`;
    }

    return {
      valid: environmentMismatch ? false : valid,
      message,
      environment,
      environmentLabel: envLabel,
      isSandbox: environment === PagbankEnvironment.SANDBOX,
      tokenSource: tokenOverride?.trim() ? 'informado_no_formulario' : 'salvo_na_configuracao',
      orders: primary.orders,
      subscriptions: primary.subscriptions,
      environmentMismatch,
    };
  }

  private async probeTokenOnEnvironment(
    settings: PaymentSettings,
    token: string,
    environment: PagbankEnvironment,
  ) {
    const opts = { tokenOverride: token };
    const ordersBase = getPagbankApiBaseUrl(environment);
    const subsBase = getPagbankSubscriptionsBaseUrl(environment);

    const [ordersRes, subsRes] = await Promise.all([
      this.http.request<Record<string, unknown>>(
        settings,
        'GET',
        '/public-keys/card',
        undefined,
        { ...opts, baseUrl: ordersBase },
      ),
      this.http.request<Record<string, unknown>>(
        settings,
        'GET',
        '/plans?limit=1',
        undefined,
        { ...opts, baseUrl: subsBase },
      ),
    ]);

    return {
      orders: this.summarizeAuthProbe(
        environment === PagbankEnvironment.SANDBOX
          ? 'Pedidos / Chaves (sandbox.api.pagseguro.com)'
          : 'Pedidos / Chaves (api.pagseguro.com)',
        ordersBase,
        'GET /public-keys/card',
        ordersRes,
      ),
      subscriptions: this.summarizeAuthProbe(
        environment === PagbankEnvironment.SANDBOX
          ? 'Assinaturas (sandbox.api.assinaturas.pagseguro.com)'
          : 'Assinaturas (api.assinaturas.pagseguro.com)',
        subsBase,
        'GET /plans?limit=1',
        subsRes,
      ),
    };
  }

  private summarizeAuthProbe(
    label: string,
    apiBase: string,
    endpoint: string,
    res: { ok: boolean; status: number; data: Record<string, unknown> },
  ) {
    const authenticated = res.ok && res.status >= 200 && res.status < 300;
    const authRejected = res.status === 401 || res.status === 403;

    return {
      label,
      apiBase,
      endpoint,
      ok: authenticated,
      httpStatus: res.status,
      authRejected,
      error: authenticated ? null : formatPagbankApiError(res.data),
    };
  }

  private summarizeProbe(
    label: string,
    apiBase: string,
    endpoint: string,
    res: { ok: boolean; status: number; data: Record<string, unknown> },
  ) {
    return {
      label,
      apiBase,
      endpoint,
      ok: res.ok,
      httpStatus: res.status,
      authRejected: res.status === 401 || res.status === 403,
      error: res.ok ? null : formatPagbankApiError(res.data),
    };
  }

  async evaluateSplitSandboxReadiness(tenantId: string) {
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const receivers = await this.paymentsService.getSplitReceivers(tenantId);
    const activeSecondaries = receivers.filter(
      (r) => r.active && r.role === PaymentSplitReceiverRole.SECONDARY,
    );
    const baseIssues: string[] = [];

    if (!settings.pagbankToken?.trim()) {
      baseIssues.push('Configure o token PagBank na aba Geral.');
    }
    if (!settings.pagbankSplitEnabled) {
      baseIssues.push('Habilite a divisão na aba Divisão (split).');
    }
    if (!settings.pagbankMasterAccountId?.trim()) {
      baseIssues.push('Informe a conta adquirente (ACCO_…) na aba Divisão (split).');
    }
    if (activeSecondaries.length < 1) {
      baseIssues.push(
        'Cadastre ao menos um recebedor secundário (ACCO_…) na aba Split ou sincronize contas PagBank Connect.',
      );
    }

    const flows = mergePagbankFlowsConfig(
      settings.pagbankFlowsConfig as PagbankFlowsConfigMap,
    );

    const cardIssues = [...baseIssues];
    if (!flows.split_create_and_pay?.enabled) {
      cardIssues.push('Ative o fluxo split_create_and_pay em Fluxos PagBank.');
    }
    if (!flows.orders_credit_card?.enabled) {
      cardIssues.push('Ative o fluxo orders_credit_card em Fluxos PagBank.');
    }

    const pixIssues = [...baseIssues];
    if (!flows.split_pix?.enabled) {
      pixIssues.push('Ative o fluxo split_pix em Fluxos PagBank.');
    }

    const queryIssues: string[] = [];
    if (!settings.pagbankToken?.trim()) {
      queryIssues.push('Configure o token PagBank na aba Geral.');
    }
    if (!flows.split_query?.enabled) {
      queryIssues.push('Ative o fluxo split_query em Fluxos PagBank.');
    }

    let splitsPreview: Record<string, unknown> | null = null;
    let splitsPixPreview: Record<string, unknown> | null = null;
    if (baseIssues.length === 0) {
      try {
        splitsPreview = (await this.splitService.getSplitsPayloadForFlow(
          tenantId,
          'split_create_and_pay',
        )) as Record<string, unknown>;
        splitsPixPreview = (await this.splitService.getSplitsPayloadForFlow(
          tenantId,
          'split_pix',
        )) as Record<string, unknown>;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao montar preview do split';
        cardIssues.push(msg);
        pixIssues.push(msg);
      }
    }

    return {
      ready: cardIssues.length === 0,
      pixReady: pixIssues.length === 0,
      queryReady: queryIssues.length === 0,
      issues: cardIssues,
      pixIssues,
      queryIssues,
      masterAccountId: settings.pagbankMasterAccountId,
      secondaryReceivers: activeSecondaries.length,
      splitsPreview,
      splitsPixPreview,
      docUrl: 'https://developer.pagbank.com.br/reference/crie-e-pague-um-pedido-com-divisao-do-pagamento',
      pixDocUrl:
        'https://developer.pagbank.com.br/reference/pedido-com-divisao-de-pagamento-com-pix',
      queryDocUrl: 'https://developer.pagbank.com.br/reference/consultar-uma-divisao',
    };
  }

  async getTestPanel(tenantId: string) {
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    const splitSandbox = await this.evaluateSplitSandboxReadiness(tenantId);
    const testPlan = await this.planRepo.findOne({
      where: { tenantId, referenceId: TEST_PLAN_REFERENCE },
      order: { createdAt: 'DESC' },
    });

    return {
      environment: settings.pagbankEnvironment,
      tokenConfigured: Boolean(settings.pagbankToken?.trim()),
      isSandbox: settings.pagbankEnvironment === PagbankEnvironment.SANDBOX,
      apiBases: {
        orders: getPagbankApiBaseUrl(settings.pagbankEnvironment),
        subscriptions: getPagbankSubscriptionsBaseUrl(settings.pagbankEnvironment),
      },
      docUrl:
        'https://developer.pagbank.com.br/reference/testar-sua-integracao-pagamentos-recorrentes',
      ordersTestCardsDocUrl: 'https://developer.pagbank.com.br/docs/cartoes-de-teste',
      groupLabels: RECURRING_TEST_GROUP_LABELS,
      scenarios: RECURRING_TEST_SCENARIOS,
      ordersGroupLabels: ORDERS_TEST_GROUP_LABELS,
      ordersScenarios: ORDERS_TEST_SCENARIOS,
      orders3dsGroupLabels: ORDERS_3DS_DEBIT_GROUP_LABELS,
      orders3dsScenarios: ORDERS_3DS_DEBIT_SCENARIOS,
      orders3dsDocUrl:
        'https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-3ds-validacao-pagbank',
      ordersBoletoDocUrl:
        'https://developer.pagbank.com.br/reference/criar-e-pagar-pedido-com-boleto',
      splitSandbox,
      testPlan: testPlan
        ? {
            id: testPlan.id,
            pagbankPlanId: testPlan.pagbankPlanId,
            name: testPlan.name,
            amountCents: testPlan.amountCents,
          }
        : null,
    };
  }

  private assertSandbox(settings: { pagbankEnvironment: PagbankEnvironment }) {
    if (settings.pagbankEnvironment !== PagbankEnvironment.SANDBOX) {
      throw new BadRequestException(
        'Painel de testes PagBank disponível apenas com ambiente sandbox',
      );
    }
  }

  /** Chave pública — API Pedidos (`GET /public-keys/card`). */
  private async fetchOrdersCardPublicKey(settings: PaymentSettings): Promise<string> {
    const baseUrl = getPagbankApiBaseUrl(settings.pagbankEnvironment);
    const cardEndpoint = await this.http.request<{ public_key?: string }>(
      settings,
      'GET',
      '/public-keys/card',
      undefined,
      { baseUrl },
    );
    if (cardEndpoint.ok && cardEndpoint.data.public_key) {
      return String(cardEndpoint.data.public_key);
    }

    const existing = await this.http.request<{ public_key?: string }>(
      settings,
      'GET',
      '/public-keys',
      undefined,
      { baseUrl },
    );
    if (existing.ok && existing.data.public_key) {
      return String(existing.data.public_key);
    }

    const created = await this.http.request<{ public_key?: string }>(
      settings,
      'PUT',
      '/public-keys',
      { type: 'card' },
      { baseUrl },
    );
    if (!created.ok || !created.data.public_key) {
      throw new BadRequestException(
        formatPagbankApiError(created.data as Record<string, unknown>) ||
          'Não foi possível obter chave pública (API Orders)',
      );
    }
    return String(created.data.public_key);
  }

  private scenarioToPlainCard(
    scenario: RecurringTestScenario,
    holderName: string,
    cardNumber = scenario.cardNumber,
  ): RecurringCardPlain {
    const expYear =
      scenario.expYear.length === 2 ? `20${scenario.expYear}` : scenario.expYear;
    return {
      holder: holderName,
      number: cardNumber,
      expMonth: scenario.expMonth,
      expYear,
      securityCode: scenario.securityCode,
    };
  }

  /** Token CARD_* da doc de sandbox (somente em billing_info; CVV vai em payment_method). */
  private buildSandboxBillingCardToken(scenario: RecurringTestScenario) {
    return { token: scenario.cardToken.trim() };
  }

  /**
   * Com token CARD_* em billing_info a API não aceita payment_method.card.
   * @see https://developer.pagbank.com.br/reference/testar-sua-integracao-pagamentos-recorrentes
   */
  private recurringPaymentMethodTypeOnly() {
    return [{ type: 'CREDIT_CARD' }];
  }

  private pushSandboxAttempt(
    attempts: SandboxRecurringAttempt[],
    entry: {
      cardStrategy: string;
      endpoint: string;
      request?: Record<string, unknown>;
      res: { ok: boolean; status: number; data: Record<string, unknown> };
    },
  ) {
    attempts.push({
      cardStrategy: entry.cardStrategy,
      endpoint: entry.endpoint,
      ok: entry.res.ok,
      httpStatus: entry.res.status,
      request: entry.request,
      response: entry.res.data,
      error: entry.res.ok ? null : formatPagbankApiError(entry.res.data),
    });
  }

  async ensureTestPlan(tenantId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_plans');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    this.assertSandbox(settings);

    const existing = await this.planRepo.findOne({
      where: { tenantId, referenceId: TEST_PLAN_REFERENCE },
    });
    if (existing) {
      return {
        created: false,
        ok: true,
        plan: {
          id: existing.id,
          pagbankPlanId: existing.pagbankPlanId,
          name: existing.name,
          amountCents: existing.amountCents,
        },
        message: 'Plano de teste sandbox já cadastrado.',
      };
    }

    const payload = {
      reference_id: TEST_PLAN_REFERENCE,
      name: 'Plano Teste Sandbox Aplopes',
      amount: { value: 1000, currency: 'BRL' },
      interval: { unit: 'MONTH', length: 1 },
      payment_method: ['CREDIT_CARD'],
    };

    const base = getPagbankSubscriptionsBaseUrl(settings.pagbankEnvironment);
    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      '/plans',
      payload,
      { baseUrl: base, extraHeaders: { 'x-idempotency-key': pagbankIdempotencyKey() } },
    );

    if (!res.ok) {
      return {
        created: false,
        ok: false,
        request: payload,
        response: res.data,
        error: formatPagbankApiError(res.data),
        apiBase: base,
      };
    }

    const row = await this.planRepo.save(
      this.planRepo.create({
        tenantId,
        pagbankPlanId: String(res.data.id),
        referenceId: TEST_PLAN_REFERENCE,
        name: 'Plano Teste Sandbox Aplopes',
        amountCents: 1000,
        intervalUnit: 'MONTH',
        intervalLength: 1,
        status: res.data.status ? String(res.data.status) : 'ACTIVE',
        rawData: res.data,
      }),
    );

    return {
      created: true,
      ok: true,
      plan: {
        id: row.id,
        pagbankPlanId: row.pagbankPlanId,
        name: row.name,
        amountCents: row.amountCents,
      },
      request: payload,
      response: res.data,
      apiBase: base,
    };
  }

  async runRecurringScenario(tenantId: string, scenarioId: string) {
    const scenario = getRecurringTestScenario(scenarioId);
    if (!scenario) {
      throw new BadRequestException(`Cenário de teste "${scenarioId}" não encontrado`);
    }

    try {
      await this.flowGuard.assertFlowAllowed(tenantId, 'recurring_subscriptions');
      const settings = await this.paymentsService.getOrCreateSettings(tenantId);
      this.assertSandbox(settings);

      const planResult = await this.ensureTestPlan(tenantId);
    const pagbankPlanId =
      planResult.plan?.pagbankPlanId ??
      (planResult as { response?: { id?: string } }).response?.id;
    if (!pagbankPlanId) {
      return {
        ok: false,
        scenario,
        error: planResult.error ?? 'Não foi possível obter plano de teste',
        planResult,
      };
    }

    const runId = Date.now();
    const referenceId = `test-${scenarioId}-${runId}`;
    const customerName = 'Teste Sandbox Aplopes';
    const customerEmail = sandboxCustomerEmail(scenarioId, runId);
    const customerTaxId = generateSandboxCustomerTaxId(runId);
    const base = getPagbankSubscriptionsBaseUrl(settings.pagbankEnvironment);
    const customerBase = {
      reference_id: referenceId,
      name: customerName,
      email: customerEmail,
      tax_id: customerTaxId,
      phones: [{ country: '55', area: '11', number: '999999999' }],
      address: {
        street: 'Av Paulista',
        number: '1000',
        complement: 'Sala1',
        locality: 'Bela Vista',
        city: 'Sao Paulo',
        region_code: 'SP',
        country: 'BRA',
        postal_code: '01310100',
      },
    };

    const cardStrategy = 'sandbox_card_token';
    const started = Date.now();
    const payload: Record<string, unknown> = {
      reference_id: referenceId,
      plan: { id: pagbankPlanId },
      customer: {
        ...customerBase,
        billing_info: [
          {
            type: 'CREDIT_CARD',
            card: this.buildSandboxBillingCardToken(scenario),
          },
        ],
      },
      payment_method: this.recurringPaymentMethodTypeOnly(),
    };

    const res = await this.http.request<Record<string, unknown>>(
      settings,
      'POST',
      '/subscriptions',
      payload,
      { baseUrl: base, extraHeaders: { 'x-idempotency-key': pagbankIdempotencyKey() } },
    );

    const attempts: SandboxRecurringAttempt[] = [];
    this.pushSandboxAttempt(attempts, {
      cardStrategy,
      endpoint: 'POST /subscriptions',
      request: payload,
      res,
    });

    const durationMs = Date.now() - started;

    let localSubscription: Record<string, unknown> | null = null;
    if (res.ok && res.data.id) {
      const amount = (res.data.amount as { value?: number })?.value ?? 1000;
      const row = await this.subRepo.save(
        this.subRepo.create({
          tenantId,
          localPlanId: planResult.plan?.id ?? null,
          pagbankSubscriptionId: String(res.data.id),
          pagbankPlanId: String(pagbankPlanId),
          referenceId,
          customerEmail,
          status: res.data.status ? String(res.data.status) : null,
          amountCents: Number(amount),
          rawData: res.data,
        }),
      );
      localSubscription = {
        id: row.id,
        pagbankSubscriptionId: row.pagbankSubscriptionId,
        status: row.status,
      };
    }

      return {
        ok: res.ok,
        httpStatus: res.status,
        durationMs,
        scenario,
        apiBase: base,
        endpoint: 'POST /subscriptions',
        request: payload,
        response: res.data,
        error:
          res.ok
            ? null
            : formatPagbankApiError(res.data) ||
              attempts[attempts.length - 1]?.error ||
              'Erro na API PagBank',
        localSubscription,
        expectedBehavior: scenario.behavior,
        cardStrategy,
        attempts,
      };
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha ao executar teste recorrente';
      return {
        ok: false,
        scenario,
        error: message,
        expectedBehavior: scenario.behavior,
      };
    }
  }

  /**
   * Valida criptografia + cartão via POST /orders (doc criar e pagar com cartão).
   * @see https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-cartao
   */
  async runOrdersCardSandbox(tenantId: string, scenarioId: string) {
    return this.runOrdersCardPaymentSandbox(tenantId, scenarioId);
  }

  /**
   * Passo 1 do débito: sessão 3DS + payload para PagSeguro.authenticate3DS no browser.
   */
  async prepareOrdersDebit3dsSandbox(tenantId: string, scenarioId: string) {
    const scenario = getOrders3dsDebitScenario(scenarioId);
    if (!scenario) {
      throw new BadRequestException(
        `Cenário 3DS "${scenarioId}" não encontrado (ex.: 3ds_visa_debit_auth).`,
      );
    }
    await this.flowGuard.assertFlowAllowed(tenantId, 'orders_debit_card');
    await this.flowGuard.assertFlowAllowed(tenantId, 'orders_3ds_pagbank');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    this.assertSandbox(settings);

    const sessionRes = await this.threeDs.createSession(tenantId, {});
    const runId = Date.now();
    const customerName = sandbox3dsCustomerName();
    const customerEmail = sandboxCustomerEmail(scenarioId, runId);

    return {
      session: sessionRes.session,
      sdkEnv: 'SANDBOX' as const,
      scenario,
      authenticate3dsRequest: buildPagbank3dsAuthenticateRequest(scenario, {
        name: customerName,
        email: customerEmail,
      }),
    };
  }

  /**
   * Passo 2: POST /orders após authenticate3DS (authentication_method.id).
   */
  async completeOrdersDebit3dsSandbox(
    tenantId: string,
    scenarioId: string,
    threeDsId: string,
  ) {
    const scenario = getOrders3dsDebitScenario(scenarioId);
    if (!scenario) {
      throw new BadRequestException(`Cenário 3DS "${scenarioId}" não encontrado`);
    }

    try {
      await this.flowGuard.assertFlowAllowed(tenantId, 'orders_debit_card');
      await this.flowGuard.assertFlowAllowed(tenantId, 'orders_3ds_pagbank');
      const settings = await this.paymentsService.getOrCreateSettings(tenantId);
      this.assertSandbox(settings);

      const runId = Date.now();
      const customerName = sandbox3dsCustomerName();
      const customerEmail = sandboxCustomerEmail(scenarioId, runId);
      const customerTaxId = generateSandboxCustomerTaxId(runId);
      const ordersBase = getPagbankApiBaseUrl(settings.pagbankEnvironment);
      const plainCard = cardScenarioToPlainCard(scenario, customerName);
      const encrypted = encryptPagbankCardSdk(
        await this.fetchOrdersCardPublicKey(settings),
        plainCard,
      );

      const payload = {
        reference_id: `orders-debit-3ds-${scenarioId}-${runId}`,
        customer: {
          name: customerName,
          email: customerEmail,
          tax_id: customerTaxId,
          phones: [
            { country: '55', area: '11', number: '999999999', type: 'MOBILE' },
          ],
        },
        items: [
          {
            reference_id: 'item-1',
            name: 'Teste debito 3DS sandbox Aplopes',
            quantity: 1,
            unit_amount: scenario.amountCents,
          },
        ],
        charges: [
          {
            reference_id: `charge-${runId}`,
            amount: { value: scenario.amountCents, currency: 'BRL' },
            payment_method: {
              type: 'DEBIT_CARD',
              installments: 1,
              capture: true,
              card: { encrypted, store: false },
              holder: { name: customerName, tax_id: customerTaxId },
              authentication_method: {
                type: 'THREEDS',
                id: threeDsId.trim(),
              },
            },
          },
        ],
      };

      const started = Date.now();
      const res = await this.http.request<Record<string, unknown>>(
        settings,
        'POST',
        '/orders',
        payload,
        { baseUrl: ordersBase },
      );
      const charge = (res.data.charges as Array<Record<string, unknown>>)?.[0];
      const chargeStatus = charge?.status ? String(charge.status) : null;
      const threedsStatus = (
        charge?.payment_method as { authentication_method?: { status?: string } } | undefined
      )?.authentication_method?.status;
      const paid =
        res.ok &&
        (chargeStatus === 'PAID' ||
          chargeStatus === 'AUTHORIZED' ||
          (charge?.payment_response as { message?: string })?.message === 'SUCESSO');
      const expectDeclined = scenario.group === 'auth_declined';
      const ok = expectDeclined
        ? res.ok && chargeStatus === 'DECLINED'
        : paid;

      return {
        ok,
        httpStatus: res.status,
        durationMs: Date.now() - started,
        ordersScenario: scenario,
        apiBase: ordersBase,
        endpoint: 'POST /orders (débito + 3DS id)',
        request: payload,
        response: res.data,
        error: ok ? null : formatPagbankApiError(res.data),
        expectedBehavior: scenario.behavior,
        cardStrategy: 'pagbank_sdk_authenticate3ds',
        threeDsId,
        threedsStatus: threedsStatus ?? null,
        ordersTestCard: {
          maskedPan: maskCardPan(plainCard.number),
          brand: scenario.brand,
          panKind: scenario.group,
          docUrl:
            'https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-3ds-validacao-pagbank',
        },
        chargeStatus,
        paymentType: 'DEBIT_CARD' as const,
      };
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha no teste débito 3DS';
      return {
        ok: false,
        ordersScenario: scenario,
        error: message,
        expectedBehavior: scenario.behavior,
        paymentType: 'DEBIT_CARD' as const,
      };
    }
  }

  private async runOrdersCardPaymentSandbox(tenantId: string, scenarioId: string) {
    const scenario = getOrdersTestScenario(scenarioId);
    if (!scenario) {
      throw new BadRequestException(
        `Cenário Orders "${scenarioId}" não encontrado. Use um id do catálogo orders_* (ex.: orders_visa_success).`,
      );
    }

    try {
      await this.flowGuard.assertFlowAllowed(tenantId, 'orders_credit_card');
      const settings = await this.paymentsService.getOrCreateSettings(tenantId);
      this.assertSandbox(settings);

      const runId = Date.now();
      const customerName = 'Teste Sandbox Aplopes';
      const customerEmail = sandboxCustomerEmail(scenarioId, runId);
      const customerTaxId = generateSandboxCustomerTaxId(runId);
      const ordersBase = getPagbankApiBaseUrl(settings.pagbankEnvironment);
      const ordersPlainCard = ordersScenarioToPlainCard(scenario, customerName);
      const encrypted = encryptPagbankCardSdk(
        await this.fetchOrdersCardPublicKey(settings),
        ordersPlainCard,
      );

      const payload = {
        reference_id: `orders-card-${scenarioId}-${runId}`,
        customer: {
          name: customerName,
          email: customerEmail,
          tax_id: customerTaxId,
          phones: [
            { country: '55', area: '11', number: '999999999', type: 'MOBILE' },
          ],
        },
        items: [
          {
            reference_id: 'item-1',
            name: 'Teste cartao sandbox Aplopes',
            quantity: 1,
            unit_amount: 1000,
          },
        ],
        charges: [
          {
            reference_id: `charge-${runId}`,
            amount: { value: 1000, currency: 'BRL' },
            payment_method: {
              type: 'CREDIT_CARD',
              installments: 1,
              capture: true,
              card: { encrypted, store: false },
              holder: { name: customerName, tax_id: customerTaxId },
            },
          },
        ],
      };

      const started = Date.now();
      const res = await this.http.request<Record<string, unknown>>(
        settings,
        'POST',
        '/orders',
        payload,
        { baseUrl: ordersBase },
      );
      const charge = (res.data.charges as Array<Record<string, unknown>>)?.[0];
      const chargeStatus = charge?.status ? String(charge.status) : null;
      const paid =
        res.ok &&
        (chargeStatus === 'PAID' ||
          chargeStatus === 'AUTHORIZED' ||
          (charge?.payment_response as { message?: string })?.message === 'SUCESSO');
      const expectDeclined = scenario.group === 'denied';
      const ok = expectDeclined
        ? res.ok && chargeStatus === 'DECLINED'
        : paid;

      return {
        ok,
        httpStatus: res.status,
        durationMs: Date.now() - started,
        ordersScenario: scenario,
        apiBase: ordersBase,
        endpoint: 'POST /orders (cartão criptografado)',
        request: payload,
        response: res.data,
        error: ok ? null : formatPagbankApiError(res.data),
        expectedBehavior: scenario.behavior,
        cardStrategy: 'encrypted_orders_sdk',
        ordersTestCard: {
          maskedPan: maskCardPan(ordersPlainCard.number),
          brand: scenario.brand,
          panKind: scenario.group,
          docUrl: 'https://developer.pagbank.com.br/docs/cartoes-de-teste',
        },
        chargeStatus,
        paymentType: 'CREDIT_CARD' as const,
      };
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha no teste Orders com cartão';
      return {
        ok: false,
        ordersScenario: scenario,
        error: message,
        expectedBehavior: scenario.behavior,
        paymentType: 'CREDIT_CARD' as const,
      };
    }
  }

  /**
   * Cria pedido com split + cartão (Visa aprovado) — fluxo split_create_and_pay.
   * @see https://developer.pagbank.com.br/reference/crie-e-pague-um-pedido-com-divisao-do-pagamento
   */
  async runOrdersSplitSandbox(tenantId: string) {
    const readiness = await this.evaluateSplitSandboxReadiness(tenantId);
    if (!readiness.ready) {
      return {
        ok: false,
        error: readiness.issues.join(' '),
        expectedBehavior:
          'Pedido pago com charges.splits entre adquirente e secundários; resposta deve incluir split_id (SPLI_…).',
        splitSandbox: readiness,
      };
    }

    const scenario = getOrdersTestScenario('orders_visa_success');
    if (!scenario) {
      throw new BadRequestException('Cenário orders_visa_success não encontrado');
    }

    try {
      await this.flowGuard.assertFlowAllowed(tenantId, 'split_create_and_pay');
      const settings = await this.paymentsService.getOrCreateSettings(tenantId);
      this.assertSandbox(settings);

      const splits = await this.splitService.getSplitsPayloadForFlow(
        tenantId,
        'split_create_and_pay',
      );
      if (!splits) {
        return {
          ok: false,
          error: 'Payload de split vazio — verifique recebedores e percentuais',
          splitSandbox: readiness,
        };
      }

      const runId = Date.now();
      const customerName = sandbox3dsCustomerName();
      const customerEmail = sandboxCustomerEmail('split', runId);
      const customerTaxId = generateSandboxCustomerTaxId(runId);
      const ordersBase = getPagbankApiBaseUrl(settings.pagbankEnvironment);
      const ordersPlainCard = ordersScenarioToPlainCard(scenario, customerName);
      const encrypted = encryptPagbankCardSdk(
        await this.fetchOrdersCardPublicKey(settings),
        ordersPlainCard,
      );

      const payload = {
        reference_id: `sandbox-split-${runId}`,
        customer: {
          name: customerName,
          email: customerEmail,
          tax_id: customerTaxId,
          phones: [
            { country: '55', area: '11', number: '999999999', type: 'MOBILE' },
          ],
        },
        items: [
          {
            reference_id: 'item-1',
            name: 'Teste split sandbox Aplopes',
            quantity: 1,
            unit_amount: 1000,
          },
        ],
        charges: [
          {
            reference_id: `charge-${runId}`,
            amount: { value: 1000, currency: 'BRL' },
            payment_method: {
              type: 'CREDIT_CARD',
              installments: 1,
              capture: true,
              card: { encrypted, store: false },
              holder: { name: customerName, tax_id: customerTaxId },
            },
            splits,
          },
        ],
      };

      const started = Date.now();
      const res = await this.http.request<Record<string, unknown>>(
        settings,
        'POST',
        '/orders',
        payload,
        { baseUrl: ordersBase },
      );
      const charge = (res.data.charges as Array<Record<string, unknown>>)?.[0];
      const chargeStatus = charge?.status ? String(charge.status) : null;
      const splitId = extractPagbankSplitId(res.data);
      const pagbankOrderId = res.data.id ? String(res.data.id) : null;
      const paid =
        res.ok &&
        (chargeStatus === 'PAID' ||
          chargeStatus === 'AUTHORIZED' ||
          (charge?.payment_response as { message?: string })?.message === 'SUCESSO');

      return {
        ok: paid && Boolean(splitId),
        httpStatus: res.status,
        durationMs: Date.now() - started,
        apiBase: ordersBase,
        endpoint: 'POST /orders (split_create_and_pay + cartão)',
        request: payload,
        response: res.data,
        pagbankOrderId,
        error:
          paid && splitId
            ? null
            : formatPagbankApiError(res.data) ||
              (paid
                ? 'Pagamento OK mas split_id (SPLI_…) não retornado — confira recebedores ACCO_'
                : 'Falha no pedido com split'),
        expectedBehavior:
          'Criação e pagamento com divisão; charge PAID/AUTHORIZED e splits.id na resposta.',
        cardStrategy: 'encrypted_orders_sdk + charges.splits',
        chargeStatus,
        pagbankSplitId: splitId,
        splitSandbox: readiness,
        ordersTestCard: {
          maskedPan: maskCardPan(ordersPlainCard.number),
          brand: scenario.brand,
          panKind: 'success',
          docUrl: readiness.docUrl,
        },
      };
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha no teste de split';
      return {
        ok: false,
        error: message,
        splitSandbox: readiness,
      };
    }
  }

  /**
   * Pedido com QR PIX e splits em qr_codes[0] — fluxo split_pix.
   * @see https://developer.pagbank.com.br/reference/pedido-com-divisao-de-pagamento-com-pix
   */
  async runOrdersSplitPixSandbox(tenantId: string) {
    const readiness = await this.evaluateSplitSandboxReadiness(tenantId);
    if (!readiness.pixReady) {
      return {
        ok: false,
        error: readiness.pixIssues.join(' '),
        expectedBehavior:
          'Emissão de QR PIX com splits nos recebedores; resposta deve trazer qr_codes com splits configurados.',
        splitSandbox: readiness,
      };
    }

    const started = Date.now();
    const runId = Date.now();
    try {
      await this.flowGuard.assertFlowAllowed(tenantId, 'split_pix');
      const settings = await this.paymentsService.getOrCreateSettings(tenantId);
      this.assertSandbox(settings);

      const pixExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await this.ordersService.checkout(tenantId, {
        flowId: 'split_pix',
        amountCents: 1000,
        referenceId: `sandbox-split-pix-${runId}`,
        customer: {
          name: 'Teste Split PIX Sandbox',
          email: sandboxCustomerEmail('split-pix', runId),
          taxId: generateSandboxCustomerTaxId(runId),
        },
        payment: {
          pix: {
            expiration_date: formatPagbankDateTimeBr(pixExpires),
          },
        },
      });

      const rawOrder = result.rawCreate as Record<string, unknown> | undefined;
      const qrCodes = rawOrder?.qr_codes as Array<Record<string, unknown>> | undefined;
      const qrSplits = qrCodes?.[0]?.splits as Record<string, unknown> | undefined;
      const hasPixPayload = Boolean(
        result.checkoutData?.pixCopyPaste || result.checkoutData?.pixQrCode,
      );
      const hasSplitsConfig = Boolean(
        qrSplits?.receivers || (qrSplits?.method as string | undefined),
      );
      const splitId = extractPagbankSplitId(rawOrder ?? {}) ?? result.pagbankSplitId ?? null;
      const ok =
        (result.status === PagbankTransactionStatus.WAITING_PAYMENT ||
          result.status === PagbankTransactionStatus.PAID ||
          result.status === PagbankTransactionStatus.CREATED) &&
        hasPixPayload &&
        hasSplitsConfig;

      return {
        ok,
        durationMs: Date.now() - started,
        apiBase: getPagbankApiBaseUrl(settings.pagbankEnvironment),
        endpoint: 'POST /orders (split_pix — qr_codes.splits)',
        response: result,
        error: ok
          ? null
          : result.errorMessage ??
            'QR PIX com split não gerado — verifique ACCO_ e fluxo split_pix',
        expectedBehavior:
          'QR PIX emitido com objeto splits em qr_codes; após pagamento use Consultar split (SPLI_… ou ORDE_…).',
        paymentType: 'PIX' as const,
        pagbankSplitId: splitId,
        pagbankOrderId: result.pagbankOrderId,
        transactionId: result.id,
        splitSandbox: readiness,
      };
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha no teste split PIX';
      return {
        ok: false,
        durationMs: Date.now() - started,
        error: message,
        splitSandbox: readiness,
      };
    }
  }

  /**
   * GET /splits/{id} — fluxo split_query (sandbox).
   * Informe splitId (SPLI_…), transactionId local ou pagbankOrderId (ORDE_…).
   */
  async runOrdersSplitQuerySandbox(
    tenantId: string,
    params: { splitId?: string; transactionId?: string; pagbankOrderId?: string },
  ) {
    const readiness = await this.evaluateSplitSandboxReadiness(tenantId);
    if (!readiness.queryReady) {
      return {
        ok: false,
        error: readiness.queryIssues.join(' '),
        expectedBehavior:
          'Consulta GET /splits/{split_id} retorna recebedores e status da divisão.',
        splitSandbox: readiness,
      };
    }

    const started = Date.now();
    try {
      const settings = await this.paymentsService.getOrCreateSettings(tenantId);
      this.assertSandbox(settings);

      let splitId = params.splitId?.trim() || null;
      let transactionId = params.transactionId?.trim() || null;
      let pagbankOrderId = params.pagbankOrderId?.trim() || null;

      if (!splitId && transactionId) {
        const q = await this.splitService.querySplit(tenantId, transactionId);
        return {
          ok: true,
          durationMs: Date.now() - started,
          apiBase: getPagbankApiBaseUrl(settings.pagbankEnvironment),
          endpoint: 'GET /splits/{split_id} (via transação local)',
          response: q,
          pagbankSplitId: q.pagbankSplitId,
          transactionId: q.transactionId,
          pagbankOrderId: q.pagbankOrderId,
          expectedBehavior: 'Divisão consultada com sucesso.',
          splitSandbox: readiness,
        };
      }

      if (!splitId && pagbankOrderId) {
        const orderRes = await this.http.request<Record<string, unknown>>(
          settings,
          'GET',
          `/orders/${pagbankOrderId}`,
        );
        if (!orderRes.ok) {
          return {
            ok: false,
            durationMs: Date.now() - started,
            error: formatPagbankApiError(orderRes.data) || 'Pedido PagBank não encontrado',
            endpoint: `GET /orders/${pagbankOrderId}`,
            splitSandbox: readiness,
          };
        }
        splitId = extractPagbankSplitId(orderRes.data);
        if (!splitId) {
          return {
            ok: false,
            durationMs: Date.now() - started,
            error:
              'Pedido sem split_id (SPLI_…) — pague o PIX/cartão com split antes de consultar ou informe splitId manualmente.',
            response: orderRes.data,
            pagbankOrderId,
            splitSandbox: readiness,
          };
        }
      }

      if (!splitId) {
        return {
          ok: false,
          error:
            'Informe splitId (SPLI_…), transactionId (transação local) ou pagbankOrderId (ORDE_…) do teste anterior.',
          splitSandbox: readiness,
        };
      }

      const q = await this.splitService.querySplitByPagbankId(tenantId, splitId);
      return {
        ok: true,
        durationMs: Date.now() - started,
        apiBase: getPagbankApiBaseUrl(settings.pagbankEnvironment),
        endpoint: `GET /splits/${splitId}`,
        response: q,
        pagbankSplitId: q.pagbankSplitId,
        pagbankOrderId: pagbankOrderId ?? undefined,
        transactionId: transactionId ?? undefined,
        expectedBehavior: 'Divisão consultada com sucesso.',
        splitSandbox: readiness,
      };
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha na consulta de split';
      return {
        ok: false,
        durationMs: Date.now() - started,
        error: message,
        splitSandbox: readiness,
      };
    }
  }

  async runOrdersBoletoSandbox(tenantId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'orders_boleto');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    this.assertSandbox(settings);

    const started = Date.now();
    const runId = Date.now();
    const customerName = sandbox3dsCustomerName();
    const customerEmail = sandboxCustomerEmail('boleto', runId);
    const customerTaxId = generateSandboxCustomerTaxId(runId);
    const holder = buildSandboxBoletoHolder({
      name: customerName,
      email: customerEmail,
      taxId: customerTaxId,
    });

    try {
      const result = await this.ordersService.checkout(tenantId, {
        flowId: 'orders_boleto',
        amountCents: 1000,
        referenceId: `sandbox-boleto-${runId}`,
        customer: {
          name: customerName,
          email: customerEmail,
          taxId: customerTaxId,
        },
        payment: {
          boleto: buildSandboxBoletoPaymentFields(holder),
        },
      });

      const cd = result.checkoutData as Record<string, unknown> | null | undefined;
      const hasBoleto = Boolean(
        cd?.boleto || cd?.boletoPdfUrl || cd?.boletoBarcode,
      );
      const ok =
        (result.status === PagbankTransactionStatus.WAITING_PAYMENT ||
          result.status === PagbankTransactionStatus.PAID ||
          result.status === PagbankTransactionStatus.CREATED) &&
        hasBoleto;

      return {
        ok,
        durationMs: Date.now() - started,
        apiBase: getPagbankApiBaseUrl(settings.pagbankEnvironment),
        endpoint: 'POST /orders (orders_boleto)',
        response: result,
        error: ok
          ? null
          : result.errorMessage ??
            'Boleto não gerado — verifique fluxo orders_boleto e dados do sacado',
        expectedBehavior:
          'Emissão de boleto com vencimento em 3 dias; status aguardando pagamento e link/barcode na resposta.',
        boletoPdfUrl: cd?.boletoPdfUrl as string | undefined,
        boletoBarcode: cd?.boletoBarcode as string | undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      return {
        ok: false,
        durationMs: Date.now() - started,
        apiBase: getPagbankApiBaseUrl(settings.pagbankEnvironment),
        endpoint: 'POST /orders (orders_boleto)',
        error: message,
      };
    }
  }

  async runOrdersPixSandbox(tenantId: string) {
    await this.flowGuard.assertFlowAllowed(tenantId, 'orders_pix');
    const settings = await this.paymentsService.getOrCreateSettings(tenantId);
    this.assertSandbox(settings);

    const started = Date.now();
    const runId = Date.now();
    try {
      const pixExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await this.ordersService.checkout(tenantId, {
        flowId: 'orders_pix',
        amountCents: 100,
        referenceId: `sandbox-pix-${runId}`,
        customer: {
          name: 'Teste PIX Sandbox Aplopes',
          email: sandboxCustomerEmail('pix', runId),
          taxId: generateSandboxCustomerTaxId(runId),
        },
        payment: {
          pix: {
            expiration_date: formatPagbankDateTimeBr(pixExpires),
          },
        },
      });
      const hasPixPayload = Boolean(
        result.checkoutData?.pixCopyPaste || result.checkoutData?.pixQrCode,
      );
      const ok =
        result.status === PagbankTransactionStatus.PAID ||
        (result.status === PagbankTransactionStatus.WAITING_PAYMENT && hasPixPayload) ||
        hasPixPayload;
      return {
        ok,
        durationMs: Date.now() - started,
        apiBase: getPagbankApiBaseUrl(settings.pagbankEnvironment),
        endpoint: 'POST /orders (orders_pix)',
        response: result,
        error: ok ? null : result.errorMessage ?? 'PIX não gerado — verifique token e fluxo orders_pix',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      return {
        ok: false,
        durationMs: Date.now() - started,
        apiBase: getPagbankApiBaseUrl(settings.pagbankEnvironment),
        endpoint: 'POST /orders (orders_pix)',
        error: message,
      };
    }
  }
}
