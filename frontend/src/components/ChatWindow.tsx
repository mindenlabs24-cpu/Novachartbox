import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';
import Avatar from './Avatar';
import MessageInput from './MessageInput';
import VoiceNotePlayer from './VoiceNotePlayer';
import CallModal from './CallModal';

interface Message {
  _id?: string;
  roomId: string;
  sender: string;
  senderName: string;
  senderAvatar: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'voice_note' | 'file';
  content: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

interface Contact {
  _id: string;
  username: string;
  email: string;
  avatar: string;
}

const SOCKET_URL = 'http://localhost:5000';

export default function ChatWindow() {
  const { user, logout } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [incoming, setIncoming] = useState<any>(null);
  const [showCall, setShowCall] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roomId = useCallback(() => {
    if (!user || !activeContact) return '';
    return [user._id, activeContact._id].sort().join('_');
  }, [user, activeContact]);

  // Socket setup
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.emit('user_online', user!._id);

    socket.on('online_users', (users: string[]) => setOnlineUsers(users));

    socket.on('receive_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('typing', ({ username }: { username: string }) => {
      setTyping(username);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setTyping(null), 3000);
    });
    socket.on('stop_typing', () => setTyping(null));

    socket.on('incoming_call', (data: any) => {
      setIncoming(data);
      setShowCall(true);
    });

    return () => { socket.disconnect(); };
  }, []);

  // Load contacts
  useEffect(() => {
    axios.get(`${API}/auth/users`, { headers: { Authorization: `Bearer ${user!.token}` } })
      .then(r => { setContacts(r.data); setFiltered(r.data); })
      .catch(console.error);
  }, []);

  // Search filter
  useEffect(() => {
    if (!search.trim()) setFiltered(contacts);
    else setFiltered(contacts.filter(c => c.username.toLowerCase().includes(search.toLowerCase())));
  }, [search, contacts]);

  // Load messages when contact changes
  useEffect(() => {
    if (!activeContact) return;
    const rid = [user!._id, activeContact._id].sort().join('_');
    socketRef.current?.emit('join_room', rid);

    axios.get(`${API}/messages/${rid}`, { headers: { Authorization: `Bearer ${user!.token}` } })
      .then(r => setMessages(r.data))
      .catch(() => setMessages([]));
  }, [activeContact]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (type: string, content: string, fileUrl = '', fileName = '', fileSize = 0) => {
    const rid = roomId();
    if (!rid) return;
    const msg: Message = {
      roomId: rid, sender: user!._id, senderName: user!.username,
      senderAvatar: user!.avatar, type: type as any,
      content, fileUrl, fileName, fileSize, createdAt: new Date().toISOString()
    };
    socketRef.current?.emit('send_message', msg);
    // Save to DB
    axios.post(`${API}/messages`, msg, { headers: { Authorization: `Bearer ${user!.token}` } }).catch(console.error);
  };

  const handleTyping = () => socketRef.current?.emit('typing', { roomId: roomId(), userId: user!._id, username: user!.username });
  const handleStopTyping = () => socketRef.current?.emit('stop_typing', { roomId: roomId(), userId: user!._id });

  const startCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setIncoming(null);
    setShowCall(true);
  };

  const closeCall = () => { setShowCall(false); setCallType(null); setIncoming(null); };

  const fmt = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMsgContent = (msg: Message) => {
    const own = msg.sender === user!._id;
    if (msg.type === 'text') return <span>{msg.content}</span>;
    if (msg.type === 'image') return <img src={msg.fileUrl} alt={msg.fileName} className="msg-image" />;
    if (msg.type === 'video') return <video src={msg.fileUrl} className="msg-video" controls />;
    if (msg.type === 'voice_note' || msg.type === 'audio') return <VoiceNotePlayer src={msg.fileUrl} own={own} />;
    if (msg.type === 'file') return (
      <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ color: own ? 'white' : 'var(--accent-secondary)', textDecoration: 'underline' }}>
        📄 {msg.fileName}
      </a>
    );
    return null;
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <span className="sidebar-title">Novachart</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={user!.username} src={user!.avatar} size="sm" />
              <button
                id="btn-logout"
                className="icon-btn"
                onClick={logout}
                title="Toka"
                style={{ width: 30, height: 30 }}
              >
                🚪
              </button>
            </div>
          </div>
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              id="search-contacts"
              placeholder="Tafuta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="contacts-list">
          {filtered.length === 0 ? (
            <div className="empty-chat">
              <span style={{ fontSize: 36 }}>👤</span>
              <p style={{ fontSize: 13 }}>Hakuna watumiaji wowote</p>
            </div>
          ) : filtered.map(c => (
            <div
              key={c._id}
              id={`contact-${c._id}`}
              className={`contact-item ${activeContact?._id === c._id ? 'active' : ''}`}
              onClick={() => setActiveContact(c)}
            >
              <Avatar name={c.username} src={c.avatar} size="md" online={onlineUsers.includes(c._id)} />
              <div className="contact-info">
                <div className="contact-name">{c.username}</div>
                <div className="contact-last-msg">
                  {onlineUsers.includes(c._id) ? '🟢 Mtandaoni' : '⚫ Nje ya mtandao'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="chat-area">
        {!activeContact ? (
          <div className="no-chat-selected">
            <div className="no-chat-icon">💬</div>
            <h2>Karibu Novachart!</h2>
            <p>Chagua mtu kutoka kwenye orodha kushoto ili uanze mazungumzo</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <Avatar name={activeContact.username} src={activeContact.avatar} size="md" online={onlineUsers.includes(activeContact._id)} />
              <div className="chat-header-info">
                <div className="chat-header-name">{activeContact.username}</div>
                <div className="chat-header-status">
                  {onlineUsers.includes(activeContact._id) ? '● Mtandaoni' : 'Nje ya mtandao'}
                </div>
              </div>
              <div className="chat-header-actions">
                <button
                  id="btn-voice-call"
                  className="icon-btn call-voice"
                  onClick={() => startCall('audio')}
                  title="Piga Simu ya Sauti"
                >📞</button>
                <button
                  id="btn-video-call"
                  className="icon-btn call-video"
                  onClick={() => startCall('video')}
                  title="Piga Simu ya Video"
                >📹</button>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-container">
              {messages.length === 0 && (
                <div className="empty-chat" style={{ flex: 1 }}>
                  <div className="empty-chat-icon">👋</div>
                  <h3>Anza Mazungumzo!</h3>
                  <p>Tuma ujumbe wa kwanza kwa {activeContact.username}</p>
                </div>
              )}

              {messages.map((msg, i) => {
                const own = msg.sender === user!._id;
                return (
                  <div key={msg._id || i} className={`message-wrapper ${own ? 'own' : ''}`}>
                    {!own && <Avatar name={msg.senderName} src={msg.senderAvatar} size="sm" />}
                    <div className={`message-bubble ${own ? 'own' : 'other'}`}>
                      {renderMsgContent(msg)}
                      {msg.type === 'text' && msg.content && msg.fileUrl && (
                        <span style={{ display: 'block', marginTop: 4 }}>{msg.content}</span>
                      )}
                      <span className="msg-time">{fmt(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                  <span>{typing} anaandika...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <MessageInput
              onSendMessage={sendMessage}
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
              token={user!.token}
            />
          </>
        )}
      </main>

      {/* Call Modal */}
      {showCall && socketRef.current && (
        <CallModal
          socket={socketRef.current}
          currentUser={user as any}
          contact={activeContact}
          incoming={incoming}
          callType={callType}
          onClose={closeCall}
        />
      )}
    </div>
  );
}
