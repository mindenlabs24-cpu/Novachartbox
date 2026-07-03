import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';
import Avatar from './Avatar';

interface CallModalProps {
  socket: Socket;
  currentUser: { _id: string; username: string; avatar: string };
  contact: { _id: string; username: string; avatar: string } | null;
  incoming: { from: string; signal: any; name: string; callType: 'audio' | 'video' } | null;
  callType: 'audio' | 'video' | null;
  onClose: () => void;
}

export default function CallModal({ socket, currentUser, contact, incoming, callType, onClose }: CallModalProps) {
  const [status, setStatus] = useState<'calling' | 'incoming' | 'connected'>('calling');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const type = incoming?.callType || callType || 'audio';

  useEffect(() => {
    if (incoming) setStatus('incoming');
    else startCall();

    socket.on('call_accepted', (signal: any) => {
      peerRef.current?.signal(signal);
      setStatus('connected');
    });
    socket.on('call_ended', () => cleanup(true));

    return () => {
      socket.off('call_accepted');
      socket.off('call_ended');
    };
  }, []);

  const getMedia = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: type === 'video', audio: true
      });
    } catch {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  };

  const startCall = async () => {
    const stream = await getMedia();
    streamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = new Peer({ initiator: true, trickle: false, stream });
    peerRef.current = peer;

    peer.on('signal', (signal: any) => {
      socket.emit('call_user', {
        userToCall: contact?._id,
        signalData: signal,
        from: socket.id,
        name: currentUser.username,
        callType: type
      });
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      setStatus('connected');
    });
    setStatus('calling');
  };

  const answerCall = async () => {
    const stream = await getMedia();
    streamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = new Peer({ initiator: false, trickle: false, stream });
    peerRef.current = peer;

    peer.on('signal', (signal: any) => {
      socket.emit('answer_call', { to: incoming!.from, signal });
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      setStatus('connected');
    });

    peer.signal(incoming!.signal);
  };

  const cleanup = (remote?: boolean) => {
    if (!remote) {
      const to = incoming ? incoming.from : contact?._id;
      if (to) socket.emit('end_call', { to });
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.destroy();
    onClose();
  };

  const toggleMute = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(!muted);
  };

  const toggleCam = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach(t => { t.enabled = camOff; });
    setCamOff(!camOff);
  };

  const callerName = incoming?.name || contact?.username || 'Mtumiaji';

  if (type === 'video' && status === 'connected') {
    return (
      <div className="video-call-screen">
        <video ref={remoteVideoRef} className="video-remote" autoPlay />
        <div className="video-local">
          <video ref={localVideoRef} autoPlay muted style={{ borderRadius: 10 }} />
        </div>
        <div className="video-controls">
          <button className="video-ctrl-btn" onClick={toggleMute} title={muted ? 'Fungua Maikrofoni' : 'Zima Maikrofoni'}>
            {muted ? '🎙️' : '🔇'}
          </button>
          <button className="video-ctrl-btn" onClick={toggleCam} title={camOff ? 'Washa Kamera' : 'Zima Kamera'}>
            {camOff ? '📵' : '📷'}
          </button>
          <button className="video-ctrl-btn end-call" onClick={() => cleanup()} title="Kata Simu">
            📵
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="call-overlay">
      <div className="call-modal">
        <Avatar name={callerName} size="lg" />
        <h2>{callerName}</h2>
        <p className="call-status">
          {status === 'incoming' && `Simu ya ${type === 'video' ? 'Video' : 'Sauti'} Inayoingia...`}
          {status === 'calling' && 'Inapigia...'}
          {status === 'connected' && (type === 'audio' ? '🎙 Unaendelea...' : '📞 Unaendelea...')}
        </p>

        {type === 'audio' && status === 'connected' && (
          <audio ref={remoteVideoRef as any} autoPlay />
        )}

        <div className="call-actions">
          {status === 'incoming' ? (
            <>
              <button className="call-btn accept" onClick={answerCall} title="Pokea">📞</button>
              <button className="call-btn decline" onClick={() => cleanup()} title="Kataa">📵</button>
            </>
          ) : (
            <>
              {status === 'connected' && (
                <button className="call-btn" style={{ background: muted ? '#ef4444' : 'rgba(255,255,255,0.1)', color: 'white' }}
                  onClick={toggleMute}>
                  {muted ? '🔇' : '🎙️'}
                </button>
              )}
              <button className="call-btn end" onClick={() => cleanup()} title="Kata">📵</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
