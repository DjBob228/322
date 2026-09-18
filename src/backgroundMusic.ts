// Background music using Web Audio API
class BackgroundMusic {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private oscillators: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
  }

  async start() {
    if (!this.audioContext || this.isPlaying) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isPlaying = true;
      this.playMelody();
    } catch (error) {
      console.error('Failed to start background music:', error);
    }
  }

  stop() {
    this.isPlaying = false;
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.oscillators = [];
    this.gainNodes = [];
  }

  private playMelody() {
    if (!this.audioContext || !this.isPlaying) return;

    // Simple card game melody - C major scale pattern
    const notes = [
      { freq: 261.63, duration: 0.5 }, // C4
      { freq: 293.66, duration: 0.5 }, // D4
      { freq: 329.63, duration: 0.5 }, // E4
      { freq: 349.23, duration: 0.5 }, // F4
      { freq: 392.00, duration: 0.5 }, // G4
      { freq: 349.23, duration: 0.5 }, // F4
      { freq: 329.63, duration: 0.5 }, // E4
      { freq: 293.66, duration: 0.5 }, // D4
    ];

    let currentTime = this.audioContext.currentTime;

    notes.forEach((note, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = note.freq;

      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(0.05, currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + note.duration);

      oscillator.start(currentTime);
      oscillator.stop(currentTime + note.duration);

      this.oscillators.push(oscillator);
      this.gainNodes.push(gainNode);

      currentTime += note.duration;
    });

    // Loop the melody
    const totalDuration = notes.reduce((sum, note) => sum + note.duration, 0);
    setTimeout(() => {
      if (this.isPlaying) {
        this.playMelody();
      }
    }, totalDuration * 1000);
  }
}

export const backgroundMusic = new BackgroundMusic();
