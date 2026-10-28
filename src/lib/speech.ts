export interface SpeechRecognitionResultState {
  transcript: string;
  isFinal: boolean;
}

// Check speech recognition support
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// Check speech synthesis support
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

export class VoiceAssistant {
  private recognition: any = null;
  private isListening = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }
    }
  }

  // --- Speech to Text ---
  startListening(
    lang: string = 'en-US',
    onResult: (state: SpeechRecognitionResultState) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ): boolean {
    if (!this.recognition) {
      onError('Speech recognition is not supported in this browser.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    try {
      this.recognition.lang = lang;
      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        onResult({
          transcript: final || interim,
          isFinal: Boolean(final),
        });
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        onError(event.error === 'not-allowed' ? 'Microphone permission denied.' : `Speech error: ${event.error}`);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
        onEnd();
      };

      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e: any) {
      console.error('Failed to start speech recognition', e);
      onError(e.message || 'Failed to start microphone');
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn(e);
      }
      this.isListening = false;
    }
  }

  // --- Text to Speech ---
  speak(
    text: string,
    lang: string = 'en-US',
    preferredVoiceURI?: string,
    onStart?: () => void,
    onEnd?: () => void
  ) {
    if (!isSpeechSynthesisSupported()) return;

    this.stopSpeaking();

    // Clean markdown syntax for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~#>]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (preferredVoiceURI) {
      const v = voices.find((voice) => voice.voiceURI === preferredVoiceURI);
      if (v) utterance.voice = v;
    } else {
      // Find a natural matching voice
      const match = voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
      if (match) utterance.voice = match;
    }

    utterance.onstart = () => {
      this.currentUtterance = utterance;
      onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.speaking;
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!isSpeechSynthesisSupported()) return [];
    return window.speechSynthesis.getVoices();
  }
}

export const voiceService = new VoiceAssistant();

