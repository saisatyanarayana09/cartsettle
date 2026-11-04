import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { startWelcomeSequence } from './welcome-lifecycle';
import './welcome.css';

export default function WelcomeSequence({ greeting = 'Welcome', name = '', onContinue, ready = true }) {
  const [leaving, setLeaving] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const sequence = useRef(null);
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;

  useEffect(() => {
    const active = startWelcomeSequence({
      onFade: (value = true) => setLeaving(value),
      onContinue: () => continueRef.current(),
      ready,
    });
    sequence.current = active;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      active.cancel();
      sequence.current = null;
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => { sequence.current?.setReady(ready); }, [ready]);
  const skip = () => { setSkipped(true); sequence.current?.skip(); };

  return (
    <Button
      variant="ghost"
      className="welcome-sequence"
      data-leaving={leaving}
      data-skipped={skipped}
      aria-label="Continue to store"
      onPointerDown={skip}
      onClick={skip}
    >
      <span className="welcome-content">
      <span className="welcome-brand-group">
        <span className="welcome-brand">
          <span className="welcome-brand-first">Cart</span>
          <span className="welcome-brand-last">Settle</span>
        </span>
      </span>
      <span className="welcome-greeting">{greeting}</span>
      {name.trim() && <span className="welcome-person">{name.trim()}</span>}
      </span>
    </Button>
  );
}