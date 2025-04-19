// import { soundManager } from '../../managers/soundManager';
// import { menuConfig } from '../../config/menuConfig';

// Import necessary modules or dependencies

// ... existing menu setup code ...

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    const menuPanel = document.getElementById('menu-panel');
    const closeMenuBtn = document.getElementById('close-menu-btn');

    // Toggle the menu panel on click
    menuBtn.addEventListener('click', () => {
        if (menuPanel) {
            menuPanel.classList.toggle('open');
        } else {
            console.error('Menu panel not found!');
        }
    });

    // Close the menu panel on close button click
    closeMenuBtn.addEventListener('click', () => {
        menuPanel.classList.remove('open');
    });

    // Wait for menu HTML to be loaded if it's dynamic
    const menuContainer = document.getElementById('menu-container');
    const observer = new MutationObserver((mutationsList, observer) => {
        const soundToggle = document.getElementById('master-sound-toggle');
        if (soundToggle) {
            initializeSoundToggle(soundToggle);
            observer.disconnect(); // Stop observing once the element is found
        }
    });

    // Start observing the menu container for added nodes
    observer.observe(menuContainer, { childList: true, subtree: true });

    // Fallback in case the element is already there when this script runs
    const initialSoundToggle = document.getElementById('master-sound-toggle');
    if (initialSoundToggle) {
        initializeSoundToggle(initialSoundToggle);
        observer.disconnect();
    }

    const toggleWireframe = document.getElementById('toggle-wireframe');
    toggleWireframe.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        // Apply wireframe mode logic here
    });
});

function initializeSoundToggle(soundToggle) {
    // Example: Assume a global sound manager or state
    // Replace with your actual sound management logic
    const isSoundEnabled = () => !window.debugToggles?.mute; // Link to debug flag or soundManager state
    const setSoundEnabled = (enabled) => {
        if (window.debugToggles) {
            window.debugToggles.mute = !enabled;
            console.log(`Master Sound ${enabled ? 'Enabled' : 'Disabled'}`);
            // Add calls to your actual soundManager.mute() or soundManager.unmute() here
        }
    };

    soundToggle.checked = isSoundEnabled(); // Set initial state

    soundToggle.addEventListener('change', (event) => {
        setSoundEnabled(event.target.checked);
    });
}

// ... rest of menu.js ...

// Example: Add functionality for other menu items
function initializeMenuItems() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach((item) => {
        item.addEventListener('click', (event) => {
            const action = event.target.dataset.action;
            if (action) {
                handleMenuAction(action);
            }
        });
    });
}

function handleMenuAction(action) {
    switch (action) {
        case 'start-game':
            console.log('Starting game...');
            // Add logic to start the game
            break;
        case 'settings':
            console.log('Opening settings...');
            // Add logic to open settings
            break;
        case 'exit':
            console.log('Exiting...');
            // Add logic to exit the application
            break;
        default:
            console.warn(`Unknown action: ${action}`);
    }
}

// Initialize the menu items when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeMenuItems();
});

<div class="menu-panel" id="menu-panel">
    <div class="menu-header">
        <h2>Menu</h2>
        <button class="close-btn" id="close-menu-btn">×</button>
    </div>
    <div class="menu-content">
        <div class="menu-item" data-action="start-game">Start Game</div>
        <div class="menu-item" data-action="settings">Settings</div>
        <div class="menu-item" data-action="exit">Exit</div>
        <label>
            <input type="checkbox" id="toggle-wireframe" />
            Toggle Wireframe
        </label>
        <label>
            <input type="checkbox" id="master-sound-toggle" />
            Master Sound
        </label>
        <div class="section-header">
            <span>Collapsible Section</span>
            <span class="expand-icon">+</span>
        </div>
    </div>
</div>
