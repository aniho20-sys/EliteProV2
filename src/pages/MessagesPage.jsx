import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Send } from 'lucide-react';

export default function MessagesPage() {
  const { currentUser, getMessages, sendMessage, getClients, getClient, markMessagesRead, data } = useApp();
  const isTrainer = currentUser.role === 'trainer';
  const [selectedContact, setSelectedContact] = useState(null);
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);

  // Get contacts
  let contacts;
  if (isTrainer) {
    contacts = getClients(currentUser.id);
  } else {
    // Client sees their trainer
    const trainer = data.users.find(u => u.id === currentUser.trainerId);
    contacts = trainer ? [trainer] : [];
  }

  const messages = getMessages(currentUser.id);

  const getContactMessages = (contactId) => {
    return messages.filter(m =>
      (m.from === currentUser.id && m.to === contactId) ||
      (m.from === contactId && m.to === currentUser.id)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const getUnreadFrom = (contactId) => messages.filter(m => m.from === contactId && m.to === currentUser.id && !m.read).length;

  const getLastMessage = (contactId) => {
    const msgs = getContactMessages(contactId);
    return msgs[msgs.length - 1];
  };

  useEffect(() => {
    if (selectedContact) {
      markMessagesRead(currentUser.id, selectedContact);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedContact, messages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedContact) return;
    sendMessage(currentUser.id, selectedContact, text.trim());
    setText('');
  };

  const contactMessages = selectedContact ? getContactMessages(selectedContact) : [];
  const selectedContactUser = selectedContact ? (getClient(selectedContact) || data.users.find(u => u.id === selectedContact)) : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Messages</h1>
      </div>

      <div className="card" style={{ display: 'flex', height: 'calc(100vh - 180px)', minHeight: 400, padding: 0, overflow: 'hidden' }}>
        {/* Contact list */}
        <div style={{ width: 280, borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isTrainer ? 'Clients' : 'Coach'}
          </div>
          {contacts.map(c => {
            const unread = getUnreadFrom(c.id);
            const last = getLastMessage(c.id);
            return (
              <div
                key={c.id}
                className={`contact-item ${selectedContact === c.id ? 'active' : ''}`}
                onClick={() => setSelectedContact(c.id)}
                style={{ margin: '0 8px' }}
              >
                <div className="contact-avatar">{c.name[0]}</div>
                <div className="contact-info">
                  <div className="contact-name">{c.name}</div>
                  <div className="contact-preview">{last?.text || 'No messages yet'}</div>
                </div>
                {unread > 0 && <span className="contact-unread">{unread}</span>}
              </div>
            );
          })}
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedContact ? (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                {selectedContactUser?.name}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contactMessages.map(m => (
                  <div key={m.id}>
                    <div className={`chat-bubble ${m.from === currentUser.id ? 'sent' : 'received'}`}>
                      {m.text}
                    </div>
                    <div className={`chat-time ${m.from === currentUser.id ? 'text-center' : ''}`} style={{ textAlign: m.from === currentUser.id ? 'right' : 'left' }}>
                      {new Date(m.timestamp).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSend} className="chat-input-row" style={{ padding: '12px 16px' }}>
                <input className="form-input" value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." />
                <button type="submit" className="btn btn-primary"><Send size={18} /></button>
              </form>
            </>
          ) : (
            <div className="empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="empty-state-text">Select a contact to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
