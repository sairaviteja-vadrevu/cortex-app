import { useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { editorStore } from "../../stores/editorStore";

/**
 * Headless audio player that is always mounted in the Editor.
 * Handles play-mode autoplay and exposes the audio element via a global ref.
 */

// Shared ref so AudioPanel can access the same element for preview
export const sharedAudioRef = { current: null };

export function AudioPlayer() {
  const snap = useSnapshot(editorStore);
  const audioRef = useRef(null);

  // Keep shared ref in sync
  useEffect(() => {
    sharedAudioRef.current = audioRef.current;
    return () => {
      sharedAudioRef.current = null;
    };
  });

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = snap.audioVolume;
    }
  }, [snap.audioVolume]);

  // Play/stop when scene play mode toggles
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (snap.isPlaying) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [snap.isPlaying]);

  if (!snap.audioUrl) return null;

  return <audio ref={audioRef} src={snap.audioUrl} loop preload="auto" style={{ display: "none" }} />;
}
