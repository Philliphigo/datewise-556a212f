import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export const VoiceRecorder = ({ 
  onRecordingComplete, 
  onCancel, 
  isUploading = false 
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { triggerHaptic } = useHaptics();

  const MAX_DURATION = 120; // 2 minutes max

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Use webm format with opus codec for best quality/size ratio
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      triggerHaptic('medium');
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }, [triggerHaptic]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      triggerHaptic('light');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, triggerHaptic]);

  const handleSend = useCallback(() => {
    if (audioBlob && recordingTime > 0) {
      triggerHaptic('success');
      onRecordingComplete(audioBlob, recordingTime);
    }
  }, [audioBlob, recordingTime, onRecordingComplete, triggerHaptic]);

  const handleCancel = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    onCancel();
  }, [isRecording, audioUrl, onCancel]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex items-center gap-3 w-full"
    >
      {/* Cancel Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        disabled={isUploading}
        className="rounded-full shrink-0 text-muted-foreground hover:text-destructive"
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Recording Visualization */}
      <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex items-center gap-3 flex-1"
            >
              {/* Pulsing indicator */}
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-3 h-3 rounded-full bg-destructive"
              />
              
              {/* Waveform visualization */}
              <div className="flex items-center gap-0.5 flex-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isRecording ? [8, 16 + Math.random() * 16, 8] : 8
                    }}
                    transition={{
                      duration: 0.3 + Math.random() * 0.3,
                      repeat: Infinity,
                      delay: i * 0.05
                    }}
                    className="w-1 bg-primary rounded-full"
                    style={{ minHeight: 8 }}
                  />
                ))}
              </div>
              
              <span className="text-sm font-mono text-muted-foreground min-w-[48px]">
                {formatTime(recordingTime)}
              </span>
            </motion.div>
          ) : audioBlob ? (
            <motion.div
              key="preview"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex items-center gap-3 flex-1"
            >
              <audio 
                src={audioUrl || undefined} 
                controls 
                className="flex-1 h-8 [&::-webkit-media-controls-panel]:bg-transparent"
              />
              <span className="text-sm font-mono text-muted-foreground min-w-[48px]">
                {formatTime(recordingTime)}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Mic className="w-4 h-4" />
              <span className="text-sm">Tap to record</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Record/Stop/Send Button */}
      {!audioBlob ? (
        <Button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
          className={`rounded-full w-11 h-11 p-0 shrink-0 ${
            isRecording 
              ? "bg-destructive hover:bg-destructive/90" 
              : "bg-primary hover:bg-primary/90"
          }`}
        >
          {isRecording ? (
            <Square className="w-4 h-4" fill="currentColor" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={handleSend}
          disabled={isUploading}
          className="rounded-full w-11 h-11 p-0 shrink-0 bg-primary hover:bg-primary/90"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      )}
    </motion.div>
  );
};
