// visualization-default-off.js
// Makes sure the audio visualizations are OFF by default and only enabled when toggled

document.addEventListener('DOMContentLoaded', function() {
  // Wait a short moment to ensure everything is loaded
  setTimeout(() => {
    // Make sure visualization container is hidden by default
    const visualizationContainer = document.getElementById('visualization-container');
    if (visualizationContainer) {
      visualizationContainer.style.display = 'none';
      console.log('Visualization container hidden by default');
    }
    
    // Make sure checkbox is unchecked by default
    const toggleVisualizationInput = document.getElementById('toggle-visualization');
    if (toggleVisualizationInput) {
      toggleVisualizationInput.checked = false;
      console.log('Visualization toggle unchecked by default');
    }
    
    // Also ensure the app.visualization active property is set to false
    if (window.app && window.app.visualization) {
      window.app.visualization.active = false;
    }
    
    // And for the enhanced visualization too
    if (window.app && window.app.enhancedVisualization) {
      window.app.enhancedVisualization.active = false;
    }
    
    console.log('Audio visualization set to disabled by default');
  }, 200);
});