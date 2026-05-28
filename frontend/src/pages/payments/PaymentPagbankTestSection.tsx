import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  PagbankTestPanel,
  PagbankTestRunResult,
  ensurePagbankTestPlan,
  fetchPagbankTestPanel,
  runPagbankOrdersPixTest,
  runPagbankOrdersBoletoTest,
  runPagbankOrdersSplitTest,
  runPagbankOrdersSplitPixTest,
  runPagbankOrdersSplitQueryTest,
  runPagbankOrdersCardTest,
  runPagbankOrdersDebit3dsTest,
  runPagbankRecurringTest,
} from '../../services/pagbankApi';

type Props = { canManage: boolean };

const RESULT_KEYS = {
  plan: 'result:plan',
  ordersPix: 'result:orders_pix',
  ordersBoleto: 'result:orders_boleto',
  ordersSplit: 'result:orders_split',
  ordersSplitPix: 'result:orders_split_pix',
  ordersSplitQuery: 'result:orders_split_query',
  scenario: (id: string) => `result:scenario:${id}`,
} as const;

function toggleSetItem(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

type CollapsibleBlockProps = {
  sectionId: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  className?: string;
};

const CollapsibleBlock: React.FC<CollapsibleBlockProps> = ({
  sectionId,
  title,
  meta,
  open,
  onToggle,
  children,
  className,
}) => (
  <section className={`payment-test-accordion${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}>
    <button
      type="button"
      className="payment-test-accordion-head"
      aria-expanded={open}
      onClick={() => onToggle(sectionId)}
    >
      <span className="payment-test-accordion-chevron" aria-hidden>
        {open ? '▼' : '▶'}
      </span>
      <span className="payment-test-accordion-title">{title}</span>
      {meta != null && <span className="payment-test-accordion-meta">{meta}</span>}
    </button>
    {open && <div className="payment-test-accordion-body">{children}</div>}
  </section>
);

type TestResultPanelProps = {
  resultKey: string;
  result: PagbankTestRunResult;
  open: boolean;
  onToggle: (id: string) => void;
};

const TestResultPanel: React.FC<TestResultPanelProps> = ({ resultKey, result, open, onToggle }) => (
  <div className={`payment-test-result-box${result.ok ? ' is-ok' : ' is-fail'}`}>
    <button
      type="button"
      className="payment-test-result-head"
      aria-expanded={open}
      onClick={() => onToggle(resultKey)}
    >
      <span className="payment-test-accordion-chevron" aria-hidden>
        {open ? '▼' : '▶'}
      </span>
      <span className="payment-test-result-summary">
        <span className={result.ok ? 'payment-test-ok' : 'payment-test-fail'}>
          {result.ok ? 'OK' : 'Falha'}
        </span>
        {result.durationMs != null && (
          <span className="payment-test-timing"> · {result.durationMs} ms</span>
        )}
        {result.httpStatus != null && (
          <span className="payment-test-timing"> · HTTP {result.httpStatus}</span>
        )}
      </span>
    </button>
    {open && (
      <div className="payment-test-result-body">
        {(result.scenario || result.ordersScenario) && (
          <p className="payment-test-behavior">
            Esperado:{' '}
            {result.expectedBehavior ??
              result.ordersScenario?.behavior ??
              result.scenario?.behavior}
          </p>
        )}
        {result.error && <p className="pagbank-pix-error">{result.error}</p>}
        {result.localSubscription && (
          <p className="payment-test-plan-hint">
            Assinatura local:{' '}
            <code>{result.localSubscription.pagbankSubscriptionId}</code> —{' '}
            {result.localSubscription.status}
          </p>
        )}
        {result.attempts && result.attempts.length > 0 && (
          <details open>
            <summary>Tentativas ({result.attempts.length})</summary>
            <pre className="payment-test-json">
              {JSON.stringify(result.attempts, null, 2)}
            </pre>
          </details>
        )}
        {result.ordersTestCard && (
          <p className="payment-test-plan-hint">
            Cartão Pedidos ({result.ordersTestCard.brand}):{' '}
            <code>{result.ordersTestCard.maskedPan}</code>
            {result.ordersTestCard.note ? <> — {result.ordersTestCard.note}</> : null}
          </p>
        )}
        {result.endpoint && (
          <p className="payment-test-meta">
            {result.endpoint}
            {result.apiBase && <> · {result.apiBase}</>}
            {result.cardStrategy && <> · estratégia: {result.cardStrategy}</>}
            {result.chargeStatus && <> · charge: {result.chargeStatus}</>}
        {result.boletoPdfUrl && (
          <>
            {' '}
            ·{' '}
            <a href={result.boletoPdfUrl} target="_blank" rel="noreferrer">
              PDF boleto
            </a>
          </>
        )}
        {result.boletoBarcode && (
          <> · linha digitável: <code>{result.boletoBarcode}</code></>
        )}
        {result.pagbankSplitId && (
          <> · split: <code>{result.pagbankSplitId}</code></>
        )}
        {result.pagbankOrderId && (
          <> · pedido: <code>{result.pagbankOrderId}</code></>
        )}
        {result.transactionId && (
          <> · tx local: <code>{result.transactionId}</code></>
        )}
            {result.threeDsId && <> · 3DS: {result.threeDsId}</>}
            {result.threedsStatus && <> · auth: {result.threedsStatus}</>}
          </p>
        )}
        <details open>
          <summary>Resposta PagBank (última tentativa)</summary>
          <pre className="payment-test-json">
            {JSON.stringify(
              result.response &&
                typeof result.response === 'object' &&
                Object.keys(result.response as object).length > 0
                ? result.response
                : result.attempts?.[result.attempts.length - 1]?.response ?? result,
              null,
              2,
            )}
          </pre>
        </details>
        {(result.request != null ||
          result.attempts?.[result.attempts.length - 1]?.request) && (
          <details open>
            <summary>Requisição enviada (última tentativa)</summary>
            <pre className="payment-test-json">
              {JSON.stringify(
                result.request ??
                  result.attempts?.[result.attempts.length - 1]?.request,
                null,
                2,
              )}
            </pre>
          </details>
        )}
      </div>
    )}
  </div>
);

const PaymentPagbankTestSection: React.FC<Props> = ({ canManage }) => {
  const [panel, setPanel] = useState<PagbankTestPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, PagbankTestRunResult>>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [openScenarios, setOpenScenarios] = useState<Set<string>>(new Set());
  const [openResults, setOpenResults] = useState<Set<string>>(new Set());
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [splitQuerySplitId, setSplitQuerySplitId] = useState('');
  const [splitQueryOrderId, setSplitQueryOrderId] = useState('');
  const [splitQueryTransactionId, setSplitQueryTransactionId] = useState('');

  const setResult = (key: string, result: PagbankTestRunResult) => {
    setResults((prev) => ({ ...prev, [key]: result }));
  };

  const captureSplitRefs = (result: PagbankTestRunResult) => {
    if (result.pagbankSplitId) setSplitQuerySplitId(result.pagbankSplitId);
    if (result.pagbankOrderId) setSplitQueryOrderId(result.pagbankOrderId);
    if (result.transactionId) setSplitQueryTransactionId(result.transactionId);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPanel(await fetchPagbankTestPanel());
      setError(null);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erro ao carregar painel de testes',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groupedRecurring = useMemo(() => {
    if (!panel) return [];
    const map = new Map<string, typeof panel.scenarios>();
    for (const s of panel.scenarios) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return Array.from(map.entries()).filter(([g]) => filterGroup === 'all' || g === filterGroup);
  }, [panel, filterGroup]);

  const groupedOrders = useMemo(() => {
    if (!panel?.ordersScenarios?.length) return [];
    const map = new Map<string, NonNullable<PagbankTestPanel['ordersScenarios']>>();
    for (const s of panel.ordersScenarios) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return Array.from(map.entries());
  }, [panel]);

  const groupedOrders3ds = useMemo(() => {
    if (!panel?.orders3dsScenarios?.length) return [];
    const map = new Map<string, NonNullable<PagbankTestPanel['orders3dsScenarios']>>();
    for (const s of panel.orders3dsScenarios) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return Array.from(map.entries());
  }, [panel]);

  const runScenario = async (scenarioId: string) => {
    const resultKey = RESULT_KEYS.scenario(scenarioId);
    setRunningId(scenarioId);
    setError(null);
    try {
      setResult(resultKey, await runPagbankRecurringTest(scenarioId));
      const group = panel?.scenarios.find((s) => s.id === scenarioId)?.group;
      if (group) {
        setOpenSections((prev) => new Set(prev).add(`group:${group}`));
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha ao executar teste';
      setResult(resultKey, { ok: false, error: msg });
    } finally {
      setRunningId(null);
    }
  };

  const preparePlan = async () => {
    setRunningId('plan');
    setError(null);
    try {
      const res = await ensurePagbankTestPlan();
      const plan = (res as { plan?: NonNullable<PagbankTestPanel['testPlan']> }).plan;
      if (plan) {
        setPanel((p) => (p ? { ...p, testPlan: plan } : p));
      }
      setResult(RESULT_KEYS.plan, {
        ok: Boolean(
          (res as { ok?: boolean }).ok ??
            (res as { plan?: unknown }).plan,
        ),
        endpoint: 'POST /plans',
        response: res,
        error: (res as { error?: string }).error ?? null,
      });
      setOpenSections((prev) => new Set(prev).add('setup'));
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Erro ao criar plano de teste',
      );
    } finally {
      setRunningId(null);
    }
  };

  const runPix = async () => {
    setRunningId('orders_pix');
    setError(null);
    try {
      setResult(RESULT_KEYS.ordersPix, await runPagbankOrdersPixTest());
      setOpenSections((prev) => new Set(prev).add('setup'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha no teste PIX';
      setError(msg);
      setResult(RESULT_KEYS.ordersPix, { ok: false, error: msg });
    } finally {
      setRunningId(null);
    }
  };

  const runSplit = async () => {
    setRunningId('orders_split');
    setError(null);
    try {
      const result = await runPagbankOrdersSplitTest();
      setResult(RESULT_KEYS.ordersSplit, result);
      captureSplitRefs(result);
      setOpenSections((prev) => new Set(prev).add('split-sandbox'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha no teste split';
      setError(msg);
      setResult(RESULT_KEYS.ordersSplit, { ok: false, error: msg });
    } finally {
      setRunningId(null);
    }
  };

  const runSplitPix = async () => {
    setRunningId('orders_split_pix');
    setError(null);
    try {
      const result = await runPagbankOrdersSplitPixTest();
      setResult(RESULT_KEYS.ordersSplitPix, result);
      captureSplitRefs(result);
      setOpenSections((prev) => new Set(prev).add('split-sandbox'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha no teste split PIX';
      setError(msg);
      setResult(RESULT_KEYS.ordersSplitPix, { ok: false, error: msg });
    } finally {
      setRunningId(null);
    }
  };

  const runSplitQuery = async () => {
    setRunningId('orders_split_query');
    setError(null);
    try {
      const result = await runPagbankOrdersSplitQueryTest({
        splitId: splitQuerySplitId.trim() || undefined,
        pagbankOrderId: splitQueryOrderId.trim() || undefined,
        transactionId: splitQueryTransactionId.trim() || undefined,
      });
      setResult(RESULT_KEYS.ordersSplitQuery, result);
      captureSplitRefs(result);
      setOpenSections((prev) => new Set(prev).add('split-sandbox'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha na consulta de split';
      setError(msg);
      setResult(RESULT_KEYS.ordersSplitQuery, { ok: false, error: msg });
    } finally {
      setRunningId(null);
    }
  };

  const runBoleto = async () => {
    setRunningId('orders_boleto');
    setError(null);
    try {
      setResult(RESULT_KEYS.ordersBoleto, await runPagbankOrdersBoletoTest());
      setOpenSections((prev) => new Set(prev).add('setup'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Falha no teste boleto';
      setError(msg);
      setResult(RESULT_KEYS.ordersBoleto, { ok: false, error: msg });
    } finally {
      setRunningId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="payment-tools-block payment-test-panel">
      <p className="payment-settings-doc">
        Testes no <strong>Sandbox</strong> conforme{' '}
        <a href={panel?.docUrl} target="_blank" rel="noreferrer">
          Testar integração — Pagamentos Recorrentes
        </a>
        . Use token de <strong>teste</strong>; não use cartões reais. Criptografia conforme{' '}
        <a
          href="https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-cartao"
          target="_blank"
          rel="noreferrer"
        >
          Criar e pagar pedido com cartão
        </a>{' '}
        (chave POST /public-keys na API Orders + SDK). <strong>Pedidos — cartões de teste</strong>:{' '}
        <a
          href={panel?.ordersTestCardsDocUrl ?? 'https://developer.pagbank.com.br/docs/cartoes-de-teste'}
          target="_blank"
          rel="noreferrer"
        >
          Visa, Mastercard, Amex, Elo e Hiper
        </a>{' '}
        (aprovados e negados, exp. 12/2030). <strong>Débito 3DS</strong>: cartões e valores da{' '}
        <a
          href={
            panel?.orders3dsDocUrl ??
            'https://developer.pagbank.com.br/reference/criar-pagar-pedido-com-3ds-validacao-pagbank'
          }
          target="_blank"
          rel="noreferrer"
        >
          doc 3DS PagBank
        </a>{' '}
        (SDK no browser + <code>authentication_method.id</code>). Fluxos:{' '}
        <code>orders_debit_card</code>, <code>orders_3ds_pagbank</code>.{' '}
        <strong>Assinaturas</strong> usam token{' '}
        <code>CARD_*</code> da{' '}
        <a href={panel?.docUrl} target="_blank" rel="noreferrer">
          doc de recorrência
        </a>
        . Recorrência:{' '}
        <code>{panel?.apiBases.subscriptions}</code> · Pedidos:{' '}
        <code>{panel?.apiBases.orders}</code>
      </p>

      {!panel?.isSandbox && (
        <p className="pagbank-pix-error">
          Ambiente atual: <strong>{panel?.environment}</strong>. Altere para <em>sandbox</em> na aba
          Geral para habilitar os testes.
        </p>
      )}

      {!panel?.tokenConfigured && (
        <p className="pagbank-pix-error">Configure o token PagBank na aba Geral.</p>
      )}

      {error && <p className="pagbank-pix-error">{error}</p>}

      <div className="payment-test-toolbar">
        <select
          className="premium-text-input"
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          style={{ maxWidth: 280 }}
          aria-label="Filtrar grupo de testes"
        >
          <option value="all">Todos os grupos</option>
          {panel &&
            Object.entries(panel.groupLabels).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
        </select>
      </div>

      {panel?.testPlan && (
        <p className="payment-test-plan-hint">
          Plano ativo: <code>{panel.testPlan.pagbankPlanId}</code> ({panel.testPlan.name})
        </p>
      )}

      <CollapsibleBlock
        sectionId="setup"
        title="Preparação (plano, PIX e boleto)"
        meta={panel?.testPlan ? 'plano OK' : 'sem plano'}
        open={openSections.has('setup')}
        onToggle={(id) => toggleSetItem(setOpenSections, id)}
        className="payment-test-accordion--setup"
      >
        {canManage && panel?.isSandbox && (
          <div className="payment-test-toolbar payment-test-toolbar--inner">
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--primary"
              onClick={preparePlan}
              disabled={runningId === 'plan'}
            >
              {runningId === 'plan'
                ? 'Criando…'
                : panel.testPlan
                  ? 'Plano de teste OK'
                  : 'Criar plano de teste (R$ 10,00/mês)'}
            </button>
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={runPix}
              disabled={runningId === 'orders_pix'}
            >
              {runningId === 'orders_pix' ? 'Executando…' : 'Testar PIX (Orders API)'}
            </button>
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={runBoleto}
              disabled={runningId === 'orders_boleto'}
            >
              {runningId === 'orders_boleto' ? 'Executando…' : 'Gerar boleto (Orders API)'}
            </button>
          </div>
        )}
        {panel?.ordersBoletoDocUrl && (
          <p className="payment-test-plan-hint">
            Boleto:{' '}
            <a href={panel.ordersBoletoDocUrl} target="_blank" rel="noreferrer">
              criar e pagar pedido com boleto
            </a>
            . Ative o fluxo <code>orders_boleto</code> em Configuração.
          </p>
        )}
        {results[RESULT_KEYS.plan] && (
          <TestResultPanel
            resultKey={RESULT_KEYS.plan}
            result={results[RESULT_KEYS.plan]}
            open={openResults.has(RESULT_KEYS.plan)}
            onToggle={(id) => toggleSetItem(setOpenResults, id)}
          />
        )}
        {results[RESULT_KEYS.ordersPix] && (
          <TestResultPanel
            resultKey={RESULT_KEYS.ordersPix}
            result={results[RESULT_KEYS.ordersPix]}
            open={openResults.has(RESULT_KEYS.ordersPix)}
            onToggle={(id) => toggleSetItem(setOpenResults, id)}
          />
        )}
        {results[RESULT_KEYS.ordersBoleto] && (
          <TestResultPanel
            resultKey={RESULT_KEYS.ordersBoleto}
            result={results[RESULT_KEYS.ordersBoleto]}
            open={openResults.has(RESULT_KEYS.ordersBoleto)}
            onToggle={(id) => toggleSetItem(setOpenResults, id)}
          />
        )}
      </CollapsibleBlock>

      <CollapsibleBlock
        sectionId="split-sandbox"
        title="Split — divisão de pagamento"
        meta={
          panel?.splitSandbox?.ready &&
          panel.splitSandbox.pixReady &&
          panel.splitSandbox.queryReady
            ? 'pronto'
            : 'configurar'
        }
        open={openSections.has('split-sandbox')}
        onToggle={(id) => toggleSetItem(setOpenSections, id)}
        className="payment-test-accordion--split"
      >
        <p className="payment-test-plan-hint">
          É possível testar split no <strong>sandbox</strong> da PagBank. Use contas{' '}
          <code>ACCO_…</code> reais do ambiente de testes (adquirente + ao menos um secundário).{' '}
          <a
            href={
              panel?.splitSandbox?.docUrl ??
              'https://developer.pagbank.com.br/reference/divisao-de-pagamento'
            }
            target="_blank"
            rel="noreferrer"
          >
            Documentação split
          </a>
          .
        </p>
        {panel?.splitSandbox && (
          <>
            {!panel.splitSandbox.ready && panel.splitSandbox.issues.length > 0 && (
              <>
                <p className="payment-test-plan-hint">
                  <strong>Split + cartão</strong>
                </p>
                <ul className="payment-test-checklist">
                  {panel.splitSandbox.issues.map((issue) => (
                    <li key={`card-${issue}`}>{issue}</li>
                  ))}
                </ul>
              </>
            )}
            {!panel.splitSandbox.pixReady && panel.splitSandbox.pixIssues?.length > 0 && (
              <>
                <p className="payment-test-plan-hint">
                  <strong>Split + PIX</strong>{' '}
                  <a href={panel.splitSandbox.pixDocUrl} target="_blank" rel="noreferrer">
                    doc
                  </a>
                </p>
                <ul className="payment-test-checklist">
                  {panel.splitSandbox.pixIssues.map((issue) => (
                    <li key={`pix-${issue}`}>{issue}</li>
                  ))}
                </ul>
              </>
            )}
            {!panel.splitSandbox.queryReady && panel.splitSandbox.queryIssues?.length > 0 && (
              <>
                <p className="payment-test-plan-hint">
                  <strong>Consultar split</strong>{' '}
                  <a href={panel.splitSandbox.queryDocUrl} target="_blank" rel="noreferrer">
                    doc
                  </a>
                </p>
                <ul className="payment-test-checklist">
                  {panel.splitSandbox.queryIssues.map((issue) => (
                    <li key={`query-${issue}`}>{issue}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        {panel?.splitSandbox?.ready && (
          <p className="payment-test-plan-hint">
            Adquirente: <code>{panel.splitSandbox.masterAccountId}</code> ·{' '}
            {panel.splitSandbox.secondaryReceivers} recebedor(es) secundário(s)
          </p>
        )}
        {canManage && panel?.isSandbox && (
          <div className="payment-test-toolbar payment-test-toolbar--inner payment-test-toolbar--wrap">
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={runSplit}
              disabled={runningId === 'orders_split' || !panel?.splitSandbox?.ready}
              title="POST /orders com charges.splits + cartão Visa sandbox"
            >
              {runningId === 'orders_split' ? 'Executando…' : 'Split + cartão'}
            </button>
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={runSplitPix}
              disabled={runningId === 'orders_split_pix' || !panel?.splitSandbox?.pixReady}
              title="POST /orders com qr_codes.splits (split_pix)"
            >
              {runningId === 'orders_split_pix' ? 'Executando…' : 'Split + PIX'}
            </button>
          </div>
        )}
        {canManage && panel?.isSandbox && panel?.splitSandbox?.queryReady && (
          <div className="payment-test-split-query">
            <p className="payment-test-plan-hint">
              Consulta <code>GET /splits/&#123;id&#125;</code> — preencha um identificador (ou use o
              último teste acima).
            </p>
            <div className="payment-test-split-query-fields">
              <label>
                SPLI_
                <input
                  type="text"
                  className="catalog-form-input"
                  value={splitQuerySplitId}
                  onChange={(e) => setSplitQuerySplitId(e.target.value)}
                  placeholder="SPLI_…"
                />
              </label>
              <label>
                ORDE_
                <input
                  type="text"
                  className="catalog-form-input"
                  value={splitQueryOrderId}
                  onChange={(e) => setSplitQueryOrderId(e.target.value)}
                  placeholder="ORDE_…"
                />
              </label>
              <label>
                Tx local
                <input
                  type="text"
                  className="catalog-form-input"
                  value={splitQueryTransactionId}
                  onChange={(e) => setSplitQueryTransactionId(e.target.value)}
                  placeholder="UUID transação"
                />
              </label>
            </div>
            <button
              type="button"
              className="catalog-form-footer-btn catalog-form-footer-btn--ghost"
              onClick={runSplitQuery}
              disabled={runningId === 'orders_split_query'}
            >
              {runningId === 'orders_split_query' ? 'Consultando…' : 'Consultar split'}
            </button>
          </div>
        )}
        {panel?.splitSandbox?.splitsPreview != null && (
          <details>
            <summary>Preview charges.splits (cartão)</summary>
            <pre className="payment-test-json">
              {JSON.stringify(panel.splitSandbox.splitsPreview, null, 2)}
            </pre>
          </details>
        )}
        {panel?.splitSandbox?.splitsPixPreview != null && (
          <details>
            <summary>Preview qr_codes.splits (PIX)</summary>
            <pre className="payment-test-json">
              {JSON.stringify(panel.splitSandbox.splitsPixPreview, null, 2)}
            </pre>
          </details>
        )}
        {results[RESULT_KEYS.ordersSplit] && (
          <TestResultPanel
            resultKey={RESULT_KEYS.ordersSplit}
            result={results[RESULT_KEYS.ordersSplit]}
            open={openResults.has(RESULT_KEYS.ordersSplit)}
            onToggle={(id) => toggleSetItem(setOpenResults, id)}
          />
        )}
        {results[RESULT_KEYS.ordersSplitPix] && (
          <TestResultPanel
            resultKey={RESULT_KEYS.ordersSplitPix}
            result={results[RESULT_KEYS.ordersSplitPix]}
            open={openResults.has(RESULT_KEYS.ordersSplitPix)}
            onToggle={(id) => toggleSetItem(setOpenResults, id)}
          />
        )}
        {results[RESULT_KEYS.ordersSplitQuery] && (
          <TestResultPanel
            resultKey={RESULT_KEYS.ordersSplitQuery}
            result={results[RESULT_KEYS.ordersSplitQuery]}
            open={openResults.has(RESULT_KEYS.ordersSplitQuery)}
            onToggle={(id) => toggleSetItem(setOpenResults, id)}
          />
        )}
      </CollapsibleBlock>

      {groupedOrders.map(([group, scenarios]) => {
        const sectionId = `orders-group:${group}`;
        return (
          <CollapsibleBlock
            key={sectionId}
            sectionId={sectionId}
            title={
              <>
                Pedidos — {panel?.ordersGroupLabels?.[group] ?? group}
              </>
            }
            meta={`${scenarios.length} ${scenarios.length === 1 ? 'cartão' : 'cartões'}`}
            open={openSections.has(sectionId)}
            onToggle={(id) => toggleSetItem(setOpenSections, id)}
            className="payment-test-accordion--orders"
          >
            <ul className="payment-test-scenario-list">
              {scenarios.map((s) => {
                const scenarioKey = `orders-scenario:${s.id}`;
                const resultKey = `orders:${s.id}`;
                const scenarioOpen = openScenarios.has(scenarioKey);
                return (
                  <li key={s.id} className="payment-test-scenario">
                    <div className="payment-test-scenario-row">
                      <button
                        type="button"
                        className="payment-test-scenario-toggle"
                        aria-expanded={scenarioOpen}
                        onClick={() => toggleSetItem(setOpenScenarios, scenarioKey)}
                      >
                        <span className="payment-test-accordion-chevron" aria-hidden>
                          {scenarioOpen ? '▼' : '▶'}
                        </span>
                        <span className="payment-test-scenario-label">
                          <strong>{s.label}</strong>
                          <span className="catalog-pill is-muted catalog-pill--sm">{s.brand}</span>
                        </span>
                      </button>
                      {canManage && panel?.isSandbox && (
                        <div className="payment-test-run-actions">
                          <button
                            type="button"
                            className="catalog-form-footer-btn catalog-form-footer-btn--ghost payment-test-run-btn"
                            disabled={runningId !== null}
                            title="POST /orders — crédito criptografado"
                            onClick={async () => {
                              const runKey = `${s.id}:credit`;
                              setRunningId(runKey);
                              setError(null);
                              try {
                                setResult(resultKey, await runPagbankOrdersCardTest(s.id));
                                setOpenSections((prev) => new Set(prev).add(sectionId));
                              } catch (err: unknown) {
                                const msg =
                                  (err as { response?: { data?: { message?: string } } })
                                    ?.response?.data?.message || 'Falha no teste Orders';
                                setResult(resultKey, {
                                  ok: false,
                                  error: msg,
                                  ordersScenario: s,
                                });
                              } finally {
                                setRunningId(null);
                              }
                            }}
                          >
                            {runningId === `${s.id}:credit` ? 'Executando…' : 'Crédito'}
                          </button>
                        </div>
                      )}
                    </div>
                    {scenarioOpen && (
                      <div className="payment-test-scenario-details">
                        <p className="payment-test-behavior">{s.behavior}</p>
                        <p className="payment-test-meta">
                          <span title={s.cardNumber}>
                            {s.cardNumber.slice(0, 4)}…{s.cardNumber.slice(-4)}
                          </span>
                          · CVV {s.securityCode} · {s.expMonth}/{s.expYear}
                        </p>
                      </div>
                    )}
                    {results[resultKey] && (
                      <TestResultPanel
                        resultKey={resultKey}
                        result={results[resultKey]}
                        open={openResults.has(resultKey)}
                        onToggle={(id) => toggleSetItem(setOpenResults, id)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </CollapsibleBlock>
        );
      })}

      {groupedOrders3ds.map(([group, scenarios]) => {
        const sectionId = `orders-3ds-group:${group}`;
        return (
          <CollapsibleBlock
            key={sectionId}
            sectionId={sectionId}
            title={<>Pedidos — débito 3DS — {panel?.orders3dsGroupLabels?.[group] ?? group}</>}
            meta={`${scenarios.length} cenário${scenarios.length === 1 ? '' : 's'}`}
            open={openSections.has(sectionId)}
            onToggle={(id) => toggleSetItem(setOpenSections, id)}
            className="payment-test-accordion--orders-3ds"
          >
            <ul className="payment-test-scenario-list">
              {scenarios.map((s) => {
                const scenarioKey = `orders-3ds-scenario:${s.id}`;
                const resultKey = `orders-3ds:${s.id}`;
                const scenarioOpen = openScenarios.has(scenarioKey);
                return (
                  <li key={s.id} className="payment-test-scenario">
                    <div className="payment-test-scenario-row">
                      <button
                        type="button"
                        className="payment-test-scenario-toggle"
                        aria-expanded={scenarioOpen}
                        onClick={() => toggleSetItem(setOpenScenarios, scenarioKey)}
                      >
                        <span className="payment-test-accordion-chevron" aria-hidden>
                          {scenarioOpen ? '▼' : '▶'}
                        </span>
                        <span className="payment-test-scenario-label">
                          <strong>{s.label}</strong>
                          <span className="catalog-pill is-muted catalog-pill--sm">{s.brand}</span>
                        </span>
                      </button>
                      {canManage && panel?.isSandbox && (
                        <div className="payment-test-run-actions">
                          <button
                            type="button"
                            className="catalog-form-footer-btn catalog-form-footer-btn--ghost payment-test-run-btn"
                            disabled={runningId !== null}
                            title="SDK authenticate3DS + POST /orders com authentication_method.id"
                            onClick={async () => {
                              setRunningId(s.id);
                              setError(null);
                              try {
                                setResult(resultKey, await runPagbankOrdersDebit3dsTest(s.id));
                                setOpenSections((prev) => new Set(prev).add(sectionId));
                              } catch (err: unknown) {
                                const msg =
                                  err instanceof Error
                                    ? err.message
                                    : (err as { response?: { data?: { message?: string } } })
                                        ?.response?.data?.message || 'Falha no teste débito 3DS';
                                setResult(resultKey, {
                                  ok: false,
                                  error: msg,
                                  ordersScenario: s,
                                });
                              } finally {
                                setRunningId(null);
                              }
                            }}
                          >
                            {runningId === s.id ? '3DS + débito…' : 'Débito 3DS'}
                          </button>
                        </div>
                      )}
                    </div>
                    {scenarioOpen && (
                      <div className="payment-test-scenario-details">
                        <p className="payment-test-behavior">{s.behavior}</p>
                        <p className="payment-test-meta">
                          <span title={s.cardNumber}>
                            {s.cardNumber.slice(0, 4)}…{s.cardNumber.slice(-4)}
                          </span>
                          · CVV {s.securityCode} · {s.expMonth}/{s.expYear} · R${' '}
                          {(s.amountCents / 100).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    )}
                    {results[resultKey] && (
                      <TestResultPanel
                        resultKey={resultKey}
                        result={results[resultKey]}
                        open={openResults.has(resultKey)}
                        onToggle={(id) => toggleSetItem(setOpenResults, id)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </CollapsibleBlock>
        );
      })}

      {groupedRecurring.map(([group, scenarios]) => {
        const sectionId = `group:${group}`;
        return (
          <CollapsibleBlock
            key={group}
            sectionId={sectionId}
            title={panel?.groupLabels[group] ?? group}
            meta={`${scenarios.length} teste${scenarios.length === 1 ? '' : 's'}`}
            open={openSections.has(sectionId)}
            onToggle={(id) => toggleSetItem(setOpenSections, id)}
          >
            <ul className="payment-test-scenario-list">
              {scenarios.map((s) => {
                const scenarioKey = `scenario:${s.id}`;
                const resultKey = RESULT_KEYS.scenario(s.id);
                const scenarioOpen = openScenarios.has(scenarioKey);
                return (
                  <li key={s.id} className="payment-test-scenario">
                    <div className="payment-test-scenario-row">
                      <button
                        type="button"
                        className="payment-test-scenario-toggle"
                        aria-expanded={scenarioOpen}
                        onClick={() => toggleSetItem(setOpenScenarios, scenarioKey)}
                      >
                        <span className="payment-test-accordion-chevron" aria-hidden>
                          {scenarioOpen ? '▼' : '▶'}
                        </span>
                        <span className="payment-test-scenario-label">
                          <strong>{s.label}</strong>
                          <span className="catalog-pill is-muted catalog-pill--sm">{s.brand}</span>
                        </span>
                      </button>
                      {canManage && panel?.isSandbox && (
                        <button
                          type="button"
                          className="catalog-form-footer-btn catalog-form-footer-btn--ghost payment-test-run-btn"
                          disabled={!panel?.testPlan || runningId !== null}
                          onClick={() => runScenario(s.id)}
                        >
                          {runningId === s.id ? 'Executando…' : 'Assinatura'}
                        </button>
                      )}
                    </div>
                    {scenarioOpen && (
                      <div className="payment-test-scenario-details">
                        <p className="payment-test-behavior">{s.behavior}</p>
                        <p className="payment-test-meta">
                          <span title={s.cardNumber}>•••• {s.cardNumber.slice(-4)}</span>
                          <span className="payment-test-token" title={s.cardToken}>
                            {s.cardToken.slice(0, 18)}…
                          </span>
                        </p>
                      </div>
                    )}
                    {results[resultKey] && (
                      <TestResultPanel
                        resultKey={resultKey}
                        result={results[resultKey]}
                        open={openResults.has(resultKey)}
                        onToggle={(id) => toggleSetItem(setOpenResults, id)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </CollapsibleBlock>
        );
      })}
    </div>
  );
};

export default PaymentPagbankTestSection;
