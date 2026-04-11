/**
 * Reusable empty-state card.
 *
 * Usage:
 *   <EmptyState
 *     icon={Users}
 *     title="No clients yet"
 *     description="Share your invite code above to get your first client onboard."
 *     action={{ label: 'View Clients', to: '/clients' }}  // or onClick
 *   />
 */
import { Link } from 'react-router-dom';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  inCard = true,
}) {
  const body = (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      {Icon && (
        <div className="empty-state-icon-wrap">
          <Icon size={compact ? 28 : 40} strokeWidth={1.5} />
        </div>
      )}
      {title && <div className="empty-state-title">{title}</div>}
      {description && <div className="empty-state-desc">{description}</div>}
      {action && (
        action.to ? (
          <Link to={action.to} className="btn btn-outline btn-sm empty-state-action">
            {action.label}
          </Link>
        ) : (
          <button type="button" className="btn btn-outline btn-sm empty-state-action" onClick={action.onClick}>
            {action.label}
          </button>
        )
      )}
    </div>
  );

  return inCard ? <div className="card">{body}</div> : body;
}
