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
    /** User explicitly muted — default is sound ON. */
    const [muted, setMuted] = useState(false);
    const mutedRef = useRef(false);

    const play = async (): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio || mutedRef.current) return false;
      audio.muted = false;
      audio.volume = 0.7;
      try {
        await audio.play();
        unlockedRef.current = true;
        return true;
      } catch {
        return false;
      }
    };

    useImperativeHandle(ref, () => ({ play }), []);

    useEffect(() => {
      mutedRef.current = muted;
      const audio = audioRef.current;
      if (!audio) return;
      if (muted) {
        audio.pause();
        audio.muted = true;
      } else {
        audio.muted = false;
        void play();
      }
    }, [muted]);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.loop = true;
      audio.preload = "auto";
      audio.muted = false;
      audio.volume = 0.7;

      // Optimistic unmuted default — browsers often block until a gesture.
      void audio.play().then(() => {
        unlockedRef.current = true;
      }).catch(() => {});

      const onGesture = () => {
        if (mutedRef.current) return;
        if (unlockedRef.current && !audio.paused && !audio.muted) {
          cleanup();
          return;
        }
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

      // First scroll / wheel / tap unlocks sound (default = on).
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

    function toggle() {
      setMuted((prev) => !prev);
    }

    return (
      <>
        <audio ref={audioRef} src={src} loop playsInline preload="auto" />
        <button
          type="button"
          onClick={toggle}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-[max(1.25rem,env(safe-area-inset-right))] z-50 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
          aria-label={muted ? "Unmute background music" : "Mute background music"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </>
    );
  },
);
