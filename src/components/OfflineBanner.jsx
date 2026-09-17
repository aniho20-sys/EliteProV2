import { WifiOff } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const { t } = useLanguage();
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner">
      <WifiOff size={14} />
      <span>{t('chrome.offline')}</span>
    </div>
  );
}
