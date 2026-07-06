import { useEffect, useState } from 'react';

const REEL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Digit({ value }) {
  const [pos, setPos] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setPos(value));
    return () => cancelAnimationFrame(t);
  }, [value]);
  return (
    <span className="digit" aria-hidden="true">
      <span className="reel" style={{ transform: `translateY(-${pos * 1.35}em)` }}>
        {REEL.map(d => <span key={d}>{d}</span>)}
      </span>
    </span>
  );
}

export default function Odometer({ value }) {
  const str = String(Math.max(0, Math.round(value)));
  const padded = str.padStart(7, '0');
  return (
    <span className="odometer" role="img" aria-label={`${str} dinars saved`}>
      {padded.split('').map((ch, i) => {
        const el = <Digit key={i} value={Number(ch)} />;
        const fromRight = padded.length - i;
        return fromRight > 1 && fromRight % 3 === 1
          ? [<span key={`s${i}`} className="sep">.</span>, el]
          : el;
      })}
    </span>
  );
}
