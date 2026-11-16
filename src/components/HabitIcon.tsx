import {
  BookOpen,
  Brain,
  Droplets,
  Dumbbell,
  Footprints,
  Laptop,
  Rocket,
  Sparkles,
  Sprout,
} from 'lucide-react';

type HabitIconProps = {
  icon: string;
  className?: string;
  size?: number;
};

export function HabitIcon({ icon, className = '', size = 18 }: HabitIconProps) {
  if (icon.startsWith('emoji:')) {
    const emoji = icon.slice(6) || '🌱';
    return (
      <span
        className={`inline-flex items-center justify-center leading-none select-none ${className}`}
        style={{ fontSize: Math.round(size * 1.05) }}
        aria-hidden="true"
      >
        {emoji}
      </span>
    );
  }

  const name = icon.startsWith('lucide:') ? icon.slice(7) : icon;
  switch (name) {
    case 'dumbbell':
      return <Dumbbell size={size} className={className} aria-hidden="true" />;
    case 'book-open':
      return <BookOpen size={size} className={className} aria-hidden="true" />;
    case 'laptop':
      return <Laptop size={size} className={className} aria-hidden="true" />;
    case 'rocket':
      return <Rocket size={size} className={className} aria-hidden="true" />;
    case 'brain':
      return <Brain size={size} className={className} aria-hidden="true" />;
    case 'footprints':
      return <Footprints size={size} className={className} aria-hidden="true" />;
    case 'droplets':
      return <Droplets size={size} className={className} aria-hidden="true" />;
    case 'sparkles':
      return <Sparkles size={size} className={className} aria-hidden="true" />;
    default:
      return <Sprout size={size} className={className} aria-hidden="true" />;
  }
}
