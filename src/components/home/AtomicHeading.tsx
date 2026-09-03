import { useEffect, useMemo, useRef, useState, type CSSProperties, type ElementType } from 'react';

interface AtomicHeadingProps {
  lines: readonly string[];
  as?: ElementType;
  className?: string;
  ariaLabel?: string;
}

function atomVector(lineIndex: number, charIndex: number) {
  const seed = (lineIndex + 3) * 97 + (charIndex + 5) * 53;
  return {
    x: ((seed * 17) % 74) - 37,
    y: ((seed * 29) % 56) - 28,
    rotation: ((seed * 11) % 58) - 29,
  };
}

export function AtomicHeading({ lines, as: Tag = 'h1', className = '', ariaLabel }: AtomicHeadingProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const atoms = useMemo(() => lines.map((line) => Array.from(line)), [lines]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setActive(true);
      setAssembled(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) {
      setAssembled(true);
      return;
    }

    const assemble = window.setTimeout(() => setAssembled(true), 40);

    return () => {
      window.clearTimeout(assemble);
    };
  }, [active]);

  return (
    <Tag
      ref={rootRef}
      aria-label={ariaLabel ?? lines.join(' ')}
      className={`atomic-heading ${assembled ? 'is-assembled' : ''} ${className}`}
    >
      {atoms.map((line, lineIndex) => (
        <span aria-hidden="true" className="atomic-heading__line" key={`${lines[lineIndex]}-${lineIndex}`}>
          {line.map((char, charIndex) => {
            const vector = atomVector(lineIndex, charIndex);
            return (
              <span
                aria-hidden="true"
                className="atomic-heading__atom"
                key={`${char}-${charIndex}`}
                style={{
                  '--atom-x': `${vector.x}px`,
                  '--atom-y': `${vector.y}px`,
                  '--atom-r': `${vector.rotation}deg`,
                  '--atom-delay': `${lineIndex * 20 + charIndex * 4}ms`,
                } as CSSProperties}
              >
                {char === ' ' ? '\u00a0' : char}
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
