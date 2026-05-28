import { MenuChannel } from '../../types';

export function menuChannelLabel(channel: MenuChannel): string {
  return channel === 'mesa' ? 'Cardápio para mesa' : 'Cardápio para delivery';
}

export function menuChannelBadge(channel: MenuChannel): string {
  return channel === 'mesa' ? 'Mesa' : 'Delivery';
}
