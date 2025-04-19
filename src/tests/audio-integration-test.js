import { setupEnhancedAudio, playFacetSound } from '../audio/index.js';

export function testAudioIntegration(app) {
    console.log('Testing audio integration...');
    
    // Test setup
    const setupResult = setupEnhancedAudio(app);
    console.log('Audio setup result:', setupResult);
    
    // Test facet sound
    try {
        playFacetSound(app, 0);
        console.log('Facet sound test: SUCCESS');
    } catch (error) {
        console.error('Facet sound test: FAILED', error);
    }
    
    // Additional tests can be added here...
}
