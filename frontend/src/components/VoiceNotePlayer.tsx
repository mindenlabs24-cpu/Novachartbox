import { useEffect, useRef, useState } from 'react';

interface VoiceNotePlayerProps {
  src: string;
  own: boolean;
}

export default function VoiceNotePlayer({ src, own }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => { setCurrent(a.currentTime); setProgress((a.currentTime / a.duration) * 100 || 0); };
    const onLoaded = () => setDuration(a.duration);
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrent(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onLoaded); a.removeEventListener('ended', onEnd); };
  }, []);

  return (
    <div className="voice-note-player">
      <audio ref={audioRef} src={src} />
      <button onClick={toggle} style={{ background: own ? 'rgba(255,255,255,0.25)' : 'rgba(124,58,237,0.3)' }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className="voice-note-progress">
        <div className="voice-note-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="voice-note-duration">{playing ? fmt(current) : fmt(duration)}</span>
    </div>
  );
}
