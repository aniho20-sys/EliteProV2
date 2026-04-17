import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Send } from 'lucide-react';

export default function NotesSection({ clientId }) {
  const { currentUser, getMessages, sendMessage, markMessagesRead, getClient } = useApp();
  const [text, setText] = useState('');
  const listRef = useRef(null);

  const isTrainer = currentUser.role === 'trainer';
  const otherUserId = isTrainer ? clientId : currentUser.trainerId;

  const messages = getMessages(currentUser.id)
    .filter(m =>
      (m.from === currentUser.id && m.to === otherUserId) ||
      (m.from === otherUserId && m.to === currentUser.id)
    )
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  useEffect(() => {
    markMessagesRead(currentUser.id, otherUserId);
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(currentUser.id, otherUserId, text.trim());
    setText('');
  };

  const getName = (id) => getClient(id)?.name || 'Unknown';

  const formatTime = (ts) => new Date(ts).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="notes-section">
      <h4 className="card-title mb-16" style={{ fontSize: '0.95rem' }}>Notes & Messages</h4>
      <div className="notes-list" ref={listRef}>
        {messages.length === 0 ? (
          <div className="text-center text-muted text-sm" style={{ padding: '16px 0' }}>No messages yet</div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`note-item ${m.from === currentUser.id ? 'sent' : ''}`}>
              <div className="note-avatar">{getName(m.from)[0]}</div>
              <div className="note-content">
                <div className="note-header">
                  <span className="note-author">{getName(m.from)}</span>
                  <span className="note-time">{formatTime(m.timestamp)}</span>
                </div>
                <div className="note-text">{m.text}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="note-input-row">
        <input className="form-input" value={text} onChange={e => setText(e.target.value)} placeholder="Write a note..." />
        <button type="submit" className="btn btn-primary btn-sm"><Send size={14} /></button>
      </form>
    </div>
  );
}
