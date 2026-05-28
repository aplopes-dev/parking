import React, { useContext, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './AssistantWidget.css';

type WidgetMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

type QuickAction = {
  id: string;
  label: string;
  kind: 'send' | 'prefill';
  value: string;
};

const COMING_SOON_REPLY =
  'Esta funcionalidade será implementada em breve. Enquanto isso, use o menu lateral para navegar pelos módulos do sistema.';

const AssistantIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3c4.97 0 9 3.13 9 7s-4.03 7-9 7c-.86 0-1.69-.1-2.47-.29L5 20l1.47-3.53C5.55 15.17 3 12.28 3 10c0-3.87 4.03-7 9-7Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="10" r="1.1" fill="currentColor" />
    <circle cx="12" cy="10" r="1.1" fill="currentColor" />
    <circle cx="15" cy="10" r="1.1" fill="currentColor" />
  </svg>
);

const AssistantWidget: React.FC = () => {
  const authContext = useContext(AuthContext);
  const { user } = authContext || {};
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content:
        'Oi! Sou seu assistente do Aplopes Food. Posso responder sobre saldo, comparativos, categorias, fontes e lançamentos — assim que a integração estiver ativa.',
    },
  ]);

  const canUseAssistant = useMemo(
    () => Boolean(user),
    [user],
  );

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: 'expense',
        label: 'Cadastrar despesa',
        kind: 'prefill',
        value: 'despesa pix restaurante 31,34 hoje',
      },
      {
        id: 'income',
        label: 'Cadastrar receita',
        kind: 'prefill',
        value: 'receita banco aluguel 1500,00',
      },
      {
        id: 'balance',
        label: 'Ver saldo',
        kind: 'send',
        value: 'qual é o saldo atual?',
      },
      {
        id: 'comparison',
        label: 'Comparar período',
        kind: 'send',
        value: 'compare o mês atual com o anterior',
      },
      {
        id: 'reports',
        label: 'Abrir relatórios',
        kind: 'send',
        value: 'quero abrir os relatórios',
      },
    ],
    [],
  );

  const transactionExamples = useMemo(
    () => [
      'despesa pix restaurante 31,34 hoje',
      'despesa cartão gasolina 89,90 ontem',
      'receita banco aluguel 1500,00',
    ],
    [],
  );

  if (!canUseAssistant) {
    return null;
  }

  const sendMessage = async (messageText: string): Promise<void> => {
    const trimmedInput = messageText.trim();
    if (!trimmedInput || isSending) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', content: trimmedInput },
    ]);
    setInput('');
    setIsSending(true);

    try {
      // API do assistente será reconectada na implementação do módulo financeiro/IA
      await new Promise((resolve) => setTimeout(resolve, 400));
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: COMING_SOON_REPLY,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className={`assistant-widget${isOpen ? ' is-open' : ''}`}>
      {isOpen && (
        <div className="assistant-widget-panel">
          <div className="assistant-widget-header">
            <div>
              <span className="catalog-section-kicker">Assistente IA</span>
              <strong>Contexto da sua conta</strong>
            </div>
            <button
              type="button"
              className="assistant-widget-close"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar assistente"
            >
              ×
            </button>
          </div>

          <div className="assistant-widget-shortcuts">
            <div className="assistant-widget-section">
              <span className="assistant-widget-section-title">Ações rápidas</span>
              <div className="assistant-widget-chip-list">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="assistant-widget-chip"
                    onClick={() => {
                      if (action.kind === 'prefill') {
                        setInput(action.value);
                        return;
                      }
                      void sendMessage(action.value);
                    }}
                    disabled={isSending}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="assistant-widget-section">
              <span className="assistant-widget-section-title">Formato rápido</span>
              <p className="assistant-widget-hint">
                Use: tipo + meio + categoria/descrição + valor + data opcional.
              </p>
              <div className="assistant-widget-example-list">
                {transactionExamples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="assistant-widget-example"
                    onClick={() => setInput(example)}
                    disabled={isSending}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="assistant-widget-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`assistant-widget-message assistant-widget-message-${message.role}`}
              >
                <p>{message.content}</p>
              </div>
            ))}
            {isSending && (
              <div className="assistant-widget-message assistant-widget-message-assistant">
                <p>Consultando os dados e preparando uma resposta...</p>
              </div>
            )}
          </div>

          <form className="assistant-widget-form" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: despesa pix restaurante 31,34 hoje"
              rows={3}
              disabled={isSending}
            />
            <button type="submit" disabled={isSending || !input.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="assistant-widget-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? 'Fechar assistente' : 'Abrir assistente'}
        aria-expanded={isOpen}
      >
        <AssistantIcon />
      </button>
    </div>
  );
};

export default AssistantWidget;
