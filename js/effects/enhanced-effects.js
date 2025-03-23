// enhanced-effects.js
// This script augments the ball with enhanced effects from the original implementation

// Import Three.js if needed in module context
// import * as THREE from 'three';

// Wait for the document to load and Three.js to initialize
document.addEventListener('DOMContentLoaded', function () {
    // Wait a bit for all scripts to load
    setTimeout(function () {
        if (!window.app || !window.app.scene) {
            console.log("Can't find app or scene for enhanced effects");
            return;
        }

        console.log("Enhancing ball with additional effects...");

        // Global variables for keeping track of effect state
        const effectState = {
            isRainbowMode: false,
            isMagneticMode: false,
            magneticParticles: [],
            blackholeEffect: null,
            blackholeRingParticles: [],
            gravitationalPull: 0,
            spikiness: 0,
            spikes: [],
            audioVisualization: null,
            isExploded: false,
            particleSystem: null,
            touchPoint: null,
            isHovered: false,
            targetScale: 1.0,
            currentScale: 1.0,
            isDragging: false
        };

        // Store original colors for the ball
        const colorStart = '#FF00FF'; // Neon pink at center
        const colorMid = '#8800FF';   // Purple in middle
        const colorEnd = '#00FFFF';   // Cyan at edges

        // Helper function for gradient textures
        function createGradientTexture(colorStart, colorMid, colorEnd) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;

            const context = canvas.getContext('2d');

            // Create gradient
            const gradient = context.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width / 2
            );

            // Add gradient colors
            gradient.addColorStop(0, colorStart);
            gradient.addColorStop(0.5, colorMid);
            gradient.addColorStop(1, colorEnd);

            // Fill with gradient
            context.fillStyle = gradient;
            context.fillRect(0, 0, canvas.width, canvas.height);

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;

            return texture;
        }

        // Helper function to update gradient colors
        function updateGradientColors(newColorStart, newColorMid, newColorEnd) {
            if (!window.app.ballGroup || !window.app.ballGroup.userData || !window.app.ballGroup.userData.mat) {
                return;
            }

            // Create a new texture with updated colors
            const gradientTexture = createGradientTexture(newColorStart, newColorMid, newColorEnd);

            // Apply it to the material
            const mat = window.app.ballGroup.userData.mat;
            mat.map = gradientTexture;
            mat.needsUpdate = true;
        }

        // Helper function for smooth color transitions using GSAP-like tweening
        function gsapFade(colorObj, targetColor, duration) {
            const startColor = { r: colorObj.r, g: colorObj.g, b: colorObj.b };
            const startTime = Date.now();
            const endTime = startTime + (duration * 1000);

            function updateColor() {
                const now = Date.now();
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / (duration * 1000), 1);

                // Simple easing function
                const eased = progress * (2 - progress);

                // Interpolate colors
                colorObj.r = startColor.r + (targetColor.r - startColor.r) * eased;
                colorObj.g = startColor.g + (targetColor.g - startColor.g) * eased;
                colorObj.b = startColor.b + (targetColor.b - startColor.b) * eased;

                if (progress < 1) {
                    requestAnimationFrame(updateColor);
                }
            }

            updateColor();
        }

        // Function to apply deformation to the mesh at a specific point
        function applyDeformation(point, intensity, radius) {
            if (!window.app.ballGroup || !window.app.ballGroup.userData || !window.app.ballGroup.userData.geo) {
                return;
            }

            const geo = window.app.ballGroup.userData.geo;
            const mesh = window.app.ballGroup.userData.mesh;
            const wireGeo = window.app.ballGroup.userData.wireGeo;
            const wireMesh = window.app.ballGroup.userData.wireMesh;
            const originalPositions = window.app.ballGroup.userData.originalPositions;

            if (!geo || !originalPositions) return;

            // Get position attribute for direct manipulation
            const positions = geo.attributes.position;

            // Apply deformation to each vertex based on distance from touch point
            for (let i = 0; i < positions.count; i++) {
                const vertexPosition = new THREE.Vector3(
                    positions.array[i * 3],
                    positions.array[i * 3 + 1],
                    positions.array[i * 3 + 2]
                );

                // Calculate world position of the vertex
                const worldPosition = vertexPosition.clone()
                    .applyMatrix4(mesh.matrixWorld);

                // Calculate distance from touch point
                const distance = worldPosition.distanceTo(point);

                // Only affect vertices within radius
                if (distance < radius) {
                    // Calculate direction vector from touch point to vertex
                    const direction = worldPosition.clone().sub(point).normalize();

                    // Calculate deformation factor based on distance (closer = more deformation)
                    const factor = (1 - (distance / radius)) * intensity;

                    // Move vertex in the direction from touch point (inward deformation)
                    const deformation = direction.multiplyScalar(-factor);

                    // Apply deformation (in local space)
                    const localDeformation = deformation.clone()
                        .applyMatrix4(mesh.matrixWorld.clone().invert());

                    // Get original position (pre-deformation)
                    const originalX = originalPositions[i * 3];
                    const originalY = originalPositions[i * 3 + 1];
                    const originalZ = originalPositions[i * 3 + 2];

                    // Apply deformation and blend with original position
                    positions.array[i * 3] = originalX + localDeformation.x;
                    positions.array[i * 3 + 1] = originalY + localDeformation.y;
                    positions.array[i * 3 + 2] = originalZ + localDeformation.z;
                }
            }

            // Update wireframe to match the deformed shape
            wireGeo.copy(new THREE.EdgesGeometry(geo));
            wireMesh.geometry = wireGeo;

            // Mark attributes as needing update
            positions.needsUpdate = true;
            geo.computeVertexNormals();

            // Play deform sound if available
            if (window.app.soundManager) {
                window.app.soundManager.play('deform', false);
            }
        }

        // Function to gradually reset deformation
        function resetDeformation(speed) {
            if (!window.app.ballGroup || !window.app.ballGroup.userData || !window.app.ballGroup.userData.geo) {
                return;
            }

            const geo = window.app.ballGroup.userData.geo;
            const wireGeo = window.app.ballGroup.userData.wireGeo;
            const wireMesh = window.app.ballGroup.userData.wireMesh;
            const originalPositions = window.app.ballGroup.userData.originalPositions;

            if (!geo || !originalPositions) return;

            const positions = geo.attributes.position;
            let needsUpdate = false;

            for (let i = 0; i < positions.count; i++) {
                const currentX = positions.array[i * 3];
                const currentY = positions.array[i * 3 + 1];
                const currentZ = positions.array[i * 3 + 2];

                const originalX = originalPositions[i * 3];
                const originalY = originalPositions[i * 3 + 1];
                const originalZ = originalPositions[i * 3 + 2];

                // Move vertices gradually back to their original positions
                positions.array[i * 3] = currentX + (originalX - currentX) * speed;
                positions.array[i * 3 + 1] = currentY + (originalY - currentY) * speed;
                positions.array[i * 3 + 2] = currentZ + (originalZ - currentZ) * speed;

                // Check if there's still significant deformation
                if (Math.abs(positions.array[i * 3] - originalX) > 0.001 ||
                    Math.abs(positions.array[i * 3 + 1] - originalY) > 0.001 ||
                    Math.abs(positions.array[i * 3 + 2] - originalZ) > 0.001) {
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                // Update wireframe to match the deformed shape
                wireGeo.copy(new THREE.EdgesGeometry(geo));
                wireMesh.geometry = wireGeo;

                positions.needsUpdate = true;
                geo.computeVertexNormals();
            }
        }

        // Function to toggle rainbow mode
        function toggleRainbowMode() {
            effectState.isRainbowMode = !effectState.isRainbowMode;

            if (effectState.isRainbowMode) {
                // Start with a rainbow gradient
                updateGradientColors('#FF0000', '#00FF00', '#0000FF');

                // Play rainbow sound if it exists
                if (window.app.soundManager) {
                    window.app.soundManager.play('rainbow', true);
                }

                // Set up a fancy modulation effect
                if (window.app.audioContext && window.app.oscillator) {
                    window.app.oscillator.type = 'triangle';
                    window.app.oscillator.frequency.value = 440; // A4 note
                    window.app.gainNode.gain.value = 0.1;

                    // Create a low frequency oscillator for frequency modulation
                    if (!window.app.rainbowLFO) {
                        const lfo = window.app.audioContext.createOscillator();
                        lfo.type = 'sine';
                        lfo.frequency.value = 0.5; // 0.5 Hz modulation

                        const lfoGain = window.app.audioContext.createGain();
                        lfoGain.gain.value = 100; // Modulation depth

                        lfo.connect(lfoGain);
                        lfoGain.connect(window.app.oscillator.frequency);

                        lfo.start();

                        // Store for later cleanup
                        window.app.rainbowLFO = lfo;
                    }
                }
            } else {
                // Reset to original colors
                updateGradientColors(colorStart, colorMid, colorEnd);

                // Stop rainbow sound
                if (window.app.soundManager) {
                    window.app.soundManager.stop('rainbow');
                }

                // Clean up modulation
                if (window.app.audioContext && window.app.rainbowLFO) {
                    window.app.rainbowLFO.stop();
                    window.app.rainbowLFO.disconnect();
                    delete window.app.rainbowLFO;
                }

                // Reset oscillator
                if (window.app.oscillator) {
                    window.app.oscillator.type = 'sine';
                    window.app.gainNode.gain.value = 0;
                }
            }

            if (window.showStatus) {
                window.showStatus(`Rainbow Mode ${effectState.isRainbowMode ? 'Enabled' : 'Disabled'}`);
            }

            return effectState.isRainbowMode;
        }

        // Update rainbow colors with cycling hue
        function updateRainbowColors() {
            if (!effectState.isRainbowMode) return;

            const time = Date.now() * 0.001;

            // Cycle the hue for each color stop, offset by phase
            const hue1 = (time * 0.1) % 1;
            const hue2 = ((time * 0.1) + 0.33) % 1;
            const hue3 = ((time * 0.1) + 0.66) % 1;

            // Convert HSL to hex color
            const color1 = new THREE.Color().setHSL(hue1, 1, 0.5);
            const color2 = new THREE.Color().setHSL(hue2, 1, 0.5);
            const color3 = new THREE.Color().setHSL(hue3, 1, 0.5);

            // Convert THREE.Color to hex string
            const hex1 = '#' + color1.getHexString();
            const hex2 = '#' + color2.getHexString();
            const hex3 = '#' + color3.getHexString();

            // Update the gradient
            updateGradientColors(hex1, hex2, hex3);

            // Also update wireframe color if it exists
            if (window.app.ballGroup && window.app.ballGroup.userData && window.app.ballGroup.userData.wireMat) {
                window.app.ballGroup.userData.wireMat.color.copy(color1);
            }

            // If we have an analyzer, use it to make audio reactive visuals
            if (window.app.analyser && effectState.isRainbowMode) {
                // Get frequency data
                const bufferLength = window.app.analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                window.app.analyser.getByteFrequencyData(dataArray);

                // Calculate average frequency 
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                // Use to modulate color saturation or brightness
                const normalizedValue = average / 255;

                // Add a bit of audio reactivity to the material
                if (window.app.ballGroup && window.app.ballGroup.userData && window.app.ballGroup.userData.mat) {
                    window.app.ballGroup.userData.mat.emissiveIntensity = normalizedValue * 2;
                }
            }
        }

        // Toggle magnetic mode
        function toggleMagneticMode() {
            effectState.isMagneticMode = !effectState.isMagneticMode;

            if (effectState.isMagneticMode) {
                // Turn on magnetic effect
                updateGradientColors('#0066FF', '#3399FF', '#99CCFF'); // Blue colors
                if (window.app.ballGroup && window.app.ballGroup.userData && window.app.ballGroup.userData.wireMat) {
                    window.app.ballGroup.userData.wireMat.color.set(0x0066FF); // Blue wireframe
                }

                // Create a trail of small spheres that follow the ball
                createMagneticTrail();

                // Play magnetic sound if it exists
                if (window.app.soundManager) {
                    window.app.soundManager.play('magnetic', true);
                }
            } else {
                // Turn off magnetic effect
                updateGradientColors(colorStart, colorMid, colorEnd);
                if (window.app.ballGroup && window.app.ballGroup.userData && window.app.ballGroup.userData.wireMat) {
                    window.app.ballGroup.userData.wireMat.color.set(0x00FFFF);
                }

                // Remove trail
                removeMagneticTrail();

                // Stop magnetic sound
                if (window.app.soundManager) {
                    window.app.soundManager.stop('magnetic');
                }
            }

            if (window.showStatus) {
                window.showStatus(`Magnetic Mode ${effectState.isMagneticMode ? 'Enabled' : 'Disabled'}`);
            }

            return effectState.isMagneticMode;
        }

        // Create floating particles that follow the ball in magnetic mode
        function createMagneticTrail() {
            // Clean up any existing particles
            removeMagneticTrail();

            // Create a batch of particles
            for (let i = 0; i < 50; i++) {
                const size = Math.random() * 0.05 + 0.02;
                const color = new THREE.Color(0x0066FF);

                // Adjust color based on size (smaller = lighter)
                color.r += (1 - size / 0.07) * 0.8;
                color.g += (1 - size / 0.07) * 0.8;
                color.b += (1 - size / 0.07) * 0.1;

                const particle = new THREE.Mesh(
                    new THREE.SphereGeometry(size, 8, 8),
                    new THREE.MeshBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: 0.7,
                        blending: THREE.AdditiveBlending
                    })
                );

                // Random position around the ball
                const radius = Math.random() * 2 + 1.5;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                particle.position.set(
                    radius * Math.sin(phi) * Math.cos(theta),
                    radius * Math.sin(phi) * Math.sin(theta),
                    radius * Math.cos(phi)
                );

                particle.userData = {
                    offset: new THREE.Vector3(
                        Math.sin(i * 0.5) * 1.5,
                        Math.cos(i * 0.5) * 1.5,
                        Math.sin(i * 0.3) * 1.5
                    ),
                    phase: Math.random() * Math.PI * 2,
                    speed: Math.random() * 0.02 + 0.01
                };

                window.app.scene.add(particle);
                effectState.magneticParticles.push(particle);
            }
        }

        // Remove magnetic particles
        function removeMagneticTrail() {
            for (const particle of effectState.magneticParticles) {
                window.app.scene.remove(particle);
            }
            effectState.magneticParticles = [];
        }

        // Update magnetic particles
        function updateMagneticParticles() {
            if (!effectState.isMagneticMode || effectState.magneticParticles.length === 0) return;

            const time = Date.now() * 0.001;

            for (const particle of effectState.magneticParticles) {
                // Calculate a position that follows the ball with some delay and orbit
                const targetX = window.app.ballGroup.position.x;
                const targetY = window.app.ballGroup.position.y;
                const targetZ = window.app.ballGroup.position.z;

                // Add orbital motion
                const phase = particle.userData.phase + time * particle.userData.speed;
                const orbitRadius = 0.5 + Math.sin(phase) * 0.3;

                const orbitX = Math.cos(phase) * orbitRadius + particle.userData.offset.x * 0.2;
                const orbitY = Math.sin(phase) * orbitRadius + particle.userData.offset.y * 0.2;
                const orbitZ = Math.cos(phase * 0.7) * orbitRadius + particle.userData.offset.z * 0.2;

                // Smoothly move toward target
                particle.position.x += (targetX + orbitX - particle.position.x) * 0.03;
                particle.position.y += (targetY + orbitY - particle.position.y) * 0.03;
                particle.position.z += (targetZ + orbitZ - particle.position.z) * 0.03;

                // Pulsate size
                const scale = 0.8 + Math.sin(time * 2 + particle.userData.phase) * 0.2;
                particle.scale.set(scale, scale, scale);

                // Pulsate opacity
                particle.material.opacity = 0.5 + Math.sin(time + particle.userData.phase) * 0.3;
            }
        }

        // Create blackhole effect
        function createBlackholeEffect() {
            // Make sure we don't have an existing effect
            if (effectState.blackholeEffect) {
                window.app.scene.remove(effectState.blackholeEffect);
                effectState.blackholeEffect = null;
            }

            // Create a dark sphere with a distortion shader
            const blackholeMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.8
            });

            effectState.blackholeEffect = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 32, 32),
                blackholeMaterial
            );

            // Position it slightly offset from the ball
            effectState.blackholeEffect.position.set(
                window.app.ballGroup.position.x + 1,
                window.app.ballGroup.position.y,
                window.app.ballGroup.position.z
            );

            window.app.scene.add(effectState.blackholeEffect);

            // Start gravitational pull
            effectState.gravitationalPull = 1.0;

            // Create ring particles around the blackhole
            createBlackholeRing();

            // Play blackhole sound if it exists
            if (window.app.soundManager) {
                window.app.soundManager.play('blackhole', true);
            }

            // Automatically remove after a few seconds
            setTimeout(() => {
                removeBlackholeEffect();
            }, 5000);

            if (window.showStatus) {
                window.showStatus('Blackhole Effect Activated');
            }
        }

        // Create particles forming a ring around the blackhole
        function createBlackholeRing() {
            // Clean up any existing particles
            for (const particle of effectState.blackholeRingParticles) {
                if (particle.parent) {
                    particle.parent.remove(particle);
                }
            }
            effectState.blackholeRingParticles = [];

            if (!effectState.blackholeEffect) return;

            // Create ring of particles
            const ringCount = 100;
            for (let i = 0; i < ringCount; i++) {
                const angle = (i / ringCount) * Math.PI * 2;

                // Create a small stretched cube for the ring particles
                const particle = new THREE.Mesh(
                    new THREE.BoxGeometry(0.05, 0.02, 0.02),
                    new THREE.MeshBasicMaterial({
                        color: 0xFF00FF,
                        transparent: true,
                        opacity: 0.8,
                        blending: THREE.AdditiveBlending
                    })
                );

                // Position in a ring
                const ringRadius = 0.6;
                particle.position.set(
                    Math.cos(angle) * ringRadius,
                    Math.sin(angle) * ringRadius,
                    0
                );

                // Store the initial angle for animation
                particle.userData = {
                    initialAngle: angle,
                    radius: ringRadius,
                    speed: 0.02 + Math.random() * 0.02
                };

                // Rotate to face tangent to the ring
                particle.lookAt(new THREE.Vector3(0, 0, 0));
                particle.rotateZ(Math.PI / 2);

                effectState.blackholeEffect.add(particle);
                effectState.blackholeRingParticles.push(particle);
            }
        }

        // Remove blackhole effect
        function removeBlackholeEffect() {
            if (effectState.blackholeEffect) {
                window.app.scene.remove(effectState.blackholeEffect);
                effectState.blackholeEffect = null;
            }

            // Remove ring particles
            effectState.blackholeRingParticles = [];

            // Reset gravitational pull
            effectState.gravitationalPull = 0;

            // Stop blackhole sound if it exists
            if (window.app.soundManager) {
                window.app.soundManager.stop('blackhole');
            }

            // Reset deformation
            if (window.app.ballGroup && window.app.ballGroup.userData) {
                resetDeformation(0.5);
            }

            if (window.showStatus) {
                window.showStatus('Blackhole Effect Completed');
            }
        }

        // Update blackhole effect
        function updateBlackholeEffect() {
            if (!effectState.blackholeEffect) return;

            const time = Date.now() * 0.001;

            // Animate the blackhole
            effectState.blackholeEffect.rotation.y += 0.02;
            effectState.blackholeEffect.rotation.z += 0.01;

            // Calculate pull effect on the ball
            if (effectState.gravitationalPull > 0 && window.app.ballGroup) {
                // Direction from ball to blackhole
                const pullDirection = new THREE.Vector3()
                    .subVectors(effectState.blackholeEffect.position, window.app.ballGroup.position)
                    .normalize();

                // Move ball slightly towards blackhole
                window.app.ballGroup.position.add(
                    pullDirection.clone().multiplyScalar(0.005 * effectState.gravitationalPull)
                );

                // Apply deformation to the ball (stretched towards blackhole)
                applyGravitationalDeformation(effectState.blackholeEffect.position, effectState.gravitationalPull);

                // Gradually increase pull
                effectState.gravitationalPull += 0.01;
            }

            // Animate ring particles
            for (const particle of effectState.blackholeRingParticles) {
                const speed = particle.userData.speed;
                const newAngle = particle.userData.initialAngle + time * speed;

                // Vary the radius for more dynamic effect
                const radius = particle.userData.radius * (0.9 + Math.sin(newAngle * 3) * 0.1);

                // Update position
                particle.position.x = Math.cos(newAngle) * radius;
                particle.position.y = Math.sin(newAngle) * radius;

                // Look at the center
                particle.lookAt(new THREE.Vector3(0, 0, 0));
                particle.rotateZ(Math.PI / 2);

                // Pulse opacity
                particle.material.opacity = 0.5 + Math.cos(newAngle * 5) * 0.5;
            }
        }

        // Apply gravitational deformation to the ball
        function applyGravitationalDeformation(attractorPosition, strength) {
            if (!window.app.ballGroup || !window.app.ballGroup.userData || !window.app.ballGroup.userData.geo) {
                return;
            }

            const ball = window.app.ballGroup;
            const geo = ball.userData.geo;
            const wireGeo = ball.userData.wireGeo;
            const wireMesh = ball.userData.wireMesh;
            const mesh = ball.userData.mesh;
            const originalPositions = ball.userData.originalPositions;

            if (!geo || !originalPositions) return;

            const positions = geo.attributes.position;

            // Vector from blackhole to ball center (for distortion direction)
            const distortionDir = new THREE.Vector3()
                .subVectors(ball.position, attractorPosition)
                .normalize();

            // Apply deformation to each vertex
            for (let i = 0; i < positions.count; i++) {
                const vertexPosition = new THREE.Vector3(
                    positions.array[i * 3],
                    positions.array[i * 3 + 1],
                    positions.array[i * 3 + 2]
                );

                // Calculate world position of the vertex
                const worldPosition = vertexPosition.clone()
                    .applyMatrix4(mesh.matrixWorld);

                // Vector from vertex to blackhole
                const toBlackhole = new THREE.Vector3()
                    .subVectors(attractorPosition, worldPosition);

                const distance = toBlackhole.length();

                // Only affect vertices within reasonable distance
                if (distance < 3) {
                    const strength = (1 / (distance * distance)) * effectState.gravitationalPull * 0.1;

                    // Get direction to blackhole
                    toBlackhole.normalize();

                    // Apply pull effect
                    const pull = toBlackhole.multiplyScalar(strength);

                    // Convert to local space
                    const localPull = pull.clone()
                        .applyMatrix4(mesh.matrixWorld.clone().invert());

                    // Get original position (pre-deformation)
                    const originalX = originalPositions[i * 3];
                    const originalY = originalPositions[i * 3 + 1];
                    const originalZ = originalPositions[i * 3 + 2];

                    // Apply deformation
                    positions.array[i * 3] = originalX + localPull.x;
                    positions.array[i * 3 + 1] = originalY + localPull.y;
                    positions.array[i * 3 + 2] = originalZ + localPull.z;
                }
            }

            // Update wireframe
            wireGeo.copy(new THREE.EdgesGeometry(geo));
            wireMesh.geometry = wireGeo;

            // Mark attributes as needing update
            positions.needsUpdate = true;
            geo.computeVertexNormals();
        }

        // Create spiky effect on the ball
        function applySpikyEffect(intensity) {
            if (!window.app.ballGroup || !window.app.ballGroup.userData || !window.app.ballGroup.userData.geo) {
                return;
            }

            const geo = window.app.ballGroup.userData.geo;
            const wireGeo = window.app.ballGroup.userData.wireGeo;
            const wireMesh = window.app.ballGroup.userData.wireMesh;
            const originalPositions = window.app.ballGroup.userData.originalPositions;

            if (!geo || !originalPositions) return;

            const positions = geo.attributes.position;

            // If we haven't stored spikes yet, create them
            if (effectState.spikes.length === 0) {
                for (let i = 0; i < positions.count; i++) {
                    const x = originalPositions[i * 3];
                    const y = originalPositions[i * 3 + 1];
                    const z = originalPositions[i * 3 + 2];

                    const vertex = new THREE.Vector3(x, y, z).normalize();
                    effectState.spikes.push({
                        index: i,
                        direction: vertex,
                        phase: Math.random() * Math.PI * 2 // Random phase for animation
                    });
                }
            }

            // Play spike sound if it exists
            if (window.app.soundManager) {
                window.app.soundManager.play('spike', false);
            }

            // Apply spiky effect
            for (const spike of effectState.spikes) {
                const i = spike.index;
                const time = Date.now() * 0.002;

                // Calculate spike extension with some wobble
                const wobble = Math.sin(time + spike.phase) * 0.1;
                const extension = (1.0 + wobble) * intensity;

                // Apply to vertex
                positions.array[i * 3] = originalPositions[i * 3] + spike.direction.x * extension;
                positions.array[i * 3 + 1] = originalPositions[i * 3 + 1] + spike.direction.y * extension;
                positions.array[i * 3 + 2] = originalPositions[i * 3 + 2] + spike.direction.z * extension;
            }

            // Update wireframe to match
            wireGeo.copy(new THREE.EdgesGeometry(geo));
            wireMesh.geometry = wireGeo;

            // Mark as needing update
            positions.needsUpdate = true;
            geo.computeVertexNormals();

            // Store current spikiness level
            effectState.spikiness = intensity;
        }

        // Toggle spiky mode
        function toggleSpikyMode() {
            if (effectState.spikiness > 0) {
                // Turn off spiky mode
                effectState.spikiness = 0;
                resetDeformation(0.5);
            } else {
                // Turn on spiky mode
                effectState.spikiness = 0.5;
                applySpikyEffect(effectState.spikiness);
            }

            if (window.showStatus) {
                window.showStatus(`Spiky Mode ${effectState.spikiness > 0 ? 'Enabled' : 'Disabled'}`);
            }

            return effectState.spikiness > 0;
        }

        // Function to handle explosion effect
        function explodeEffect() {
            if (effectState.isExploded) return;

            effectState.isExploded = true;

            // Play explosion sound if available
            if (window.app.soundManager) {
                window.app.soundManager.play('explosion', false);
            }

            // Create an array to hold explosion particles
            const particleCount = 100;

            // Create a particle system for the explosion
            const particleGeometry = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);
            const particleVelocities = [];

            // Get reference to the ball geometry
            const geo = window.app.ballGroup.userData.geo;
            if (!geo) return;

            const positions = geo.attributes.position;

            for (let i = 0; i < particleCount; i++) {
                // Sample a random vertex from the geometry
                const vertexIndex = Math.floor(Math.random() * positions.count);
                const radius = 1;

                // Position at surface of sphere
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                const x = radius * Math.sin(phi) * Math.cos(theta);
                const y = radius * Math.sin(phi) * Math.sin(theta);
                const z = radius * Math.cos(phi);

                particlePositions[i * 3] = x;
                particlePositions[i * 3 + 1] = y;
                particlePositions[i * 3 + 2] = z;

                // Create random velocities pointing outward
                const velocity = new THREE.Vector3(x, y, z).normalize();
                velocity.multiplyScalar(0.05 + Math.random() * 0.05);

                particleVelocities.push(velocity);
            }

            // Set the vertex positions
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

            // Create a material for the particles
            const particleMaterial = new THREE.PointsMaterial({
                color: 0xFFFFFF,
                size: 0.05,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.8,
                vertexColors: false
            });

            // Create the particle system
            effectState.particleSystem = new THREE.Points(particleGeometry, particleMaterial);

            // Position it to match the ball
            effectState.particleSystem.position.copy(window.app.ballGroup.position);
            effectState.particleSystem.userData = {
                velocities: particleVelocities,
                startTime: Date.now()
            };

            window.app.scene.add(effectState.particleSystem);

            // Hide the original ball
            window.app.ballGroup.visible = false;

            // Update colors for hot effect
            updateGradientColors('#FF5500', '#FF0000', '#FFFF00');

            // Automatically reset after a delay
            setTimeout(() => {
                resetExplosion();
            }, 3000);

            if (window.showStatus) {
                window.showStatus('Explosion Effect!');
            }
        }

        // Function to reset after explosion
        function resetExplosion() {
            effectState.isExploded = false;

            // Remove particle system
            if (effectState.particleSystem) {
                window.app.scene.remove(effectState.particleSystem);
                effectState.particleSystem = null;
            }

            // Show the ball again
            window.app.ballGroup.visible = true;

            // Reset colors
            updateGradientColors(colorStart, colorMid, colorEnd);

            if (window.showStatus) {
                window.showStatus('Explosion Reset');
            }
        }

        // Update explosion particles
        function updateParticles() {
            if (!effectState.particleSystem) return;

            const positions = effectState.particleSystem.geometry.attributes.position;
            const velocities = effectState.particleSystem.userData.velocities;
            const elapsed = (Date.now() - effectState.particleSystem.userData.startTime) / 1000;

            // Apply gravity and move particles
            for (let i = 0; i < positions.count; i++) {
                positions.array[i * 3] += velocities[i].x;
                positions.array[i * 3 + 1] += velocities[i].y - 0.01; // Add gravity
                positions.array[i * 3 + 2] += velocities[i].z;

                // Slow down over time
                velocities[i].multiplyScalar(0.99);
            }

            // Fade out the particles over time
            const life = 3.0; // 3 seconds
            const normalizedTime = Math.min(elapsed / life, 1.0);
            effectState.particleSystem.material.opacity = 1.0 - normalizedTime;

            positions.needsUpdate = true;
        }

        // Create audio visualization around the ball
        function createAudioVisualization() {
            if (!window.app.audioContext || effectState.audioVisualization) return;

            // Create a circle of small cubes around the ball
            const visualizationGroup = new THREE.Group();
            const cubeCount = 32;
            const radius = 2;

            for (let i = 0; i < cubeCount; i++) {
                const angle = (i / cubeCount) * Math.PI * 2;

                const cube = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1),
                    new THREE.MeshBasicMaterial({
                        color: 0xFFFFFF,
                        transparent: true,
                        opacity: 0.8
                    })
                );

                cube.position.set(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    0
                );

                visualizationGroup.add(cube);
            }

            window.app.scene.add(visualizationGroup);

            // Store it for updates
            effectState.audioVisualization = visualizationGroup;

            // Make invisible by default (will be toggled by visualization toggle)
            visualizationGroup.visible = false;
        }

        // Update audio visualization
        function updateAudioVisualization() {
            if (!effectState.audioVisualization || !window.app.analyser) return;

            // Make sure visualization matches the toggle state
            const visualizationEnabled = document.getElementById('toggle-visualization')?.checked || false;
            effectState.audioVisualization.visible = visualizationEnabled;

            if (!visualizationEnabled) return;

            // Get frequency data
            const analyser = window.app.analyser;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            // Update visualization cubes
            const cubes = effectState.audioVisualization.children;

            for (let i = 0; i < cubes.length; i++) {
                const cube = cubes[i];

                // Map frequency bin to cube
                const frequencyBin = Math.floor((i / cubes.length) * bufferLength);
                const value = dataArray[frequencyBin] / 255; // Normalize to 0-1

                // Scale cube based on frequency value
                cube.scale.y = 0.1 + value * 2;

                // Position the cube
                cube.position.y = Math.sin((i / cubes.length) * Math.PI * 2) * 2 + (value * 0.5);

                // Color based on frequency
                cube.material.color.setHSL(i / cubes.length, 0.8, 0.5 + value * 0.5);
            }
        }

        // Function to handle mouse wheel scroll for spikiness
        function onMouseWheel(event) {
            // Only affect the ball if we're hovering over it
            if (effectState.isHovered) {
                // Prevent default scroll behavior
                event.preventDefault();

                // Determine scroll direction
                const delta = Math.sign(event.deltaY);

                // Adjust spikiness
                effectState.spikiness += delta * 0.05;

                // Clamp to a reasonable range
                effectState.spikiness = Math.max(0, Math.min(2, effectState.spikiness));

                // Apply spiky deformation
                if (effectState.spikiness > 0) {
                    applySpikyEffect(effectState.spikiness);
                } else {
                    // If spikiness is 0, reset to original shape
                    resetDeformation(0.5);
                }
            }
        }

        // Function to handle pointer (mouse/touch) movement
        function onPointerMove(event) {
            if (!window.app.camera || !window.app.raycaster) return;

            // Calculate mouse position in normalized device coordinates (-1 to +1)
            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Update the raycaster with the new mouse position
            window.app.raycaster.setFromCamera(mouse, window.app.camera);

            // Move any point light to follow the mouse if it exists
            if (window.app.pointLight) {
                window.app.pointLight.position.copy(window.app.raycaster.ray.direction)
                    .multiplyScalar(2).add(window.app.camera.position);
            }

            // Calculate objects intersecting the ray
            const mesh = window.app.ballGroup?.userData?.mesh;
            if (!mesh) return;

            const intersects = window.app.raycaster.intersectObject(mesh);

            // Change appearance when hovered or touched
            if (intersects.length > 0) {
                if (!effectState.isHovered) {
                    document.body.style.cursor = 'pointer';

                    // Change wireframe color smoothly
                    if (window.app.ballGroup.userData.wireMat) {
                        gsapFade(window.app.ballGroup.userData.wireMat.color, { r: 1, g: 0, b: 1 }, 0.3);
                    }

                    // Smoothly change gradient colors
                    updateGradientColors('#FF77FF', '#AA55FF', '#55FFFF');

                    // Play hover sound
                    if (window.app.soundManager) {
                        window.app.soundManager.play('hover', false);
                    }

                    effectState.isHovered = true;
                }

                // Store the intersection point for deformation
                effectState.touchPoint = intersects[0].point.clone();

                // Apply deformation when hovering
                applyDeformation(effectState.touchPoint, 0.2, 0.3);

                // Play tone based on mouse position if synthesizer is available
                if (window.app.audioContext && window.app.oscillator && window.app.gainNode) {
                    // Map x position to frequency
                    const frequency = 220 + ((mouse.x + 1) / 2) * 660; // 220Hz - 880Hz
                    window.app.oscillator.frequency.value = frequency;

                    // Map y position to volume
                    const volume = ((mouse.y + 1) / 2) * 0.2; // 0 - 0.2
                    window.app.gainNode.gain.value = volume;
                }
            } else {
                if (effectState.isHovered) {
                    document.body.style.cursor = 'default';

                    // Reset wireframe color smoothly
                    if (window.app.ballGroup.userData.wireMat) {
                        gsapFade(window.app.ballGroup.userData.wireMat.color, { r: 0, g: 1, b: 1 }, 0.3);
                    }

                    // Reset gradient colors
                    updateGradientColors(colorStart, colorMid, colorEnd);

                    effectState.isHovered = false;
                }

                effectState.touchPoint = null;

                // Gradually restore the original shape
                resetDeformation(0.1);

                // Stop the tone
                if (window.app.audioContext && window.app.gainNode) {
                    window.app.gainNode.gain.value = 0;
                }
            }

            // Handle dragging
            if (effectState.isDragging) {
                const previousMousePosition = effectState.previousMousePosition || { x: event.clientX, y: event.clientY };

                const deltaMove = {
                    x: event.clientX - previousMousePosition.x,
                    y: event.clientY - previousMousePosition.y
                };

                // Rotate the ball based on mouse movement
                if (window.app.ballGroup) {
                    window.app.ballGroup.rotation.y += deltaMove.x * 0.01;
                    window.app.ballGroup.rotation.x += deltaMove.y * 0.01;
                }

                effectState.previousMousePosition = {
                    x: event.clientX,
                    y: event.clientY
                };
            }
        }

        // Function to handle pointer (mouse/touch) down
        function onPointerDown(event) {
            // Make sure audio is initialized on first user interaction
            ensureAudioInitialized();

            effectState.isDragging = true;

            effectState.previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };

            // Check if we're clicking on the ball
            if (!window.app.raycaster || !window.app.camera) return;

            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            window.app.raycaster.setFromCamera(mouse, window.app.camera);

            const mesh = window.app.ballGroup?.userData?.mesh;
            if (!mesh) return;

            const intersects = window.app.raycaster.intersectObject(mesh);

            if (intersects.length > 0) {
                // Play click sound
                if (window.app.soundManager) {
                    window.app.soundManager.play('click', false);
                }

                // Handle right click differently
                if (event.button === 2 || (event.touches && event.touches.length > 1)) {
                    // Explode effect on right click
                    explodeEffect();
                    // Change to hot colors
                    updateGradientColors('#FF5500', '#FF0000', '#FFFF00');
                    effectState.targetScale = 1.3;
                } else {
                    // Regular left click
                    // Set target scale for smooth animation
                    effectState.targetScale = 1.1;

                    // Change color more dramatically on click
                    updateGradientColors('#FFAAFF', '#CC66FF', '#66FFFF');
                }
            }
        }

        // Function to handle pointer (mouse/touch) up
        function onPointerUp() {
            effectState.isDragging = false;

            // Reset target scale for smooth animation
            effectState.targetScale = 1.0;

            // Reset colors if not hovering
            if (!effectState.isHovered) {
                updateGradientColors(colorStart, colorMid, colorEnd);
            }

            // Stop the tone
            if (window.app.audioContext && window.app.gainNode) {
                window.app.gainNode.gain.value = 0;
            }
        }

        // Double click to toggle rainbow mode
        function onDoubleClick() {
            toggleRainbowMode();
        }

        // Animation function to update mesh scale
        function updateMeshScale() {
            if (!window.app.ballGroup) return;

            // Smoothly transition to target scale
            effectState.currentScale += (effectState.targetScale - effectState.currentScale) * 0.1;

            // Only apply automated scale changes if not being interacted with
            if (!effectState.isDragging && !effectState.isHovered) {
                // Enhanced breathing animation with multiple sine waves for organic movement
                const time = Date.now() * 0.001;
                const primaryBreath = Math.sin(time * 0.5) * 0.1 + 1; // Slower, deeper breath
                const secondaryBreath = Math.sin(time * 1.3) * 0.03; // Faster, smaller modulation

                const breathingScale = primaryBreath + secondaryBreath;

                window.app.ballGroup.scale.set(
                    breathingScale * effectState.currentScale,
                    breathingScale * effectState.currentScale * 0.95 + 0.05, // Slightly less Y-scale for asymmetric breathing 
                    breathingScale * effectState.currentScale
                );
            } else {
                // Just apply the target scale
                window.app.ballGroup.scale.set(
                    effectState.currentScale,
                    effectState.currentScale,
                    effectState.currentScale
                );
            }
        }

        // Initialize audio context and analyzer if needed
        function ensureAudioInitialized() {
            if (!window.app.audioContext) {
                try {
                    window.app.audioContext = new (window.AudioContext || window.webkitAudioContext)();

                    // Create gain node (for volume control)
                    window.app.gainNode = window.app.audioContext.createGain();
                    window.app.gainNode.gain.value = 0; // Start silent
                    window.app.gainNode.connect(window.app.audioContext.destination);

                    // Create oscillator (for tone generation)
                    window.app.oscillator = window.app.audioContext.createOscillator();
                    window.app.oscillator.type = 'sine'; // Sine wave
                    window.app.oscillator.frequency.value = 440; // A4 note
                    window.app.oscillator.connect(window.app.gainNode);
                    window.app.oscillator.start();

                    console.log("Audio context initialized");
                } catch (e) {
                    console.error("Failed to create audio context:", e);
                    return false;
                }
            }

            if (!window.app.analyser && window.app.audioContext) {
                try {
                    // Create an analyzer node
                    window.app.analyser = window.app.audioContext.createAnalyser();
                    window.app.analyser.fftSize = 256;

                    // Connect the analyzer to the audio context
                    if (window.app.gainNode) {
                        window.app.gainNode.connect(window.app.analyser);
                    }

                    console.log("Audio analyzer initialized");
                    return true;
                } catch (e) {
                    console.error("Failed to create audio analyzer:", e);
                    return false;
                }
            }

            if (window.app.audioContext && !window.app.soundManager) {
                // Initialize sound manager if it doesn't exist
                initSoundManager();
            }

            return !!window.app.analyser;
        }

        // Initialize sound manager
        function initSoundManager() {
            // Initialize a basic sound manager if it doesn't exist
            if (!window.app.soundManager) {
                window.app.soundManager = {
                    sounds: {},

                    init: function () {
                        // Try to create common sounds
                        this.createSound('hover', 'assets/sounds/hover.mp3');
                        this.createSound('click', 'assets/sounds/click.mp3');
                        this.createSound('explosion', 'assets/sounds/explosion.mp3');
                        this.createSound('spike', 'assets/sounds/spike.mp3');
                        this.createSound('rainbow', 'assets/sounds/rainbow.mp3');
                        this.createSound('blackhole', 'assets/sounds/blackhole.mp3');
                        this.createSound('magnetic', 'assets/sounds/magnetic.mp3');
                        this.createSound('deform', 'assets/sounds/deform.mp3');
                    },

                    createSound: function (name, url) {
                        if (!window.app.audioContext) return;

                        const sound = new Audio();
                        sound.src = url;
                        sound.volume = 0.5;

                        this.sounds[name] = {
                            audio: sound,
                            isPlaying: false
                        };
                    },

                    play: function (name, loop = false) {
                        const sound = this.sounds[name];
                        if (sound && sound.audio) {
                            // Don't restart if it's already playing
                            if (!sound.isPlaying) {
                                sound.audio.loop = loop;
                                sound.audio.play().catch(e => console.log(`Failed to play sound ${name}:`, e));
                                sound.isPlaying = true;

                                // For non-looping sounds, reset isPlaying when done
                                if (!loop) {
                                    sound.audio.onended = () => {
                                        sound.isPlaying = false;
                                    };
                                }
                            }
                        }
                    },

                    stop: function (name) {
                        const sound = this.sounds[name];
                        if (sound && sound.audio && sound.isPlaying) {
                            sound.audio.pause();
                            sound.audio.currentTime = 0;
                            sound.isPlaying = false;
                        }
                    }
                };

                window.app.soundManager.init();
            }
        }

        // Create a main update function that will update all effects
        function updateEffects() {
            // Update rainbow colors if in rainbow mode
            updateRainbowColors();

            // Update magnetic particles
            updateMagneticParticles();

            // Update blackhole effect
            updateBlackholeEffect();

            // Update audio visualization
            updateAudioVisualization();

            // Update explosion particles
            updateParticles();

            // Update mesh scale
            updateMeshScale();

            // Request next frame update
            requestAnimationFrame(updateEffects);
        }

        // Add event listeners
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mouseup', onPointerUp);
        window.addEventListener('wheel', onMouseWheel);
        window.addEventListener('touchmove', (e) => onPointerMove(e.touches[0]));
        window.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]));
        window.addEventListener('touchend', onPointerUp);
        window.addEventListener('dblclick', onDoubleClick);
        window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent context menu on right click

        // Setup global API
        window.enhancedEffects = {
            toggleRainbowMode,
            toggleMagneticMode,
            createBlackholeEffect,
            toggleSpikyMode,
            applySpikyEffect,
            resetDeformation,
            explodeEffect
        };

        // Connect to existing UI controls where possible

        // Connect to toggle control for rainbow mode if it exists
        const toggleRainbowInput = document.getElementById('toggle-rainbow');
        if (toggleRainbowInput) {
            // Remove any existing event listeners by cloning
            const newToggle = toggleRainbowInput.cloneNode(true);
            toggleRainbowInput.parentNode.replaceChild(newToggle, toggleRainbowInput);

            // Add new event listener
            newToggle.addEventListener('change', () => {
                const enabled = toggleRainbowMode();
                newToggle.checked = enabled;
            });
        }

        // Connect to magnetic effect button if it exists
        const magneticEffectBtn = document.getElementById('magnetic-effect');
        if (magneticEffectBtn) {
            // Remove any existing event listeners by cloning
            const newButton = magneticEffectBtn.cloneNode(true);
            magneticEffectBtn.parentNode.replaceChild(newButton, magneticEffectBtn);

            // Add new event listener
            newButton.addEventListener('click', () => {
                const enabled = toggleMagneticMode();
                if (window.showStatus) {
                    window.showStatus(`Magnetic Effect ${enabled ? 'Enabled' : 'Disabled'}`);
                }
            });
        }

        // Connect to blackhole effect button if it exists
        const blackholeEffectBtn = document.getElementById('blackhole-effect');
        if (blackholeEffectBtn) {
            // Remove any existing event listeners by cloning
            const newButton = blackholeEffectBtn.cloneNode(true);
            blackholeEffectBtn.parentNode.replaceChild(newButton, blackholeEffectBtn);

            // Add new event listener
            newButton.addEventListener('click', () => {
                createBlackholeEffect();
            });
        }

        // Connect to spiky mode toggle if it exists
        const toggleSpikyInput = document.getElementById('toggle-spiky');
        if (toggleSpikyInput) {
            // Remove any existing event listeners by cloning
            const newToggle = toggleSpikyInput.cloneNode(true);
            toggleSpikyInput.parentNode.replaceChild(newToggle, toggleSpikyInput);

            // Add new event listener
            newToggle.addEventListener('change', () => {
                const enabled = toggleSpikyMode();
                newToggle.checked = enabled;
            });
        }

        // Connect to audio visualization toggle if it exists
        const toggleVisualizationInput = document.getElementById('toggle-visualization');
        if (toggleVisualizationInput) {
            // Make sure we have an audio visualization to show/hide
            if (!effectState.audioVisualization) {
                createAudioVisualization();
            }

            // Remove any existing event listeners by cloning
            const newToggle = toggleVisualizationInput.cloneNode(true);
            toggleVisualizationInput.parentNode.replaceChild(newToggle, toggleVisualizationInput);

            // Add new event listener
            newToggle.addEventListener('change', () => {
                if (effectState.audioVisualization) {
                    effectState.audioVisualization.visible = newToggle.checked;
                }
            });
        }

        // Connect to explosion effect button if it exists
        const explosionEffectBtn = document.getElementById('explosion-effect');
        if (explosionEffectBtn) {
            // Remove any existing event listeners by cloning
            const newButton = explosionEffectBtn.cloneNode(true);
            explosionEffectBtn.parentNode.replaceChild(newButton, explosionEffectBtn);

            // Add new event listener
            newButton.addEventListener('click', () => {
                explodeEffect();
            });
        }

        // Initialize audio on first user interaction
        document.addEventListener('click', function initOnFirstClick() {
            ensureAudioInitialized();
            // Create audio visualization after audio is initialized
            createAudioVisualization();
            // Remove the event listener
            document.removeEventListener('click', initOnFirstClick);
        }, { once: true });

        // Make sure original functions are replaced with enhanced versions
        if (window.createBlackholeEffect) {
            console.log("Replacing existing createBlackholeEffect with enhanced version");
            window.createBlackholeEffect = createBlackholeEffect;
        }

        if (window.appControls && window.appControls.createBlackholeEffect) {
            console.log("Replacing appControls.createBlackholeEffect with enhanced version");
            window.appControls.createBlackholeEffect = createBlackholeEffect;
        }

        // Start the effects update loop
        updateEffects();

        console.log("Enhanced effects initialized and attached to the ball");
    }, 500);
});