import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import { Order, PdvSettings } from '../../types';
import CatalogPageLayout from '../../components/CatalogPageLayout';

const PdvMaps: React.FC = () => {
  const { user } = useContext(AuthContext) || {};
  const [settings, setSettings] = useState<PdvSettings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [setRes, ordRes] = await Promise.all([
      api.get<PdvSettings>('/pdv/settings'),
      api.get<Order[]>('/orders', { params: { type: 'delivery', openOnly: true, limit: 30 } }),
    ]);
    setSettings(setRes.data);
    setOrders(ordRes.data.filter((o) => o.deliveryAddress));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const mapsUrl =
    settings?.mapsEmbedUrl ||
    'https://www.openstreetmap.org/export/embed.html?bbox=-46.7,-23.6,-46.5,-23.5&layer=mapnik';

  return (
    <CatalogPageLayout
      moduleLabel="PDV"
      modulePath="/pdv/online"
      title="Integração com Maps"
      description="Visualize entregas. Configure a URL do mapa em Taxa de serviço."
      loading={loading}
      loadingDescription="Carregando mapa de entregas."
    >
      <section className="catalog-surface">
        {settings?.mapsEnabled !== false ? (
          <iframe title="Mapa de entregas" src={mapsUrl} className="catalog-map-frame" loading="lazy" />
        ) : (
          <div className="catalog-empty">Mapas desativados nas configurações do PDV.</div>
        )}
      </section>

      <section className="catalog-surface">
        <div className="catalog-section-header">
          <div>
            <span className="catalog-section-kicker">Delivery</span>
            <h2>Pedidos com endereço</h2>
          </div>
          <p>{orders.length} pedido(s)</p>
        </div>
        {orders.length === 0 ? (
          <div className="catalog-empty">Nenhum pedido com endereço de entrega.</div>
        ) : (
          <div className="catalog-grid">
            {orders.map((o) => (
              <article className="catalog-card" key={o.id}>
                <div className="catalog-card-headline">
                  <strong>Pedido #{o.orderNumber}</strong>
                  <span>{o.deliveryAddress}</span>
                </div>
                {o.deliveryLat && o.deliveryLng && (
                  <div className="catalog-card-actions">
                    <a
                      className="catalog-card-button"
                      href={`https://www.google.com/maps?q=${o.deliveryLat},${o.deliveryLng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir no Google Maps
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </CatalogPageLayout>
  );
};

export default PdvMaps;
