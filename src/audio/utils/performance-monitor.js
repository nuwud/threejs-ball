// In a new file: js/audio/performance-monitor.js

import { getAudioStatus, recordAudioFailure } from '../core.js';

// Threshold constants for performance monitoring
const JANK_THRESHOLD = 20; // Maximum allowable jank in ms
const AVG_FRAME_TIME_THRESHOLD = 50; // Maximum allowable average frame time in ms

class AudioPerformanceMonitor {
    constructor() {
        this.interval = null;
        this.lastFrameTime = 0;
        this.frameTimes = [];
        this.maxFrameTimes = 60; // Track last 60 frames
        this.isMonitoring = false;
    }
    
    start() {
        if (this.interval || this.isMonitoring) return;
        this.isMonitoring = true;
        
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
            const minDelay = 16; // Minimum delay in ms (~60 FPS)
            if (now - this.lastFrameTime >= minDelay) {
                requestAnimationFrame(checkFrame);
            } else {
                setTimeout(() => requestAnimationFrame(checkFrame), minDelay - (now - this.lastFrameTime));
            }
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
        const avgFrameTime = this.frameTimes.length > 0 
            ? this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length 
            : 0;
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
        if (jank > JANK_THRESHOLD || avgFrameTime > AVG_FRAME_TIME_THRESHOLD) {
            // If significant jank, record as potential audio issue
            if (jank > 20 || avgFrameTime > 50) {
                recordAudioFailure();
            }
        }
    }
    
    checkAudioSystem() {
        const status = getAudioStatus();
        
        // If too many active nodes, record failure
        if (status.activeNodes > 20) {
            recordAudioFailure();
            console.warn(`Audio system stress detected: too many active nodes (${status.activeNodes} active nodes)`);
        }
    }
    
    getMetrics() {
        const avgFrameTime = this.frameTimes.length > 0 
            ? this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length 
            : 0;
        
        return {
            avgFrameTime,
            frameCount: this.frameTimes.length,
            audioStatus: getAudioStatus()
        };
    }
}

export const performanceMonitor = new AudioPerformanceMonitor();