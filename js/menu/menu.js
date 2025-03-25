document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menu-btn');
  const menuPanel = document.getElementById('menu-panel');
  const closeMenuBtn = document.getElementById('close-menu-btn');

  // Open menu
  menuBtn.addEventListener('click', () => {
    menuPanel.classList.add('open');
  });

  // Close menu
  closeMenuBtn.addEventListener('click', () => {
    menuPanel.classList.remove('open');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuPanel.contains(e.target) && 
        e.target !== menuBtn && 
        !menuBtn.contains(e.target)) {
      menuPanel.classList.remove('open');
    }
  });

  // Collapsible sections
  const collapsibleHeaders = document.querySelectorAll('.section-header');
  collapsibleHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const expandIcon = header.querySelector('.expand-icon');

      if (content.style.maxHeight) {
        content.style.maxHeight = null;
        expandIcon.textContent = '+';
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        expandIcon.textContent = '−';
      }
    });
  });

  // Audio controls
  const testAudioBtn = document.getElementById('test-audio');
  if (testAudioBtn) {
    testAudioBtn.addEventListener('click', () => {
      if (window.appControls && window.appControls.playSound) {
        window.appControls.playSound();
        showStatus('Test Sound Played');
      }
    });
  }
});
