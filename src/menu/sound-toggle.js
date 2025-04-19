document.addEventListener('DOMContentLoaded', () => {
  const soundBtn = document.getElementById('toggle-sound');

  soundBtn?.addEventListener('click', () => {
    const isMuted = window.app?.soundMuted ?? false;
    window.app.soundMuted = !isMuted;

    soundBtn.textContent = isMuted ? '🔊 Sound' : '🔇 Muted';

    // Optional: Actually mute your audio
    if (window.app?.soundEffects?.setMuted) {
      window.app.soundEffects.setMuted(window.app.soundMuted);
    }

    console.log(`Sound ${window.app.soundMuted ? 'muted' : 'enabled'}`);
  });
});
