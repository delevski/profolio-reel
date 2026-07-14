"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Volume2, VolumeX } from "lucide-react";

type Props = {
  src: string;
};

export type ReelMusicHandle = {
  /** Must be called from a user gesture to unmute + play. */
  play: () => Promise<boolean>;
};

export const ReelMusicControl = forwardRef<ReelMusicHandle, Props>(
  function ReelMusicControl({ src }, ref) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const unlockedRef = useRef(false);
    const [playing, setPlaying] = useState(false);

    const play = async (): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio) return false;
      audio.muted = false;
      audio.volume = 0.7;
      try {
        await audio.play();
        unlockedRef.current = true;
        setPlaying(true);
        return true;
      } catch {
        setPlaying(false);
        return false;
      }
    };

    useImperativeHandle(ref, () => ({ play }), []);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0.7;

      // Try unmuted autoplay on load (often blocked — Start / first gesture will unlock).
      void audio.play().then(() => {
        unlockedRef.current = true;
        setPlaying(true);
      }).catch(() => {});

      const onGesture = () => {
        if (unlockedRef.current && !audio.paused) return;
        void play().then((ok) => {
          if (ok) cleanup();
        });
      };

      const cleanup = () => {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("touchstart", onGesture);
        window.removeEventListener("keydown", onGesture);
        window.removeEventListener("wheel", onGesture);
        window.removeEventListener("scroll", onGesture);
      };

      window.addEventListener("pointerdown", onGesture, { passive: true });
      window.addEventListener("touchstart", onGesture, { passive: true });
      window.addEventListener("keydown", onGesture);
      window.addEventListener("wheel", onGesture, { passive: true });
      window.addEventListener("scroll", onGesture, { passive: true });

      return () => {
        cleanup();
        audio.pause();
      };
    }, [src]);

    async function toggle() {
      const audio = audioRef.current;
      if (!audio) return;
      if (playing) {
        audio.pause();
        setPlaying(false);
        return;
      }
      await play();
    }

    return (
      <>
        <audio ref={audioRef} src={src} loop playsInline preload="auto" />
        <button
          type="button"
          onClick={toggle}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-[max(1.25rem,env(safe-area-inset-right))] z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
          aria-label={playing ? "Mute background music" : "Play background music"}
        >
          {playing ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </>
    );
  },
);
