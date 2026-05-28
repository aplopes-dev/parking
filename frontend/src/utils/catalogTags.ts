/**
 * Classes padrão de tags (Catalog.css).
 * — catalog-section-kicker: rótulos de seção (Equipe, Cadastro, Listagem…)
 * — catalog-pill + modificadores: estado, perfil, categorias em cards
 */

export const SECTION_KICKER_CLASS = 'catalog-section-kicker';

export const ROLE_PILL_CLASS = 'catalog-pill is-role';

export function activeStatusPillClass(_active: boolean): string {
  return 'catalog-pill is-muted';
}

/** Status de mesa no SmartPOS. */
export function tableStatusPillClass(status: string): string {
  const base = 'catalog-pill catalog-pill--sm';
  switch (status) {
    case 'open':
      return `${base} is-role`;
    case 'payment_pending':
      return `${base} is-warning`;
    case 'closed':
    case 'free':
    default:
      return `${base} is-muted`;
  }
}
