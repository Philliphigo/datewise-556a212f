import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface AudioMessageProps {
  filePath: string;
  duration?: number;
  isOwn?: boolean;
}

export const AudioMessage = ({ filePath, duration = 0, isOwn = false }: AudioMessageProps) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    
    const loadAudio = async () => {
      try {
        const { data, error: urlError } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrl(filePath, 3600);
        
        if (urlError) throw urlError;
        if (!cancelled) setAudioUrl(data.signedUrl);
      } catch (err) {
        console.error('Failed to load audio:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    loadAudio();
    return () => { cancelled = true; };
  }, [filePath]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;

    const rect = progress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audio.currentTime = percentage * audioDuration;
  }, [audioDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !audioUrl) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Failed to load audio</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={togglePlayback}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isOwn 
            ? "bg-white/20 hover:bg-white/30" 
            : "bg-primary/20 hover:bg-primary/30"
        } transition-colors`}
      >
        {isPlaying ? (
          <Pause className={`w-4 h-4 ${isOwn ? "text-white" : "text-primary"}`} fill="currentColor" />
        ) : (
          <Play className={`w-4 h-4 ${isOwn ? "text-white" : "text-primary"}`} fill="currentColor" />
        )}
      </motion.button>

      {/* Progress and Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform Progress Bar */}
        <div 
          ref={progressRef}
          onClick={handleProgressClick}
          className={`relative h-6 cursor-pointer flex items-center gap-0.5 ${
            isOwn ? "opacity-80" : ""
          }`}
        >
          {/* Waveform bars */}
          {Array.from({ length: 30 }).map((_, i) => {
            const barPercentage = ((i + 1) / 30) * 100;
            const isActive = barPercentage <= progressPercentage;
            // Create a pseudo-random but consistent height for each bar
            const height = 8 + Math.sin(i * 0.8) * 8 + Math.cos(i * 1.2) * 6;
            
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-colors ${
                  isActive 
                    ? isOwn ? "bg-white" : "bg-primary"
                    : isOwn ? "bg-white/30" : "bg-primary/30"
                }`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-[10px]">
          <span className={isOwn ? "text-white/60" : "text-muted-foreground"}>
            {formatTime(currentTime)}
          </span>
          <span className={isOwn ? "text-white/60" : "text-muted-foreground"}>
            {formatTime(audioDuration)}
          </span>
        </div>
      </div>
    </div>
  );
};
