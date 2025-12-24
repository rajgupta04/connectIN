let audioCtx;
let osc;
let gain;
let intervalId;

const getAudioContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  return Ctx ? new Ctx() : null;
};

export const startRingtone = async () => {
  try {
    if (intervalId) return true;
    if (typeof window === 'undefined') return false;

    audioCtx = getAudioContext();
    if (!audioCtx) return false;

    // Some browsers require user interaction before audio can play.
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }

    osc = audioCtx.createOscillator();
    gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();

    const beep = () => {
      if (!audioCtx || !gain) return;
      const t = audioCtx.currentTime;
      // Quick double beep
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.18, t + 0.01);
      gain.gain.setValueAtTime(0, t + 0.18);
      gain.gain.setValueAtTime(0.18, t + 0.28);
      gain.gain.setValueAtTime(0, t + 0.45);
    };

    beep();
    intervalId = window.setInterval(beep, 1100);

    // Optional vibration (mobile)
    if (navigator?.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    return true;
  } catch (e) {
    console.warn('[ringtone] failed to start', e);
    return false;
  }
};

export const stopRingtone = () => {
  try {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }

    if (gain && audioCtx) {
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
    }

    if (osc) {
      try {
        osc.stop();
      } catch (_) {
        // ignore
      }
      try {
        osc.disconnect();
      } catch (_) {
        // ignore
      }
      osc = undefined;
    }

    if (gain) {
      try {
        gain.disconnect();
      } catch (_) {
        // ignore
      }
      gain = undefined;
    }

    if (audioCtx) {
      const ctx = audioCtx;
      audioCtx = undefined;
      ctx.close?.().catch?.(() => {});
    }
  } catch (e) {
    console.warn('[ringtone] failed to stop', e);
  }
};
