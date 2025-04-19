/**
 * Simple menu handling script
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('menu.js loaded');
  
  // Get main menu elements
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('menu');
  
  // Setup menu toggle with animation
  if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
      console.log('Toggling menu');
      menu.classList.toggle('open');
      hamburger.classList.toggle('open');
    });
  }
  
  // Add click-away functionality
  document.addEventListener('click', (e) => {
    if (menu && menu.classList.contains('open')) {
      // Check if click is outside the menu and not on hamburger
      if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
        menu.classList.remove('open');
        hamburger.classList.remove('open');
      }
    }
  });
  
  // Initialize menu controls
  initMenuControls();
  
  // After all app assignments and initializations (typically in main.js), add:
  if (window.app) {
    // Ensure wireMesh exists
    if (!window.app.ballGroup?.userData?.wireMesh) {
      console.log('Attempting to create wireframe mesh...');
      // Try to find or create a wireMesh if missing
      if (window.app.ballGroup && window.app.ballGroup.children?.length > 0) {
        const THREE = window.THREE || window.app.THREE;
        if (THREE) {
          const ballMesh = window.app.ballGroup.children.find(child => child.isMesh && child.geometry);
          if (ballMesh) {
            try {
              const wireMaterial = new THREE.MeshBasicMaterial({ 
                wireframe: true, 
                color: 0x00ffff, 
                transparent: true,
                opacity: 0.5 
              });
              const wireMesh = new THREE.Mesh(ballMesh.geometry.clone(), wireMaterial);
              wireMesh.visible = false;
              window.app.ballGroup.add(wireMesh);
              window.app.ballGroup.userData.wireMesh = wireMesh;
              console.log('Wireframe mesh created and attached successfully');
            } catch (error) {
              console.error('Failed to create wireframe mesh:', error);
            }
          } else {
            console.warn('No suitable mesh found in ballGroup for creating wireframe');
          }
        } else {
          console.warn('THREE not available, cannot create wireframe mesh');
        }
      } else {
        console.warn('ballGroup not available or has no children, cannot create wireframe');
      }
    }

    // Add rainbow effect methods if not present
    if (!window.app.enableRainbowEffect) {
      window.app.enableRainbowEffect = function() {
        this.isRainbowMode = true;
        console.log('Rainbow effect enabled');
        
        // Create rainbow animation if not exists
        if (!this.rainbowAnimation) {
          const updateColors = () => {
            if (!this.isRainbowMode) return;
            
            // Generate rainbow colors based on time
            const time = Date.now() * 0.001;
            const r = Math.sin(time * 0.3) * 0.5 + 0.5;
            const g = Math.sin(time * 0.5) * 0.5 + 0.5;
            const b = Math.sin(time * 0.7) * 0.5 + 0.5;
            
            // Apply to ball material if exists
            if (this.ballGroup?.children[0]?.material) {
              const material = this.ballGroup.children[0].material;
              if (material.color) {
                material.color.setRGB(r, g, b);
                material.needsUpdate = true;
              }
            }
            
            // Continue animation if rainbow mode is still active
            if (this.isRainbowMode) {
              requestAnimationFrame(updateColors);
            }
          };
          
          updateColors();
        }
      };
    }
    
    if (!window.app.disableRainbowEffect) {
      window.app.disableRainbowEffect = function() {
        this.isRainbowMode = false;
        console.log('Rainbow effect disabled');
        
        // Reset to default color if ball exists
        if (this.ballGroup?.children[0]?.material) {
          const material = this.ballGroup.children[0].material;
          if (material.color) {
            material.color.setRGB(1, 0, 1); // Reset to magenta
            material.needsUpdate = true;
          }
        }
      };
    }

    // Add test sound method if not present
    if (!window.app.playTestSound) {
      window.app.playTestSound = function() {
        console.log('Playing test sound');
        try {
          // Use soundManager if available, else fallback to local implementation
          if (this.soundManager?.playTestSound) {
            this.soundManager.playTestSound();
            return;
          }
          
          // Fallback: simple beep
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audioCtx = this.audioContext || new AudioContext();
          
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.3);
          
          // Store audioContext for future use if not exists
          if (!this.audioContext) {
            this.audioContext = audioCtx;
          }
        } catch (error) {
          console.error('Error playing test sound:', error);
        }
      };
    }

    // Add reset ball method if not present
    if (!window.app.resetBall) {
      window.app.resetBall = function() {
        console.log('Resetting ball position, rotation, and scale');
        if (this.ballGroup) {
          this.ballGroup.position.set(0, 0, 0);
          this.ballGroup.rotation.set(0, 0, 0);
          this.ballGroup.scale.set(1, 1, 1);
        } else {
          console.warn('Cannot reset ball: ballGroup not found');
        }
      };
    }

    // Ensure spiky mode methods exist
    if (!window.app.enableSpikyMode) {
      window.app.enableSpikyMode = function() {
        this.isSpikyMode = true;
        console.log('Spiky mode enabled');
        
        // Apply spiky effect to ball geometry if possible
        if (this.ballGroup?.children[0]?.geometry) {
          const geometry = this.ballGroup.children[0].geometry;
          if (geometry.attributes?.position && !this._originalPositions) {
            // Store original positions
            const positions = geometry.attributes.position;
            this._originalPositions = new Float32Array(positions.array.length);
            for (let i = 0; i < positions.array.length; i++) {
              this._originalPositions[i] = positions.array[i];
            }
            
            // Apply spikes
            for (let i = 0; i < positions.count; i++) {
              const vertex = new THREE.Vector3(
                positions.array[i * 3],
                positions.array[i * 3 + 1],
                positions.array[i * 3 + 2]
              );
              
              // Normalize to get direction from center
              const direction = vertex.normalize();
              
              // Add random spike length
              const spikeLength = Math.random() * 0.2;
              
              // Apply spike
              positions.array[i * 3] *= (1 + spikeLength);
              positions.array[i * 3 + 1] *= (1 + spikeLength);
              positions.array[i * 3 + 2] *= (1 + spikeLength);
            }
            
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
          }
        }
      };
    }
    
    if (!window.app.disableSpikyMode) {
      window.app.disableSpikyMode = function() {
        this.isSpikyMode = false;
        console.log('Spiky mode disabled');
        
        // Restore original geometry if we have it
        if (this.ballGroup?.children[0]?.geometry && this._originalPositions) {
          const geometry = this.ballGroup.children[0].geometry;
          const positions = geometry.attributes.position;
          
          for (let i = 0; i < positions.array.length; i++) {
            positions.array[i] = this._originalPositions[i];
          }
          
          positions.needsUpdate = true;
          geometry.computeVertexNormals();
        }
      };
    }

    // Ensure facet highlighting methods exist
    if (!window.app.enableFacetHighlighting) {
      window.app.enableFacetHighlighting = function() {
        this.isFacetHighlighting = true;
        console.log('Facet highlighting enabled');
        
        // Create facet highlighting if possible
        if (this.ballGroup?.children[0]?.material) {
          const material = this.ballGroup.children[0].material;
          material.flatShading = true;
          material.needsUpdate = true;
          
          if (this.ballGroup.children[0].geometry) {
            this.ballGroup.children[0].geometry.computeFlatVertexNormals?.();
          }
        }
      };
    }
    
    if (!window.app.disableFacetHighlighting) {
      window.app.disableFacetHighlighting = function() {
        this.isFacetHighlighting = false;
        console.log('Facet highlighting disabled');
        
        // Disable flat shading
        if (this.ballGroup?.children[0]?.material) {
          const material = this.ballGroup.children[0].material;
          material.flatShading = false;
          material.needsUpdate = true;
          
          if (this.ballGroup.children[0].geometry) {
            this.ballGroup.children[0].geometry.computeVertexNormals?.();
          }
        }
      };
    }

    // Ensure sound manager exists
    if (!window.app.soundManager) {
      console.log('Creating soundManager...');
      window.app.soundManager = {
        _volume: 0.7,
        
        setVolume: function(val) {
          this._volume = val;
          console.log('Sound volume set to:', val);
          
          // Apply to gain node if exists
          if (window.app.audioContext?.gainNode) {
            window.app.audioContext.gainNode.gain.value = val;
          }
        },
        
        playTestSound: function() {
          window.app.playTestSound();
        },
        
        getMuted: function() {
          return !!window.app.soundMuted;
        },
        
        setMuted: function(val) {
          window.app.soundMuted = !!val;
          console.log('Sound muted set to:', val);
        }
      };
    }

    // Ensure sound scheduler exists
    if (!window.app.soundScheduler) {
      console.log('Creating soundScheduler...');
      window.app.soundScheduler = {
        _continuousMode: false,
        
        setContinuousMode: function(val) {
          this._continuousMode = !!val;
          window.app.isContinuousMode = !!val;
          console.log('Continuous audio mode set to:', val);
        },
        
        getContinuousMode: function() {
          return this._continuousMode;
        }
      };
    }

    // Ensure audio visualization exists
    if (!window.app.audioVisualization) {
      console.log('Creating audioVisualization...');
      window.app.audioVisualization = {
        active: false,
        container: { 
          visible: false 
        },
        setActive: function(val) {
          this.active = !!val;
          this.container.visible = !!val;
          console.log('Audio visualization active set to:', val);
        }
      };
    }

    // Create a more robust uiBridge with complete functionality
    window.app.uiBridge = {
      // WIREFRAME
      get wireMesh() { 
        return window.app.ballGroup?.userData?.wireMesh; 
      },
      
      // RAINBOW MODE
      get isRainbowMode() { 
        return !!window.app.isRainbowMode; 
      },
      set isRainbowMode(val) { 
        const enabled = !!val;
        console.log(`Setting rainbow mode to: ${enabled}`);
        
        if (enabled) {
          window.app.enableRainbowEffect?.();
        } else {
          window.app.disableRainbowEffect?.();
        }
      },
      
      // SPIKY MODE
      get isSpikyMode() { 
        return !!window.app.isSpikyMode; 
      },
      set isSpikyMode(val) { 
        const enabled = !!val;
        console.log(`Setting spiky mode to: ${enabled}`);
        
        if (enabled) {
          window.app.enableSpikyMode?.();
        } else {
          window.app.disableSpikyMode?.();
        }
      },
      
      // FACET HIGHLIGHTING
      get isFacetHighlighting() { 
        return !!window.app.isFacetHighlighting; 
      },
      set isFacetHighlighting(val) { 
        const enabled = !!val;
        console.log(`Setting facet highlighting to: ${enabled}`);
        
        if (enabled) {
          window.app.enableFacetHighlighting?.();
        } else {
          window.app.disableFacetHighlighting?.();
        }
      },
      
      // TRAIL EFFECTS
      get isTrailEnabled() { 
        return !!window.app.isTrailEnabled; 
      },
      set isTrailEnabled(val) { 
        const enabled = !!val;
        window.app.isTrailEnabled = enabled;
        console.log(`Setting trail effect to: ${enabled}`);
        
        // Trigger trail creation/removal if methods exist
        if (enabled && typeof window.app.enableTrail === 'function') {
          window.app.enableTrail();
        } else if (!enabled && typeof window.app.disableTrail === 'function') {
          window.app.disableTrail();
        }
      },
      
      // BASS MODE
      get isBassMode() { 
        return !!window.app.isBassMode; 
      },
      set isBassMode(val) { 
        const enabled = !!val;
        window.app.isBassMode = enabled;
        console.log(`Setting bass mode to: ${enabled}`);
        
        // Call bass mode toggle handler if exists
        if (typeof window.app.onBassModeToggle === 'function') {
          window.app.onBassModeToggle(enabled);
        }
      },
      
      // AUDIO CORE
      get audioContext() { 
        return window.app.audioContext; 
      },
      
      get soundScheduler() { 
        return window.app.soundScheduler; 
      },
      
      setContinuousMode(val) {
        console.log(`Setting continuous audio mode to: ${val}`);
        window.app.soundScheduler?.setContinuousMode?.(val);
      },
      
      get audioVisualization() { 
        return window.app.audioVisualization; 
      },
      
      setAudioVisualizationActive(val) {
        console.log(`Setting audio visualization to: ${val}`);
        if (window.app.audioVisualization) {
          window.app.audioVisualization.active = !!val;
          if (window.app.audioVisualization.container) {
            window.app.audioVisualization.container.visible = !!val;
          }
        }
      },
      
      // SOUND CONTROLS
      setVolume(val) {
        console.log(`Setting volume to: ${val}`);
        window.app.soundManager?.setVolume?.(val);
      },
      
      playTestSound() {
        console.log('UI requested test sound');
        window.app.playTestSound?.();
      },
      
      get soundMuted() { 
        return !!window.app.soundMuted; 
      },
      set soundMuted(val) { 
        const muted = !!val;
        window.app.soundMuted = muted;
        console.log(`Setting sound muted to: ${muted}`);
        
        // Apply mute to audio context if exists
        if (window.app.audioContext && typeof window.app.audioContext.suspend === 'function' && 
            typeof window.app.audioContext.resume === 'function') {
          if (muted) {
            window.app.audioContext.suspend();
          } else {
            window.app.audioContext.resume();
          }
        }
      },
      
      // BALL CONTROLS
      resetBall() {
        console.log('UI requested ball reset');
        if (typeof window.app.resetBall === 'function') {
          window.app.resetBall();
        } else if (window.app.ballGroup) {
          window.app.ballGroup.position.set(0, 0, 0);
          window.app.ballGroup.rotation.set(0, 0, 0);
          window.app.ballGroup.scale.set(1, 1, 1);
        }
      },
      
      // EFFECTS
      createMagneticEffect() {
        console.log('UI requested magnetic effect');
        window.app.controls?.createMagneticEffect?.();
      },
      
      createBlackholeEffect() {
        console.log('UI requested blackhole effect');
        window.app.controls?.createBlackholeEffect?.();
      },
      
      createExplosion() {
        console.log('UI requested explosion effect');
        window.app.controls?.createExplosion?.();
      },
      
      createEmergencyBall() {
        console.log('UI requested emergency ball');
        window.app.createEmergencyBall?.();
      },
      
      createRecoveryBall() {
        console.log('UI requested recovery ball');
        window.app.createRecoveryBall?.();
      },
      
      // UI & DEBUG
      showStatus(msg) {
        console.log(`Status message: ${msg}`);
        if (typeof window.app.showStatus === 'function') {
          window.app.showStatus(msg);
        } else if (typeof window.showStatus === 'function') {
          window.showStatus(msg);
        } else {
          // Fallback status display
          const statusDiv = document.getElementById('status-message');
          if (statusDiv) {
            statusDiv.textContent = msg;
            statusDiv.style.opacity = 1;
            setTimeout(() => {
              statusDiv.style.opacity = 0;
            }, 2000);
          }
        }
      },
      
      debugAudioSystem() {
        console.log('UI requested audio debug');
        if (typeof window.debugAudioSystem === 'function') {
          window.debugAudioSystem(window.app);
        } else {
          console.warn('Audio debug function not available');
          this.showStatus('Audio debug not available');
        }
      },
      
      initDebug() {
        console.log('UI requested debug panel');
        if (typeof window.initDebug === 'function') {
          window.initDebug();
        } else {
          console.warn('Debug panel initialization not available');
          this.showStatus('Debug panel not available');
        }
      }
    };
    
    console.log('UI Bridge initialized and connected to app logic');
  }
});

// Utility to show a status message in #status-message if present
function showStatus(msg) {
  const statusDiv = document.getElementById('status-message');
  if (statusDiv) {
    statusDiv.textContent = msg;
    statusDiv.style.opacity = 1;
    setTimeout(() => {
      statusDiv.style.opacity = 0;
    }, 2000);
  }
}

// Initialize controls within the menu
function initMenuControls() {
  // Toggle controls
  const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const id = e.target.id;
      const enabled = e.target.checked;
      const app = window.app;
      if (!app?.uiBridge) {
        console.warn('app.uiBridge not available');
        return;
      }
      switch (id) {
        case 'toggle-wireframe': {
          const mesh = app.uiBridge.wireMesh;
          if (mesh) {
            mesh.visible = enabled;
            showStatus(`Wireframe ${enabled ? 'enabled' : 'disabled'}`);
          } else {
            console.warn('Wireframe mesh not found');
          }
          break;
        }
        case 'toggle-rainbow':
          if ('isRainbowMode' in app.uiBridge) {
            app.uiBridge.isRainbowMode = enabled;
            showStatus(`Rainbow mode ${enabled ? 'enabled' : 'disabled'}`);
          } else {
            console.warn('isRainbowMode not found on uiBridge');
          }
          break;
        case 'toggle-spiky':
          if ('isSpikyMode' in app.uiBridge) {
            app.uiBridge.isSpikyMode = enabled;
            showStatus(`Spiky mode ${enabled ? 'enabled' : 'disabled'}`);
          } else {
            console.warn('isSpikyMode not found on uiBridge');
          }
          break;
        case 'toggle-facet':
          if ('isFacetHighlighting' in app.uiBridge) {
            app.uiBridge.isFacetHighlighting = enabled;
            showStatus(`Facet highlighting ${enabled ? 'enabled' : 'disabled'}`);
          } else {
            console.warn('isFacetHighlighting not found on uiBridge');
          }
          break;
        case 'toggle-trail':
          if ('isTrailEnabled' in app.uiBridge) {
            app.uiBridge.isTrailEnabled = enabled;
            showStatus(`Trail ${enabled ? 'enabled' : 'disabled'}`);
          } else {
            console.warn('isTrailEnabled not found on uiBridge');
          }
          break;
        case 'toggle-audio': {
          const audioCtx = app.uiBridge.audioContext;
          if (audioCtx) {
            if (enabled && audioCtx.state === 'suspended') {
              audioCtx.resume().then(() => {
                showStatus('Audio enabled');
              });
            } else if (!enabled && audioCtx.state === 'running') {
              audioCtx.suspend().then(() => {
                showStatus('Audio disabled');
              });
            } else {
              showStatus(`Audio ${enabled ? 'enabled' : 'disabled'}`);
            }
            if ('soundMuted' in app.uiBridge) {
              app.uiBridge.soundMuted = !enabled;
            }
          } else {
            console.warn('audioContext not found on uiBridge');
          }
          break;
        }
        case 'toggle-continuous':
          if (typeof app.uiBridge.setContinuousMode === 'function') {
            app.uiBridge.setContinuousMode(enabled);
            showStatus(`Continuous mode ${enabled ? 'enabled' : 'disabled'}`);
          } else {
            console.warn('setContinuousMode not found on uiBridge');
          }
          break;
        case 'toggle-visualization':
          if (typeof app.uiBridge.setAudioVisualizationActive === 'function') {
            app.uiBridge.setAudioVisualizationActive(enabled);
            showStatus(`Audio visualization ${enabled ? 'enabled' : 'disabled'}`);
          } else {
            console.warn('setAudioVisualizationActive not found on uiBridge');
          }
          break;
        case 'toggle-bass-mode':
          if ('isBassMode' in app.uiBridge) {
            app.uiBridge.isBassMode = enabled;
            showStatus(`Bass mode ${enabled ? 'enabled' : 'disabled'}`);
            // Optionally, trigger synth logic here if needed
            if (typeof app.onBassModeToggle === 'function') {
              app.onBassModeToggle(enabled);
            }
          } else {
            console.warn('isBassMode not found on uiBridge');
          }
          break;
        default:
          console.warn(`No handler for toggle: ${id}`);
          break;
      }
    });
  });

  // Volume slider handler
  const volumeSlider = document.getElementById('volume-slider');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
      const app = window.app;
      const volume = volumeSlider.value / 100;
      if (app?.uiBridge?.setVolume) {
        app.uiBridge.setVolume(volume);
        showStatus(`Volume set to ${Math.round(volume * 100)}%`);
      } else {
        console.warn('setVolume not found on uiBridge');
      }
    });
  }

  // Button controls
  const buttonMap = {
    'reset-ball': () => {
      const app = window.app;
      if (app?.uiBridge?.resetBall) {
        app.uiBridge.resetBall();
        showStatus('Ball reset');
      } else {
        console.warn('resetBall not found on uiBridge');
      }
    },
    'test-audio': () => {
      const app = window.app;
      if (app?.uiBridge?.playTestSound) {
        app.uiBridge.playTestSound();
        showStatus('Test sound played');
      } else {
        console.warn('playTestSound not found on uiBridge');
      }
    },
    'explosion-effect': () => {
      const app = window.app;
      if (app?.uiBridge?.createExplosion) {
        app.uiBridge.createExplosion();
        showStatus('Explosion effect triggered');
      } else {
        console.warn('createExplosion not found on uiBridge');
      }
    },
    'blackhole-effect': () => {
      const app = window.app;
      if (app?.uiBridge?.createBlackholeEffect) {
        app.uiBridge.createBlackholeEffect();
        showStatus('Blackhole effect triggered');
      } else {
        console.warn('createBlackholeEffect not found on uiBridge');
      }
    },
    'magnetic-effect': () => {
      const app = window.app;
      if (app?.uiBridge?.createMagneticEffect) {
        app.uiBridge.createMagneticEffect();
        showStatus('Magnetic effect triggered');
      } else {
        console.warn('createMagneticEffect not found on uiBridge');
      }
    },
    'create-emergency-ball': () => {
      const app = window.app;
      if (app?.uiBridge?.createEmergencyBall) {
        app.uiBridge.createEmergencyBall();
        showStatus('Emergency ball created');
      } else {
        console.warn('createEmergencyBall not found on uiBridge');
      }
    },
    'create-recovery-ball': () => {
      const app = window.app;
      if (app?.uiBridge?.createRecoveryBall) {
        app.uiBridge.createRecoveryBall();
        showStatus('Recovery ball created');
      } else {
        console.warn('createRecoveryBall not found on uiBridge');
      }
    },
    'debug-audio-system': () => {
      const app = window.app;
      if (app?.uiBridge?.debugAudioSystem) {
        app.uiBridge.debugAudioSystem();
        showStatus('Audio debug system triggered');
      } else {
        console.warn('debugAudioSystem not found on uiBridge');
      }
    },
    'init-debug': () => {
      const app = window.app;
      if (app?.uiBridge?.initDebug) {
        app.uiBridge.initDebug();
        showStatus('Debug panel shown');
      } else {
        console.warn('initDebug not found on uiBridge');
      }
    },
    // Compatibility with alternate IDs
    'emergency-ball': () => {
      const app = window.app;
      if (app?.uiBridge?.createEmergencyBall) {
        app.uiBridge.createEmergencyBall();
        showStatus('Emergency ball created');
      } else {
        console.warn('createEmergencyBall not found on uiBridge');
      }
    },
    'recovery-ball': () => {
      const app = window.app;
      if (app?.uiBridge?.createRecoveryBall) {
        app.uiBridge.createRecoveryBall();
        showStatus('Recovery ball created');
      } else {
        console.warn('createRecoveryBall not found on uiBridge');
      }
    },
    'debug-audio': () => {
      const app = window.app;
      if (app?.uiBridge?.debugAudioSystem) {
        app.uiBridge.debugAudioSystem();
        showStatus('Audio debug system triggered');
      } else {
        console.warn('debugAudioSystem not found on uiBridge');
      }
    },
    'show-debug-panel': () => {
      const app = window.app;
      if (app?.uiBridge?.initDebug) {
        app.uiBridge.initDebug();
        showStatus('Debug panel shown');
      } else {
        console.warn('initDebug not found on uiBridge');
      }
    }
  };

  Object.keys(buttonMap).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        buttonMap[id]();
      });
    }
  });
}

// Simple test sound function
function playTestSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = window.app?.audioContext || new AudioContext();
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
    
    console.log('Test sound played');
  } catch (error) {
    console.error('Could not play test sound:', error);
  }
}
