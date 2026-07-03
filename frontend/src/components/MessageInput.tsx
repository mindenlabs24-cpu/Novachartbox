import { useRef, useState } from 'react';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import axios from 'axios';
import { API } from '../context/AuthContext';

interface MessageInputProps {
  onSendMessage: (type: string, content: string, fileUrl?: string, fileName?: string, fileSize?: number) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  token: string;
}

export default function MessageInput({ onSendMessage, onTyping, onStopTyping, token }: MessageInputProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(onStopTyping, 2000);
    // Auto-resize
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px`; }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = async () => {
    if (uploading) return;
    if (mediaPreview) {
      await uploadAndSend(mediaPreview.file, mediaPreview.type);
      return;
    }
    if (text.trim()) {
      onSendMessage('text', text.trim());
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const uploadAndSend = async (file: File, type: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      const msgType = type.startsWith('image') ? 'image' : type.startsWith('video') ? 'video' : type.startsWith('audio') ? 'voice_note' : 'file';
      onSendMessage(msgType, text.trim() || file.name, `http://localhost:5000${res.data.url}`, res.data.name, res.data.size);
      setText('');
      setMediaPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setText(t => t + emojiData.emoji);
    textareaRef.current?.focus();
  };

  const pickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMediaPreview({ file, url, type: file.type });
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        await uploadAndSend(file, 'audio');
        setRecordTime(0);
      };
      rec.start();
      mediaRecRef.current = rec;
      setRecording(true);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch { alert('Ruhusa ya maikrofoni inahitajika'); }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    mediaRecRef.current?.stream.getTracks().forEach(t => t.stop());
    mediaRecRef.current?.stop();
    chunksRef.current = [];
    setRecording(false);
    setRecordTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const canSend = text.trim() || mediaPreview;

  return (
    <div className="input-area" style={{ position: 'relative' }}>
      {showEmoji && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} height={380} width={320} />
        </div>
      )}

      {mediaPreview && (
        <div className="media-preview">
          <div className="media-preview-item">
            {mediaPreview.type.startsWith('image') && <img src={mediaPreview.url} alt="preview" />}
            {mediaPreview.type.startsWith('video') && <video src={mediaPreview.url} />}
            {mediaPreview.type.startsWith('audio') && <div style={{ fontSize: 32, display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>🎙</div>}
            {!mediaPreview.type.startsWith('image') && !mediaPreview.type.startsWith('video') && !mediaPreview.type.startsWith('audio') && <div style={{fontSize:22,display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>📄</div>}
            <button className="remove-preview" onClick={() => setMediaPreview(null)}>✕</button>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>{mediaPreview.file.name}</span>
        </div>
      )}

      {recording && (
        <div className="recording-bar">
          <div className="recording-dot" />
          <span className="recording-time">⏺ {fmt(recordTime)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Inaandika sauti...</span>
          <button className="cancel-recording" onClick={cancelRecording}>✕ Futa</button>
        </div>
      )}

      {!recording && (
        <div className="input-toolbar">
          <button
            id="btn-emoji"
            className="toolbar-btn"
            onClick={() => setShowEmoji(s => !s)}
            title="Emoji"
          >😊</button>
          <button
            id="btn-attach"
            className="toolbar-btn"
            onClick={pickFile}
            title="Kiambatisho"
          >📎</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      )}

      <div className="input-row">
        {!recording && (
          <textarea
            id="msg-input"
            ref={textareaRef}
            className="message-input"
            placeholder="Andika ujumbe wako..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={1}
            onClick={() => setShowEmoji(false)}
          />
        )}
        {recording && <div style={{ flex: 1 }} />}

        {!recording && !canSend ? (
          <button
            id="btn-voice-record"
            className="send-btn"
            onMouseDown={startRecording}
            title="Rekodi Sauti"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}
          >🎙</button>
        ) : recording ? (
          <button
            id="btn-stop-record"
            className="send-btn"
            onClick={stopRecording}
            title="Tuma Sauti"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
          >
            {uploading ? '...' : '✓'}
          </button>
        ) : (
          <button
            id="btn-send"
            className="send-btn"
            onClick={handleSend}
            disabled={uploading}
            title="Tuma"
          >
            {uploading ? '⏳' : '➤'}
          </button>
        )}
      </div>
    </div>
  );
}
