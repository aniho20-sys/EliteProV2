import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { X, Play, ExternalLink, Dumbbell, Pencil, Trash2, GitMerge } from 'lucide-react';
import { isSafeUrl, isYouTube, getYouTubeId } from '../utils/urlUtils';
import { useApp } from '../context/AppContext';

export default function ExerciseDetailModal({ exercise, onClose, onEdit, onDelete, onMerge }) {
  const { t } = useLanguage();
  const { currentUser } = useApp();
  const isTrainer = currentUser?.role === 'trainer';
  const [showEmbed, setShowEmbed] = useState(false);

  if (!exercise) return null;

  const videoId = isYouTube(exercise.videoUrl) ? getYouTubeId(exercise.videoUrl) : null;
  const hasVideo = isSafeUrl(exercise.videoUrl);
  const muscles = exercise.muscle ? exercise.muscle.split(', ').filter(Boolean) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ex-detail-modal" onClick={e => e.stopPropagation()}>
        <button className="ex-detail-close btn-icon" onClick={onClose} aria-label={t('common.close')}>
          <X size={20} />
        </button>

        <h3 className="ex-detail-title">{exercise.name}</h3>

        {isTrainer && (onEdit || onDelete || onMerge) && (
          <div className="ex-detail-trainer-actions">
            {onEdit && <button className="btn btn-sm btn-outline" onClick={() => onEdit(exercise)}><Pencil size={13} /> {t('exdetail.edit')}</button>}
            {onMerge && <button className="btn btn-sm btn-outline" onClick={() => onMerge(exercise)}><GitMerge size={13} /> {t('exdetail.merge_into')}</button>}
            {onDelete && <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => onDelete(exercise)}><Trash2 size={13} /> {t('exdetail.delete')}</button>}
          </div>
        )}

        {/* Hero: YouTube thumbnail or placeholder */}
        {videoId ? (
          <img
            className="ex-detail-hero"
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={exercise.name}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="ex-detail-hero-placeholder">
            <Dumbbell size={48} strokeWidth={1} />
          </div>
        )}

        {/* Video section */}
        {hasVideo && !showEmbed && (
          <button
            className="btn btn-primary ex-detail-video-btn"
            onClick={() => setShowEmbed(true)}
          >
            <Play size={16} />
            {videoId ? t('exdetail.watch_demo') : t('exdetail.open_link')}
          </button>
        )}
        {hasVideo && showEmbed && videoId && (
          <iframe
            className="ex-detail-embed"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={exercise.name}
          />
        )}
        {hasVideo && showEmbed && !videoId && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline ex-detail-video-btn"
          >
            <ExternalLink size={16} /> {t('exdetail.open_link')}
          </a>
        )}
        {!hasVideo && isTrainer && onEdit && (
          <button
            className="btn btn-outline ex-detail-video-btn"
            onClick={() => onEdit(exercise)}
          >
            <Play size={15} /> {t('exdetail.add_video')}
          </button>
        )}

        {/* Meta tags */}
        <div className="ex-detail-meta">
          {exercise.equipment && (
            <span className="tag tag-accent">{exercise.equipment}</span>
          )}
          {muscles.map(m => (
            <span key={m} className="tag tag-primary">{m}</span>
          ))}
          {exercise.movementPattern && (
            <span className="tag">{exercise.movementPattern}</span>
          )}
        </div>

        {/* Description */}
        {exercise.description && (
          <p className="ex-detail-desc">{exercise.description}</p>
        )}

        {exercise.instructions && (
          <div className="ex-detail-instructions">
            <h4 className="ex-detail-instructions-title">{t('exdetail.cues')}</h4>
            <p className="ex-detail-desc">{exercise.instructions}</p>
          </div>
        )}

        {exercise.commonMistakes && (
          <div className="ex-detail-instructions">
            <h4 className="ex-detail-instructions-title">{t('exdetail.mistakes')}</h4>
            <p className="ex-detail-desc">{exercise.commonMistakes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
