// Background music using Web Audio API - Improved version
class BackgroundMusic {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private oscillators: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private loopTimeout: number | null = null;

  private initAudioContext() {
    if (this.audioContext) return;
    
    try {
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
          this.masterGain = this.audioContext.createGain();
          this.masterGain.gain.value = 0.03; // Very quiet
          this.masterGain.connect(this.audioContext.destination);
        }
      }
    } catch (error) {
      console.warn('AudioContext not available:', error);
      this.audioContext = null;
    }
  }

  async start() {
    if (this.isPlaying) return;

    try {
      this.initAudioContext();
      
      if (!this.audioContext || !this.masterGain) {
        console.warn('AudioContext not available, skipping background music');
        return;
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isPlaying = true;
      this.playAmbientMusic();
    } catch (error) {
      console.warn('Failed to start background music:', error);
      this.isPlaying = false;
    }
  }

  stop() {
    this.isPlaying = false;
    
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    
    this.gainNodes.forEach(gain => {
      try {
        gain.disconnect();
      } catch (e) {}
    });
    
    this.oscillators = [];
    this.gainNodes = [];
  }

  private playAmbientMusic() {
    if (!this.audioContext || !this.masterGain || !this.isPlaying) return;

    // Clear previous oscillators
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.gainNodes.forEach(gain => {
      try {
        gain.disconnect();
      } catch (e) {}
    });
    this.oscillators = [];
    this.gainNodes = [];

    const currentTime = this.audioContext.currentTime;
    const duration = 8; // 8 seconds loop

    // Ambient chord progression (C major -> F major -> G major -> C major)
    const chords = [
      { notes: [261.63, 329.63, 392.00], startTime: 0 }, // C major
      { notes: [349.23, 440.00, 523.25], startTime: 2 }, // F major
      { notes: [392.00, 493.88, 587.33], startTime: 4 }, // G major
      { notes: [261.63, 329.63, 392.00], startTime: 6 }, // C major
    ];

    chords.forEach(chord => {
      chord.notes.forEach((freq, noteIndex) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain!);

        // Use triangle wave for softer sound
        oscillator.type = 'triangle';
        oscillator.frequency.value = freq;

        // Smooth envelope
        const noteStartTime = currentTime + chord.startTime;
        const noteDuration = 2;
        
        gainNode.gain.setValueAtTime(0, noteStartTime);
        gainNode.gain.linearRampToValueAtTime(0.3, noteStartTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.2, noteStartTime + noteDuration * 0.5);
        gainNode.gain.linearRampToValueAtTime(0, noteStartTime + noteDuration);

        oscillator.start(noteStartTime);
        oscillator.stop(noteStartTime + noteDuration);

        this.oscillators.push(oscillator);
        this.gainNodes.push(gainNode);
      });
    });

    // Add subtle bass note
    const bassOsc = this.audioContext.createOscillator();
    const bassGain = this.audioContext.createGain();
    bassOsc.connect(bassGain);
    bassGain.connect(this.masterGain);
    
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 130.81; // C3
    
    bassGain.gain.setValueAtTime(0, currentTime);
    bassGain.gain.linearRampToValueAtTime(0.15, currentTime + 0.2);
    bassGain.gain.linearRampToValueAtTime(0.1, currentTime + duration * 0.5);
    bassGain.gain.linearRampToValueAtTime(0, currentTime + duration);
    
    bassOsc.start(currentTime);
    bassOsc.stop(currentTime + duration);
    
    this.oscillators.push(bassOsc);
    this.gainNodes.push(bassGain);

    // Loop the music
    this.loopTimeout = window.setTimeout(() => {
      if (this.isPlaying) {
        this.playAmbientMusic();
      }
    }, duration * 1000);
  }
}

// Lazy initialization to avoid blocking
let backgroundMusicInstance: BackgroundMusic | null = null;

export const backgroundMusic = {
  start: () => {
    if (!backgroundMusicInstance) {
      backgroundMusicInstance = new BackgroundMusic();
    }
    backgroundMusicInstance.start();
  },
  stop: () => {
    if (backgroundMusicInstance) {
      backgroundMusicInstance.stop();
    }
  }
};
