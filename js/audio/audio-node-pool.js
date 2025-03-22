/**
 * audio-node-pool.js
 * Manages a limited pool of reusable audio nodes to prevent performance issues
 */

/**
 * AudioNodePool class
 * Manages a pool of reusable audio nodes to improve performance
 * and reduce garbage collection
 */
export class AudioNodePool {
    /**
     * Create a new AudioNodePool
     * @param {AudioContext} audioContext - Web Audio API context
     * @param {number} maxSize - Maximum number of nodes to keep in the pool
     */
    constructor(audioContext, maxSize = 32) {
        this.audioContext = audioContext;
        this.maxSize = maxSize;
        this.pools = {
            // Don't pool oscillator nodes as they can't be reused after start()
            gain: [],
            biquadFilter: []
        };
        this.active = {
            oscillator: 0,
            gain: 0,
            biquadFilter: 0
        };
    }

    /**
     * Acquire an audio node of the specified type
     * @param {string} type - Type of node to acquire ('oscillator', 'gain', etc.)
     * @returns {AudioNode} An audio node
     */
    acquire(type) {
        // Handle oscillators specially - they can't be reused after start()
        if (type === 'oscillator') {
            const node = this.audioContext.createOscillator();
            this.active.oscillator = (this.active.oscillator || 0) + 1;
            return node;
        }
        
        // Handle unsupported types
        if (!this.pools[type]) {
            console.warn(`Unsupported node type: ${type}, creating a gain node instead`);
            type = 'gain';
        }

        // Get node from pool or create a new one
        let node;
        if (this.pools[type].length > 0) {
            node = this.pools[type].pop();
        } else {
            // Create a new node based on type
            switch (type) {
                case 'gain':
                    node = this.audioContext.createGain();
                    break;
                case 'biquadFilter':
                    node = this.audioContext.createBiquadFilter();
                    break;
                default:
                    node = this.audioContext.createGain();
            }
        }

        // Track active nodes
        this.active[type] = (this.active[type] || 0) + 1;
        
        return node;
    }

    /**
     * Release a node back to the pool
     * @param {AudioNode} node - The node to release
     */
    release(node) {
        if (!node) return;

        // Determine node type
        let type;
        if (node instanceof OscillatorNode) {
            // Never pool oscillator nodes, just update count
            this.active.oscillator = Math.max(0, (this.active.oscillator || 0) - 1);
            return;
        } else if (node instanceof GainNode) {
            type = 'gain';
        } else if (node instanceof BiquadFilterNode) {
            type = 'biquadFilter';
        } else {
            console.warn('Unknown node type, cannot release to pool');
            return;
        }

        // Update active count
        this.active[type] = Math.max(0, (this.active[type] || 0) - 1);

        // If pool is full, let the node be garbage collected
        if (this.pools[type].length >= this.maxSize) {
            return;
        }

        // Reset node state before returning to pool
        try {
            if (type === 'gain') {
                node.gain.value = 1;
            } else if (type === 'biquadFilter') {
                node.frequency.value = 350;
                node.Q.value = 1;
            }
        } catch (e) {
            console.warn('Error resetting node before release:', e);
            return; // Don't add to pool if reset fails
        }

        // Add back to pool
        this.pools[type].push(node);
    }

    /**
     * Release all nodes in the pool
     */
    releaseAll() {
        // Clear all pools
        for (const type in this.pools) {
            this.pools[type] = [];
        }
        
        // Reset active counts
        for (const type in this.active) {
            this.active[type] = 0;
        }
    }

    /**
     * Get the number of active nodes
     * @returns {number} Total number of active nodes
     */
    getActiveCount() {
        let total = 0;
        for (const type in this.active) {
            total += this.active[type];
        }
        return total;
    }
}