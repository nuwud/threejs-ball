/**
 * UI Components for audio system
 * Contains UI elements and controls related to the audio system
 */

// Green squares visibility control
let greenSquaresVisible = false;

/**
 * Toggle the visibility of green squares
 * @returns {boolean} New visibility state
 */
export function toggleGreenSquares() {
    greenSquaresVisible = !greenSquaresVisible;
    const greenSquares = document.querySelectorAll('.green-square');
    greenSquares.forEach(square => {
        square.style.display = greenSquaresVisible ? 'block' : 'none';
    });
    return greenSquaresVisible;
}

/**
 * Initialize UI components
 */
export function initializeUI() {
    // Add a button to the UI to control the visibility
    const toggleButton = document.createElement('button');
    toggleButton.innerText = 'Toggle Green Squares';
    toggleButton.classList.add('audio-ui-button');
    toggleButton.addEventListener('click', toggleGreenSquares);
    document.body.appendChild(toggleButton);
    
    // Ensure green squares are hidden by default
    document.addEventListener('DOMContentLoaded', () => {
        toggleGreenSquares();
    });
    
    console.log('Audio UI components initialized');
}

/**
 * Get current visibility state of green squares
 * @returns {boolean} Current visibility state
 */
export function areGreenSquaresVisible() {
    return greenSquaresVisible;
}
