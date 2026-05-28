import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  fetchAccessibleStores,
  type AccessibleStore,
} from '../services/multistoreApi';
import './AppTopbarStoreSwitch.css';

const AppTopbarStoreSwitch: React.FC = () => {
  const auth = useContext(AuthContext);
  const [stores, setStores] = useState<AccessibleStore[]>([]);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAccessibleStores();
      if (!data.inGroup) {
        setStores([]);
        setGroupName(null);
        return;
      }
      setGroupName(data.group?.name ?? null);
      setStores(data.stores.filter((s) => s.canSwitch));
    } catch {
      setStores([]);
    }
  }, []);

  useEffect(() => {
    if (!auth?.user) return;
    if (!auth.user.role) return;
    void load();
  }, [auth?.user, auth?.user?.tenantId, load]);

  if (!stores.length || stores.length < 2) return null;

  const current = stores.find((s) => s.isCurrent);

  const onChange = async (tenantId: string) => {
    if (!tenantId || tenantId === auth?.user?.tenantId || !auth?.switchTenant) return;
    setSwitching(true);
    try {
      await auth.switchTenant(tenantId);
    } catch {
      setSwitching(false);
    }
  };

  return (
    <label className="app-topbar-store-switch">
      <span className="app-topbar-store-switch-label">Loja</span>
      <select
        className="app-topbar-store-switch-select premium-text-input"
        value={current?.tenantId ?? auth?.user?.tenantId ?? ''}
        disabled={loading || switching}
        onFocus={() => {
          setLoading(true);
          load().finally(() => setLoading(false));
        }}
        onChange={(e) => void onChange(e.target.value)}
        aria-label={groupName ? `Trocar loja — ${groupName}` : 'Trocar loja'}
        title={groupName ? `Grupo: ${groupName}` : undefined}
      >
        {stores.map((s) => (
          <option key={s.tenantId} value={s.tenantId}>
            {s.displayName}
            {s.isCurrent ? ' (atual)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
};

export default AppTopbarStoreSwitch;
