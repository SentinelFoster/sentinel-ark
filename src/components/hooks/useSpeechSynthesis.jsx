import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechSynthesis = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const utteranceRef = useRef(null);

    const cancel = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        utteranceRef.current = null;
    }, []);

    const speak = useCallback((text, voice, rate = 0.9, pitch = 1.0) => {
        if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
        
        cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        if (voice) {
            utterance.voice = voice;
        }
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onstart = () => {
            setIsPlaying(true);
            setIsPaused(false);
        };

        utterance.onpause = () => {
            setIsPlaying(true);
            setIsPaused(true);
        };

        utterance.onresume = () => {
            setIsPlaying(true);
            setIsPaused(false);
        };

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
            utteranceRef.current = null;
        };
        
        utterance.onerror = (event) => {
            console.error('SpeechSynthesis Error:', event.error);
            setIsPlaying(false);
            setIsPaused(false);
            utteranceRef.current = null;
        };

        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 100);

    }, [cancel]);

    const pause = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.pause();
    }, []);

    const resume = useCallback(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.resume();
    }, []);

    useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

    return {
        speak,
        cancel,
        pause,
        resume,
        isPlaying,
        isPaused,
        isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    };
};