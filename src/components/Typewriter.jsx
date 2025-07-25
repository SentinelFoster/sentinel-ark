import React, { useState, useEffect, useRef } from 'react';

export default function Typewriter({ text, speed = 20, onComplete, className }) {
  const [displayText, setDisplayText] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Use a ref for the callback to prevent re-triggering the main effect
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!text) {
        setDisplayText('');
        setIsCompleted(true);
        return;
    }
    
    let i = 0;
    setDisplayText('');
    setIsCompleted(false);

    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
        setIsCompleted(true);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed]);
  
  // Render the full text once typing is complete to ensure stability
  return <span className={className}>{isCompleted ? text : displayText}</span>;
}