import React, { useCallback, useContext, useEffect, useState } from 'react';
import PremiumSelect from './PremiumSelect';
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
    <div
      className="app-topbar-store-switch"
      title={groupName ? `Grupo: ${groupName}` : undefined}
      onFocusCapture={() => {
        setLoading(true);
        load().finally(() => setLoading(false));
      }}
    >
      <PremiumSelect
        label="Loja"
        value={current?.tenantId ?? auth?.user?.tenantId ?? ''}
        options={stores.map((s) => ({
          value: s.tenantId,
          label: `${s.displayName}${s.isCurrent ? ' (atual)' : ''}`,
        }))}
        wrapperClassName="app-topbar-store-switch-field"
        disabled={loading || switching}
        menuInPortal
        onChange={(v) => void onChange(v)}
      />
    </div>
  );
};

export default AppTopbarStoreSwitch;
