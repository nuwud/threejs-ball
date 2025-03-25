document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menu-btn');
  const menuPanel = document.getElementById('menu-panel');
  const closeMenuBtn = document.getElementById('close-menu-btn');

  // Open menu
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (menuPanel) {
        menuPanel.classList.add('open');
      }
    });
  } else {
    console.warn('Menu button not found in DOM');
  }

  // Close menu
  if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', () => {
      if (menuPanel) {
        menuPanel.classList.remove('open');
      }
    });
  } else {
    console.warn('Close menu button not found in DOM');
  }

  // Close menu when clicking outside
  if (menuPanel) {
    document.addEventListener('click', (e) => {
      if (!menuPanel.contains(e.target) && 
          e.target !== menuBtn && 
          (menuBtn ? !menuBtn.contains(e.target) : true)) {
        menuPanel.classList.remove('open');
      }
    });
  }

  // Collapsible sections
  const collapsibleHeaders = document.querySelectorAll('.section-header');
  collapsibleHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const expandIcon = header.querySelector('.expand-icon');

      if (content && expandIcon) {
        if (content.style.maxHeight) {
          content.style.maxHeight = null;
          expandIcon.textContent = '+';
        } else {
          content.style.maxHeight = content.scrollHeight + 'px';
          expandIcon.textContent = '−';
        }
      }
    });
  });

  // Audio controls
  const testAudioBtn = document.getElementById('test-audio');
  if (testAudioBtn) {
    testAudioBtn.addEventListener('click', () => {
      if (window.appControls && window.appControls.playSound) {
        window.appControls.playSound();
        if (window.showStatus) {
          window.showStatus('Test Sound Played');
        }
      }
    });
  }
});

// Add global showStatus function if it doesn't exist
if (!window.showStatus) {
  window.showStatus = function(message) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.add('visible');
      
      // Hide after 3 seconds
      setTimeout(() => {
        statusEl.classList.remove('visible');
      }, 3000);
    }
    console.log("Status:", message);
  };
}
