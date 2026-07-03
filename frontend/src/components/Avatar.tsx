interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

const COLORS = [
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
  'linear-gradient(135deg,#f59e0b,#fbbf24)',
  'linear-gradient(135deg,#ef4444,#f87171)',
  'linear-gradient(135deg,#22c55e,#4ade80)',
  'linear-gradient(135deg,#ec4899,#f472b6)',
];

export default function Avatar({ name, src, size = 'md', online }: AvatarProps) {
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <div className={`avatar avatar-${size}`} style={!src ? { background: color } : {}}>
      {src ? <img src={src} alt={name} /> : name.charAt(0).toUpperCase()}
      {online !== undefined && online && <span className="online-dot" />}
    </div>
  );
}
