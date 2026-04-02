import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Send, ArrowLeft } from 'lucide-react';

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

      <div className="msg-container card">
        {/* Contact list */}
        <div className={`msg-sidebar ${selectedContact ? 'msg-sidebar-hidden' : ''}`}>
          <div className="msg-sidebar-title">
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
        <div className={`msg-chat ${selectedContact ? 'msg-chat-active' : ''}`}>
          {selectedContact ? (
            <>
              <div className="msg-chat-header">
                <button className="msg-back-btn" onClick={() => setSelectedContact(null)}>
                  <ArrowLeft size={20} />
                </button>
                <div className="contact-avatar contact-avatar-sm">{selectedContactUser?.name?.[0]}</div>
                <span className="msg-chat-name">{selectedContactUser?.name}</span>
              </div>
              <div className="msg-chat-body">
                {contactMessages.map(m => (
                  <div key={m.id}>
                    <div className={`chat-bubble ${m.from === currentUser.id ? 'sent' : 'received'}`}>
                      {m.text}
                    </div>
                    <div className="chat-time" style={{ textAlign: m.from === currentUser.id ? 'right' : 'left' }}>
                      {new Date(m.timestamp).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSend} className="msg-chat-input">
                <input className="form-input" value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." />
                <button type="submit" className="btn btn-primary"><Send size={18} /></button>
              </form>
            </>
          ) : (
            <div className="msg-empty">
              <p className="empty-state-text">Select a contact to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
