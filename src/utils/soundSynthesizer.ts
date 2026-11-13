/**
 * Web Audio API Retro Chiptune BGM Player
 * Synthesizes a sweet, gentle 2000s Cyworld 8-bit wedding melody.
 * Zero external MP3 dependencies, prevents broken links, 100% reliable.
 */

class SoundSynthesizer {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private timerId: number | null = null;
  private currentNoteIndex = 0;
  private listeners: ((playing: boolean) => void)[] = [];
  private volume = 0.12;

  // Romantic wedding progression (Canon in D / Wedding March motif in gentle pentatonic/major)
  private readonly melody = [
    // [Note frequency, duration in beats]
    // Canon motif: D4, A3, B3, F#3, G3, D3, G3, A3
    { freq: 587.33, dur: 0.5 }, // D5
    { freq: 523.25, dur: 0.5 }, // C5
    { freq: 493.88, dur: 0.5 }, // B4
    { freq: 440.00, dur: 0.5 }, // A4
    { freq: 392.00, dur: 0.5 }, // G4
    { freq: 329.63, dur: 0.5 }, // E4
    { freq: 392.00, dur: 0.5 }, // G4
    { freq: 440.00, dur: 0.5 }, // A4

    { freq: 587.33, dur: 0.75 }, // D5
    { freq: 659.25, dur: 0.25 }, // E5
    { freq: 587.33, dur: 0.5 }, // D5
    { freq: 493.88, dur: 0.5 }, // B4
    { freq: 440.00, dur: 0.5 }, // A4
    { freq: 392.00, dur: 0.5 }, // G4
    { freq: 440.00, dur: 1.0 }, // A4

    // Wedding chime arpeggio
    { freq: 587.33, dur: 0.35 },
    { freq: 739.99, dur: 0.35 },
    { freq: 880.00, dur: 0.7 },
    { freq: 739.99, dur: 0.35 },
    { freq: 587.33, dur: 0.7 },
    { freq: 659.25, dur: 0.35 },
    { freq: 587.33, dur: 0.7 },

    // Ending cadence
    { freq: 493.88, dur: 0.5 },
    { freq: 523.25, dur: 0.5 },
    { freq: 587.33, dur: 1.0 },
    { freq: 0, dur: 0.4 }, // pause
  ];

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public subscribe(cb: (playing: boolean) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.isPlaying));
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  public play(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      this.isPlaying = true;
      this.notify();
      this.scheduleNextNote();
    } catch (e) {
      console.warn('Audio playback not allowed yet without user interaction:', e);
      this.isPlaying = false;
      this.notify();
    }
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.notify();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private scheduleNextNote(): void {
    if (!this.isPlaying) return;

    const ctx = this.getAudioContext();
    const note = this.melody[this.currentNoteIndex];
    const beatDuration = 0.55; // tempo ~ 110 bpm
    const durInSeconds = note.dur * beatDuration;

    if (note.freq > 0) {
      this.playTone(ctx, note.freq, durInSeconds * 0.9);
      // Add subtle harmony bass/chime
      if (this.currentNoteIndex % 2 === 0) {
        this.playSubBass(ctx, note.freq / 2, durInSeconds * 0.8);
      }
    }

    this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;

    this.timerId = window.setTimeout(() => {
      this.scheduleNextNote();
    }, durInSeconds * 1000);
  }

  private playTone(ctx: AudioContext, freq: number, duration: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Sweet retro bell-like triangle wave
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Warm ADSR envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private playSubBass(ctx: AudioContext, freq: number, duration: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /**
   * Triggers a cute single retro chime sound effect (e.g. when clicking hearts or button)
   */
  public playChime(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio not initialized or blocked
    }
  }
}

export const bgmPlayer = new SoundSynthesizer();
