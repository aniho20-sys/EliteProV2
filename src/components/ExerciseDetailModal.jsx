import { useState } from 'react';
import { X, Play, ExternalLink, Dumbbell, Link2 } from 'lucide-react';
import { isSafeUrl, isYouTube, getYouTubeId } from '../utils/urlUtils';
import { useApp } from '../context/AppContext';

export default function ExerciseDetailModal({ exercise, onClose, onAddLink }) {
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
        <button className="ex-detail-close btn-icon" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <h3 className="ex-detail-title">{exercise.name}</h3>

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
            {videoId ? '▶ 教學片' : 'Open Link'}
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
            <ExternalLink size={16} /> Open Link
          </a>
        )}
        {!hasVideo && isTrainer && onAddLink && (
          <button
            className="btn btn-outline ex-detail-video-btn"
            onClick={() => { onClose(); onAddLink(exercise); }}
          >
            <Link2 size={15} /> 加入教學片
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
        </div>

        {/* Description */}
        {exercise.description && (
          <p className="ex-detail-desc">{exercise.description}</p>
        )}

        {exercise.instructions && (
          <div className="ex-detail-instructions">
            <h4 className="ex-detail-instructions-title">訓練要點</h4>
            <p className="ex-detail-desc">{exercise.instructions}</p>
          </div>
        )}
      </div>
    </div>
  );
}
