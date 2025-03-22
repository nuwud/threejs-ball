// In a new file: js/audio/performance-monitor.js

import { getAudioStatus, recordAudioFailure } from './core.js';

class AudioPerformanceMonitor {
    constructor() {
        this.interval = null;
        this.lastFrameTime = 0;
        this.frameTimes = [];
        this.maxFrameTimes = 60; // Track last 60 frames
    }
    
    start() {
        if (this.interval) return;
        
        this.lastFrameTime = performance.now();
        
        // Monitor frame timing for audio scheduling
        const checkFrame = () => {
            const now = performance.now();
            const frameDuration = now - this.lastFrameTime;
            this.lastFrameTime = now;
            
            // Add to rolling window
            this.frameTimes.push(frameDuration);
            if (this.frameTimes.length > this.maxFrameTimes) {
                this.frameTimes.shift();
            }
            
            // Check for performance issues
            this.checkPerformance();
            
            // Schedule next check
            requestAnimationFrame(checkFrame);
        };
        
        // Start monitoring
        requestAnimationFrame(checkFrame);
        
        // Also check overall audio system status periodically
        this.interval = setInterval(() => this.checkAudioSystem(), 5000);
    }
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    
    checkPerformance() {
        // Calculate average frame time
        const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
        
        // Calculate jank (variation in frame times)
        let jank = 0;
        if (this.frameTimes.length > 5) {
            const variance = this.frameTimes.reduce((sum, time) => {
                return sum + Math.pow(time - avgFrameTime, 2);
            }, 0) / this.frameTimes.length;
            jank = Math.sqrt(variance);
        }
        
        // If significant jank, record as potential audio issue
        if (jank > 20 || avgFrameTime > 50) {
            recordAudioFailure();
        }
    }
    
    checkAudioSystem() {
        const status = getAudioStatus();
        
        // If too many active nodes, record failure
        if (status.activeNodes > 20) {
            recordAudioFailure();
            console.warn('Audio system stress detected: too many active nodes');
        }
    }
    
    getMetrics() {
        const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / 
                             Math.max(1, this.frameTimes.length);
        
        return {
            avgFrameTime,
            frameCount: this.frameTimes.length,
            audioStatus: getAudioStatus()
        };
    }
}

export const performanceMonitor = new AudioPerformanceMonitor();
export default performanceMonitor;