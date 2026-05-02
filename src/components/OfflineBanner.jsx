import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner">
      <WifiOff size={14} />
      <span>You're offline — viewing cached data. Changes will sync when reconnected.</span>
    </div>
  );
}
