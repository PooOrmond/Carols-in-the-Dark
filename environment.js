// environment.js - Houses with NO COLLISION and NO FLOATING TEXT
class GameEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.textureLoader = new THREE.TextureLoader();
        this.clock = new THREE.Clock();
        this.stars = null;
        this.clouds = [];
        this.floatingTexts = [];
        this.houses = [];
        this.houseColliders = []; // Empty array - no collision
        this.doorPositions = [];
        this.collisionDebugHelpers = [];
        
        // House numbering
        this.houseCounter = 0;
        
        // Track completed and failed houses for window colors
        this.completedHouseNumbers = [];
        this.failedHouseNumbers = new Set();
        
        // Enhanced difficulty indicators (still used for window colors)
        this.difficultyMaterials = {
            1: { color: 0xFFAA33, name: "Easy", emissive: 0xFFAA33, rgbColor: "#FFAA33" },
            2: { color: 0xFFAA33, name: "Easy", emissive: 0xFFAA33, rgbColor: "#FFAA33" },
            3: { color: 0xFFAA33, name: "Easy", emissive: 0xFFAA33, rgbColor: "#FFAA33" },
            4: { color: 0xFF66AA, name: "Moderate", emissive: 0xFF66AA, rgbColor: "#FF66AA" },
            5: { color: 0x9966FF, name: "Hard", emissive: 0x9966FF, rgbColor: "#9966FF" },
            6: { color: 0x00FFFF, name: "Hard", emissive: 0x00FFFF, rgbColor: "#9966FF" }
        };
        
        // Performance settings
        this.houseDetailLevel = 'medium';
        this.particleCount = 0;
        this.exitGroup = null;
        this.exitLight = null;
        this.exitPlatform = null;
        this.exitParticles = null;
        
        // Moon references
        this.moonMaterial = null;
        this.moonGlow = null;
        this.moonGlowMaterial = null;
        this.moonDirectionalLight = null;
        
        // GLTF/GLB Loader
        this.gltfLoader = new THREE.GLTFLoader();
        
        // House model cache
        this.houseModel = null;
        this.houseReady = false;
        this.modelLoadingPromise = null;
        
        // Performance optimization
        this.maxParticles = 50;
        this.cloudCount = 5;
        this.starCount = 400;
        
        // House settings
        this.houseScaleMultiplier = 2.0;
        this.houseInteractionRange = 8;
        this.houseInteractionAngle = 60;
        
        // Spacing settings
        this.houseSpacing = 20;
        this.houseOffsetX = 12;
        this.houseStartZ = -15;
    }

    createSky() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a1a2a');
        gradient.addColorStop(0.5, '#1a2a3a');
        gradient.addColorStop(1, '#0a0a1a');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height * 0.7;
            const radius = Math.random() * 1.5;
            const alpha = 0.3 + Math.random() * 0.7;
            
            context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        
        const sky = new THREE.Mesh(
            new THREE.SphereGeometry(500, 16, 16),
            new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.BackSide,
                depthWrite: false
            })
        );
        sky.renderOrder = -100;
        this.scene.add(sky);
        
        return sky;
    }

    createStars() {
        const count = this.starCount;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const speeds = new Float32Array(count);
        const intensities = new Float32Array(count);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const r = 450 + Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions.set([
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            ], i * 3);

            sizes[i] = 0.5 + Math.random() * 1.5;
            speeds[i] = 0.1 + Math.random() * 0.3;
            intensities[i] = 0.3 + Math.random() * 0.5;
            
            const isBlueStar = Math.random() > 0.8;
            colors.set([
                isBlueStar ? 0.8 : 1.0,
                isBlueStar ? 0.9 : 1.0,
                isBlueStar ? 1.0 : 1.0
            ], i * 3);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
        geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } },
            vertexShader: `
                attribute float size;
                attribute float speed;
                attribute float intensity;
                attribute vec3 color;
                varying float vIntensity;
                varying float vSpeed;
                varying vec3 vColor;
                void main() {
                    vIntensity = intensity;
                    vSpeed = speed;
                    vColor = color;
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (200.0 / -mv.z);
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: `
                uniform float time;
                varying float vIntensity;
                varying float vSpeed;
                varying vec3 vColor;
                void main() {
                    float d = length(gl_PointCoord - 0.5);
                    if (d > 0.5) discard;
                    
                    float flicker = 0.7 + 0.2 * sin(time * vSpeed);
                    float alpha = flicker * vIntensity * (1.0 - d * 2.0);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.stars = new THREE.Points(geometry, material);
        this.stars.renderOrder = -90;
        this.scene.add(this.stars);
    }

    async createMoon() {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                'assets/model/moon.glb',
                (gltf) => {
                    const moonGroup = new THREE.Group();
                    const moonModel = gltf.scene;

                    // === SCALE & CENTER ===
                    const box = new THREE.Box3().setFromObject(moonModel);
                    const size = new THREE.Vector3();
                    const center = new THREE.Vector3();
                    box.getSize(size);
                    box.getCenter(center);

                    moonModel.position.sub(center);

                    const targetSize = 50; // visual moon size
                    const scale = targetSize / Math.max(size.x, size.y, size.z);
                    moonModel.scale.setScalar(scale);

                    // === MATERIAL TWEAKS ===
                    moonModel.traverse(child => {
                        if (child.isMesh) {
                            child.castShadow = false;
                            child.receiveShadow = false;

                            const originalMat = child.material;

                            child.material = new THREE.MeshStandardMaterial({
                                map: originalMat.map || null,
                                normalMap: originalMat.normalMap || null,
                                roughnessMap: originalMat.roughnessMap || null,
                                metalnessMap: originalMat.metalnessMap || null,

                                color: 0xffffff,
                                roughness: 0.9,
                                metalness: 0.0,

                                // 👇 subtle self-glow (this is the key)
                                emissive: new THREE.Color(0xffffff),
                                emissiveIntensity: 0.08
                            });

                            child.material.needsUpdate = true;
                            child.renderOrder = -50;
                        }
                    });

                    moonGroup.add(moonModel);

                    const glowMesh = moonModel.clone(true);
                    glowMesh.scale.multiplyScalar(1.05); // very slight
                    glowMesh.traverse(c => {
                        if (c.isMesh) {
                            c.material = new THREE.MeshBasicMaterial({
                                color: 0xffffff,
                                transparent: true,
                                opacity: 0.12,
                                depthWrite: false
                            });
                            c.renderOrder = -51;
                        }
                    });
                    moonGroup.add(glowMesh);

                    this.moonGroup = moonGroup;

                    // === MOON POSITION ===
                    moonGroup.position.set(-100, 120, -240);
                    this.scene.add(moonGroup);


                    // === MOON LIGHT (SHADOW CASTER) ===
                    const moonLight = new THREE.DirectionalLight(0xffffff, 0.8);
                    moonLight.position.copy(moonGroup.position);
                    moonLight.target.position.set(0, 0, -30);

                    moonLight.castShadow = true;
                    moonLight.shadow.mapSize.set(1024, 1024);
                    moonLight.shadow.camera.near = 10;
                    moonLight.shadow.camera.far = 250;
                    moonLight.shadow.camera.left = -80;
                    moonLight.shadow.camera.right = 80;
                    moonLight.shadow.camera.top = 80;
                    moonLight.shadow.camera.bottom = -80;

                    this.scene.add(moonLight);
                    this.scene.add(moonLight.target);

                    this.moonDirectionalLight = moonLight;

                    resolve(moonGroup);

                    const rimLight = new THREE.DirectionalLight(0xffffff, 0.15);
                    rimLight.position.set(
                        moonGroup.position.x + 50,
                        moonGroup.position.y + 20,
                        moonGroup.position.z + 50
                    );
                    this.scene.add(rimLight)
                },
                undefined,
                (error) => {
                    console.error('Failed to load moon.glb', error);
                    reject(error);
                }
            );
        });
    }

    createMilkyWay() {
        const geometry = new THREE.PlaneGeometry(600, 120);
        const material = new THREE.MeshBasicMaterial({
            color: 0x223366,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const milkyWay = new THREE.Mesh(geometry, material);
        milkyWay.rotation.x = Math.PI / 2.8;
        milkyWay.rotation.z = Math.PI / 6;
        milkyWay.position.set(0, 120, -200);
        milkyWay.renderOrder = -95;

        this.scene.add(milkyWay);
    }

    createClouds() {
        for (let i = 0; i < this.cloudCount; i++) {
            const group = new THREE.Group();
            group.renderOrder = -40; // clouds render in front of moon

            const pieces = 2 + Math.floor(Math.random() * 3);

            for (let j = 0; j < pieces; j++) {
                const mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(3 + Math.random() * 4, 8, 8),
                    new THREE.MeshStandardMaterial({
                        color: 0x2a2a44,
                        transparent: true,
                        opacity: 0.3 + Math.random() * 0.2,
                        roughness: 0.9
                    })
                );

                mesh.renderOrder = -40; // each cloud piece
                mesh.castShadow = false;
                mesh.receiveShadow = false;

                mesh.position.set(
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 8
                );

                group.add(mesh);
            }

            const angle = Math.random() * Math.PI * 2;
            const radius = 150 + Math.random() * 40;
            const height = 40 + Math.random() * 30;

            group.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );

            this.scene.add(group);

            this.clouds.push({ 
                group, 
                angle, 
                radius, 
                height, 
                speed: 0.00003 + Math.random() * 0.00005
            });
        }
    }

    createGround() {
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200, 16, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0x2a221a,
                roughness: 0.8,
                metalness: 0.05
            })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        if (this.houseDetailLevel !== 'low') {
            const snow = new THREE.Mesh(
                new THREE.PlaneGeometry(200, 200, 16, 16),
                new THREE.MeshStandardMaterial({ 
                    color: 0xdddddd, 
                    transparent: true, 
                    opacity: 0.08,
                    roughness: 0.9 
                })
            );
            snow.rotation.x = -Math.PI / 2;
            snow.position.y = 0.01;
            snow.receiveShadow = true;
            this.scene.add(snow);
            return { ground, snow };
        }
        
        return { ground };
    }

    createPath() {
        const path = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 120, 8, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0x3a322a,
                roughness: 0.85,
                metalness: 0.1
            })
        );
        path.rotation.x = -Math.PI / 2;
        path.position.set(0, 0.02, -30);
        path.receiveShadow = true;
        this.scene.add(path);

        if (this.houseDetailLevel !== 'low') {
            const pathSnow = new THREE.Mesh(
                new THREE.PlaneGeometry(14, 122, 10, 16),
                new THREE.MeshStandardMaterial({ 
                    color: 0xeeeeee, 
                    transparent: true, 
                    opacity: 0.03,
                    roughness: 0.8 
                })
            );
            pathSnow.rotation.x = -Math.PI / 2;
            pathSnow.position.set(0, 0.015, -30);
            pathSnow.receiveShadow = true;
            this.scene.add(pathSnow);
            return { path, pathSnow };
        }
        
        return { path };
    }

    createVictoryExit() {
        const exitGroup = new THREE.Group();
        
        const exitPlatform = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.5, 12),
            new THREE.MeshStandardMaterial({ 
                color: 0x00FF00,
                emissive: 0x00AA00,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.7,
                roughness: 0.3,
                metalness: 0.7
            })
        );
        exitPlatform.position.set(0, 0.25, -100);
        exitPlatform.rotation.x = Math.PI / 2;
        exitPlatform.castShadow = false;
        exitGroup.add(exitPlatform);
        
        const exitLight = new THREE.PointLight(0x00FF00, 1.0, 20);
        exitLight.position.set(0, 2, -100);
        exitGroup.add(exitLight);
        
        const signPost = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 4, 6),
            new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.8,
                metalness: 0.2
            })
        );
        signPost.position.set(0, 2, -100);
        exitGroup.add(signPost);
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.strokeStyle = '#00FF00';
        context.lineWidth = 4;
        context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        context.font = 'bold 36px Arial';
        context.fillStyle = '#FFFFFF';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('EXIT', canvas.width/2, canvas.height/2);
        
        const texture = new THREE.CanvasTexture(canvas);
        
        const signBoard = new THREE.Mesh(
            new THREE.BoxGeometry(4, 2, 0.1),
            new THREE.MeshStandardMaterial({ 
                map: texture,
                emissive: 0x002200,
                emissiveIntensity: 0.2,
                roughness: 0.5,
                metalness: 0.3
            })
        );
        signBoard.position.set(0, 4, -100);
        exitGroup.add(signBoard);
        
        this.scene.add(exitGroup);
        this.exitGroup = exitGroup;
        this.exitLight = exitLight;
        this.exitPlatform = exitPlatform;
        
        return exitGroup;
    }

    async loadHouseModel() {
        if (this.modelLoadingPromise) {
            return this.modelLoadingPromise;
        }
        
        this.modelLoadingPromise = new Promise((resolve, reject) => {
            console.log("Loading house model from assets/model/house.glb");
            
            this.gltfLoader.load(
                'assets/model/house.glb',
                (gltf) => {
                    console.log("House model loaded successfully");
                    this.houseModel = gltf.scene;
                    
                    this.optimizeModel(this.houseModel);
                    
                    const box = new THREE.Box3().setFromObject(this.houseModel);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    
                    console.log("Original model dimensions:", {
                        width: size.x,
                        height: size.y,
                        depth: size.z
                    });
                    
                    this.houseReady = true;
                    resolve(this.houseModel);
                },
                (xhr) => {
                    // Optional progress callback
                },
                (error) => {
                    console.error("Error loading house model:", error);
                    reject(error);
                }
            );
        });
        
        return this.modelLoadingPromise;
    }
    
    optimizeModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = this.houseDetailLevel !== 'low';
                child.receiveShadow = this.houseDetailLevel !== 'low';
                
                if (child.material) {
                    if (child.material.map) {
                        child.material.map.anisotropy = 1;
                    }
                    
                    if (this.houseDetailLevel === 'low') {
                        if (child.material.normalMap) child.material.normalMap = null;
                        if (child.material.aoMap) child.material.aoMap = null;
                        if (child.material.roughnessMap) child.material.roughnessMap = null;
                        if (child.material.metalnessMap) child.material.metalnessMap = null;
                        
                        if (child.material.type === 'MeshStandardMaterial') {
                            child.material.roughness = 0.8;
                            child.material.metalness = 0.2;
                        }
                    }
                    
                    if (child.material.name && child.material.name.toLowerCase().includes('window')) {
                        child.material.userData = { isWindow: true };
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                }
            }
        });
    }

    createHouse(x, z, rotationY = 0) {
        this.houseCounter++;
        const houseNumber = this.houseCounter;
        
        const difficulty = this.difficultyMaterials[houseNumber];
        
        const houseGroup = new THREE.Group();
        
        const targetWidth = 8;
        const targetHeight = 6;
        
        if (this.houseModel && this.houseReady) {
            const houseInstance = this.houseModel.clone();
            
            const box = new THREE.Box3().setFromObject(houseInstance);
            const size = new THREE.Vector3();
            box.getSize(size);
            
            const scaleX = targetWidth / size.x;
            const scaleY = targetHeight / size.y;
            const scaleZ = targetWidth / size.z;
            
            const avgScale = (scaleX + scaleY + scaleZ) / 3;
            const finalScale = avgScale * this.houseScaleMultiplier;
            
            houseInstance.scale.set(finalScale, finalScale, finalScale);
            
            box.setFromObject(houseInstance);
            box.getSize(size);
            
            console.log(`House ${houseNumber} visual size:`, {
                width: size.x.toFixed(2),
                height: size.y.toFixed(2),
                depth: size.z.toFixed(2)
            });
            
            houseGroup.add(houseInstance);
            houseGroup.userData.modelInstance = houseInstance;
            houseGroup.userData.scale = finalScale;
            houseGroup.userData.houseWidth = size.x;
            houseGroup.userData.houseDepth = size.z;
            
            const windowMeshes = [];
            houseInstance.traverse((child) => {
                if (child.isMesh && child.material.userData && child.material.userData.isWindow) {
                    windowMeshes.push(child);
                }
            });
            houseGroup.userData.windowMeshes = windowMeshes;
        } else {
            const placeholder = new THREE.Mesh(
                new THREE.BoxGeometry(targetWidth, targetHeight, targetWidth),
                new THREE.MeshStandardMaterial({ color: difficulty.color })
            );
            placeholder.castShadow = placeholder.receiveShadow = true;
            houseGroup.add(placeholder);
            houseGroup.userData.scale = 1.0;
            houseGroup.userData.houseWidth = targetWidth;
            houseGroup.userData.houseDepth = targetWidth;
            houseGroup.userData.windowMeshes = [];
        }
        
        const windowLights = this.createWindowLights(houseGroup, houseNumber, difficulty);
        houseGroup.userData.windowLights = windowLights;
        
        // ==============================================
        // REMOVED: House number plaque and difficulty indicator
        // No floating text frames above houses
        // ==============================================
        
        houseGroup.userData.difficulty = difficulty;
        houseGroup.userData.houseNumber = houseNumber;
        houseGroup.userData.isCompleted = false;
        houseGroup.userData.isFailed = false;
        houseGroup.userData.rotationY = rotationY;
        houseGroup.userData.position = new THREE.Vector3(x, 0, z);
        
        houseGroup.position.set(x, 0.1, z);
        houseGroup.rotation.y = rotationY;
        
        if (this.houseDetailLevel !== 'low' && Math.random() > 0.5) {
            houseGroup.rotation.z = (Math.random() - 0.5) * 0.02;
        }

        this.scene.add(houseGroup);
        this.houses.push(houseGroup);
        
        const scale = houseGroup.userData.scale;
        const doorWorldPos = new THREE.Vector3(x, 1.7, z);
        const doorForward = new THREE.Vector3(0, 0, -1);
        doorForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
        
        const doorOffset = new THREE.Vector3(0, 0, -(houseGroup.userData.houseDepth / 2));
        doorOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
        doorWorldPos.add(doorOffset);
        
        // DOOR DATA ONLY - NO COLLISION BOX
        const doorData = {
            position: doorWorldPos,
            forward: doorForward,
            house: houseGroup,
            rotationY: rotationY,
            houseNumber: houseNumber,
            index: this.doorPositions.length,
            housePosition: new THREE.Vector3(x, 0, z),
            houseWidth: houseGroup.userData.houseWidth,
            houseDepth: houseGroup.userData.houseDepth,
            frontArea: {
                width: houseGroup.userData.houseWidth * 1.2,
                depth: this.houseInteractionRange,
                offset: houseGroup.userData.houseDepth / 2
            }
        };
        
        this.doorPositions.push(doorData);
        
        houseGroup.userData.doorWorldPosition = doorWorldPos;
        houseGroup.userData.doorForward = doorForward;
        
        // ===== NO COLLISION BOX CREATED =====
        // We're NOT creating a collider object
        // this.houseColliders stays empty
        
        if (houseNumber >= 4 && this.houseDetailLevel !== 'low') {
            this.addHousePulsingLight(houseGroup, difficulty.color);
        }
        
        return houseGroup;
    }
    
    isPlayerInFrontOfHouse(playerPosition, doorData) {
        const housePos = doorData.housePosition;
        const houseRotation = doorData.rotationY;
        const frontArea = doorData.frontArea;
        
        const localPlayerPos = playerPosition.clone().sub(housePos);
        localPlayerPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -houseRotation);
        
        const halfWidth = frontArea.width / 2;
        const inFront = localPlayerPos.z > -frontArea.offset && 
                       localPlayerPos.z < (frontArea.depth - frontArea.offset);
        const withinWidth = Math.abs(localPlayerPos.x) < halfWidth;
        
        return inFront && withinWidth;
    }
    
    createWindowLights(houseGroup, houseNumber, difficulty) {
        const windowLights = [];
        
        if (this.houseDetailLevel === 'low') return windowLights;
        
        const lightPositions = [
            { x: 3, y: 3.5, z: 4 },
            { x: -3, y: 3.5, z: 4 },
            { x: 3, y: 3.5, z: -4 },
            { x: -3, y: 3.5, z: -4 }
        ];
        
        lightPositions.forEach(pos => {
            const light = new THREE.PointLight(difficulty.color, 0.35, 10);
            light.position.set(pos.x, pos.y, pos.z);
            
            // 🔧 Horror data
            light.userData = {
                baseIntensity: light.intensity,
                flickerSpeed: 0.8 + Math.random() * 0.6,
                flickerAmount: 0.15 + Math.random() * 0.15,
                flickerOffset: Math.random() * Math.PI * 2
            };
            
            houseGroup.add(light);
            windowLights.push(light);
        });
        
        return windowLights;
    }
        
    addHousePulsingLight(houseGroup, color) {
        const light = new THREE.PointLight(color, 0.3, 10);
        light.position.set(0, 8, 0);
        houseGroup.add(light);
        houseGroup.userData.pulseLight = light;
    }

    async createVillageHouses() {
        console.log("=== CREATING VILLAGE HOUSES (NO COLLISION, NO TEXT) ===");
        
        if (!this.houseReady) {
            console.log("Loading house model...");
            try {
                await this.loadHouseModel();
                console.log("House model loaded successfully");
            } catch (error) {
                console.error("Failed to load house model:", error);
            }
        }
        
        const houses = [];
        
        for (let i = 0; i < 3; i++) {
            const z = this.houseStartZ - (i * this.houseSpacing);
            
            const leftHouse = this.createHouse(-this.houseOffsetX, z, Math.PI / 2);
            houses.push(leftHouse);
            
            const rightHouse = this.createHouse(this.houseOffsetX, z, -Math.PI / 2);
            houses.push(rightHouse);
        }
        
        console.log("Total houses created (NO COLLISION, NO TEXT):", houses.length);
        return houses;
    }

    createStreetLights() {
        const spacing = 18;
        const offsetX = 8;

        for (let i = 0; i < 4; i++) {
            const z = -10 - i * spacing;

            [-offsetX, offsetX].forEach(x => {
                const pole = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.1, 0.15, 5, 6),
                    new THREE.MeshStandardMaterial({ 
                        color: 0x444444, 
                        roughness: 0.7, 
                        metalness: 0.4 
                    })
                );
                pole.position.set(x, 2.5, z);
                pole.castShadow = false;
                this.scene.add(pole);

                const lamp = new THREE.Mesh(
                    new THREE.SphereGeometry(0.25, 8, 8),
                    new THREE.MeshStandardMaterial({ 
                        color: 0xffdd99, 
                        emissive: 0xffaa66, 
                        emissiveIntensity: 1.2,
                        roughness: 0.2, 
                        metalness: 0.3 
                    })
                );
                lamp.position.set(x, 5, z);
                this.scene.add(lamp);

                const light = new THREE.SpotLight(0xffaa66, 1.2, 25, Math.PI / 5, 0.4);
                light.position.set(x, 5, z);
                light.target.position.set(x, 0, z);

                light.castShadow = true;
                light.shadow.mapSize.set(512, 512);
                light.shadow.camera.near = 1;
                light.shadow.camera.far = 30;

                this.scene.add(light.target);
                this.scene.add(light);

                lamp.userData = { 
                    light, 
                    originalIntensity: 0.8, 
                    flickerSpeed: 1.0 + Math.random() * 0.5,
                    flickerAmount: 0.05 + Math.random() * 0.05,
                    flickerOffset: Math.random() * Math.PI * 2 
                };
            });
        }
    }

    updateHouseWindows(completedHouseNumbers, failedHouseNumbers = new Set()) {
        this.completedHouseNumbers = completedHouseNumbers;
        this.failedHouseNumbers = failedHouseNumbers || new Set();
        
        this.houses.forEach(house => {
            const houseNumber = house.userData.houseNumber;
            
            const windowMeshes = house.userData.windowMeshes || [];
            windowMeshes.forEach(mesh => {
                if (mesh.material) {
                    if (completedHouseNumbers.includes(houseNumber)) {
                        mesh.material.emissive = new THREE.Color(0x00FF00);
                        mesh.material.emissiveIntensity = 0.6;
                    } else if (this.failedHouseNumbers.has(houseNumber)) {
                        mesh.material.emissive = new THREE.Color(0xFF0000);
                        mesh.material.emissiveIntensity = 0.8;
                    } else {
                        const difficulty = this.difficultyMaterials[houseNumber];
                        mesh.material.emissive = new THREE.Color(difficulty.color);
                        mesh.material.emissiveIntensity = 0.4;
                    }
                }
            });
            
            const windowLights = house.userData.windowLights || [];
            windowLights.forEach(light => {
                if (completedHouseNumbers.includes(houseNumber)) {
                    light.color.set(0x00FF00);
                    light.intensity = 0.3; // Reduced from 0.4
                } else if (this.failedHouseNumbers.has(houseNumber)) {
                    light.color.set(0xFF0000);
                    light.intensity = 0.4; // Reduced from 0.6
                } else {
                    const difficulty = this.difficultyMaterials[houseNumber];
                    light.color.set(difficulty.color);
                    light.intensity = 0.35; // Base intensity for flickering
                }
            });
            
            if (completedHouseNumbers.includes(houseNumber)) {
                house.userData.isCompleted = true;
                house.userData.isFailed = false;
                
                if (this.particleCount < this.maxParticles) {
                    this.createCompletionParticles(house.position, 0x00FF00);
                }
                
            } else if (this.failedHouseNumbers.has(houseNumber)) {
                house.userData.isCompleted = false;
                house.userData.isFailed = true;
                
                if (this.particleCount < this.maxParticles) {
                    this.createWarningParticles(house.position, 0xFF0000);
                }
                
            } else {
                house.userData.isCompleted = false;
                house.userData.isFailed = false;
            }
        });
    }
    
    createCompletionParticles(position, color) {
        if (this.particleCount >= this.maxParticles) return;
        
        const particleCount = 8;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.6
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(position);
            particle.position.y += 2;
            
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 2 + 1,
                    (Math.random() - 0.5) * 2
                ),
                life: 1.5,
                rotationSpeed: (Math.random() - 0.5) * 2
            };
            
            this.scene.add(particle);
            particles.push(particle);
            this.particleCount++;
        }
        
        const animateParticles = () => {
            let allDead = true;
            
            for (const particle of particles) {
                if (particle.userData.life > 0) {
                    allDead = false;
                    particle.userData.life -= 0.016;
                    
                    particle.position.addScaledVector(particle.userData.velocity, 0.016);
                    particle.userData.velocity.y -= 0.5;
                    
                    particle.rotation.y += particle.userData.rotationSpeed * 0.016;
                    
                    particle.material.opacity = particle.userData.life / 1.5 * 0.6;
                    
                    const scale = Math.min(1, particle.userData.life);
                    particle.scale.set(scale, scale, scale);
                }
            }
            
            if (!allDead) {
                requestAnimationFrame(animateParticles);
            } else {
                for (const particle of particles) {
                    this.scene.remove(particle);
                    this.particleCount--;
                }
            }
        };
        
        animateParticles();
    }
    
    createWarningParticles(position, color) {
        if (this.particleCount >= this.maxParticles) return;
        
        const particleCount = 6;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const material = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.5
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(position);
            particle.position.y += 2;
            
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 1.5,
                    Math.random() * 1.5,
                    (Math.random() - 0.5) * 1.5
                ),
                life: 1.0,
                spin: (Math.random() - 0.5) * 3
            };
            
            this.scene.add(particle);
            particles.push(particle);
            this.particleCount++;
        }
        
        const animateParticles = () => {
            let allDead = true;
            
            for (const particle of particles) {
                if (particle.userData.life > 0) {
                    allDead = false;
                    particle.userData.life -= 0.016;
                    
                    particle.position.addScaledVector(particle.userData.velocity, 0.016);
                    particle.userData.velocity.y -= 0.3;
                    
                    particle.rotation.z += particle.userData.spin * 0.016;
                    particle.material.opacity = particle.userData.life / 1.0 * 0.5;
                }
            }
            
            if (!allDead) {
                requestAnimationFrame(animateParticles);
            } else {
                for (const particle of particles) {
                    this.scene.remove(particle);
                    this.particleCount--;
                }
            }
        };
        
        animateParticles();
    }

    createAtmosphere() {
        this.scene.fog = new THREE.Fog(0x0b1020, 120, 320);
        
        if (this.houseDetailLevel !== 'low') {
            const haze = new THREE.Mesh(
                new THREE.SphereGeometry(400, 16, 16),
                new THREE.MeshBasicMaterial({ 
                    color: 0x1a2a4a, 
                    transparent: true, 
                    opacity: 0.1,
                    side: THREE.BackSide, 
                    depthWrite: false 
                })
            );
            haze.renderOrder = -80;
            this.scene.add(haze);
        }
        
        if (this.houseDetailLevel === 'high') {
            this.createDistantMountains();
        }
    }
    
    createDistantMountains() {
        const mountainGroup = new THREE.Group();
        
        for (let i = 0; i < 3; i++) {
            const mountain = new THREE.Mesh(
                new THREE.ConeGeometry(20 + Math.random() * 10, 30 + Math.random() * 20, 4),
                new THREE.MeshBasicMaterial({
                    color: 0x0a1a2a,
                    transparent: true,
                    opacity: 0.5
                })
            );
            
            const angle = (i / 3) * Math.PI * 2;
            const distance = 150;
            
            mountain.position.set(
                Math.cos(angle) * distance,
                -5,
                Math.sin(angle) * distance
            );
            mountain.rotation.y = -angle;
            
            mountainGroup.add(mountain);
        }
        
        mountainGroup.position.y = -10;
        this.scene.add(mountainGroup);
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0x0b1020, 0.15);
        this.scene.add(ambientLight);

        // Cold moon fill
        const fillLight = new THREE.DirectionalLight(0x334466, 0.18);
        fillLight.position.set(60, 40, 120);
        fillLight.target.position.set(0, 0, -40);
        this.scene.add(fillLight);
        this.scene.add(fillLight.target);

        return { ambientLight, fillLight };
    }

    async createEnvironment() {
        console.log("=== CREATING ENVIRONMENT ===");
        console.log("- Houses: NO COLLISION");
        console.log("- Houses: NO FLOATING TEXT");
        console.log("- Houses: Window colors indicate difficulty");
        
        this.createSky();
        this.createStars();
        await this.createMoon();
        this.createMilkyWay();
        this.createClouds();
        this.createAtmosphere();
        this.createLights();
        this.createGround();
        this.createPath();
        this.createVillageFogRing();
        this.createOuterWorldFog();

        await this.createVillageHouses();
        
        this.createStreetLights();
        this.createVictoryExit();
        
        console.log("=== ENVIRONMENT CREATED ===");
        console.log("Total houses: " + this.houses.length);
        console.log("Door interactions: " + this.doorPositions.length);
    }

    update(deltaTime) {
        const time = this.clock.getElapsedTime();

        // Fog ring breathing
        if (this.villageFogRing) {
            this.villageFogRing.children.forEach((fog, i) => {
                fog.material.opacity =
                    0.55 + Math.sin(time * 0.25 + i) * 0.06;
            });
        }

        // Outer fog slow drift
        if (this.outerFog) {
            this.outerFog.children.forEach((fog, i) => {
                fog.position.x += Math.sin(time * 0.1 + i) * 0.01;
                fog.position.z += Math.cos(time * 0.1 + i) * 0.01;
            });
        }

        /* =========================
        MOON BEHAVIOR
        ========================= */

        // Moonlight always faces the player
        if (this.moonDirectionalLight && window.game?.camera) {
            const camPos = window.game.camera.position;

            this.moonDirectionalLight.target.position.lerp(
                camPos,
                0.02
            );
            this.moonDirectionalLight.target.updateMatrixWorld();
        }

        // Slow moon rotation (very subtle)
        if (this.moonGroup) {
            this.moonGroup.rotation.y += deltaTime * 0.01;
        }

        // Soft moonlight intensity breathing
        if (this.moonDirectionalLight) {
            this.moonDirectionalLight.intensity =
                0.8 * (0.9 + 0.08 * Math.sin(time * 0.1));
        }

        /* =========================
        STARS
        ========================= */

        if (this.stars && this.stars.material) {
            this.stars.material.uniforms.time.value = time * 0.5;
        }

        /* =========================
        CLOUD MOVEMENT
        ========================= */

        this.clouds.forEach(cloud => {
            cloud.angle += deltaTime * cloud.speed * 0.5;

            cloud.group.position.x = Math.cos(cloud.angle) * cloud.radius;
            cloud.group.position.z = Math.sin(cloud.angle) * cloud.radius;
            cloud.group.position.y =
                cloud.height + Math.sin(time * 0.2 + cloud.angle) * 2;
        });

        /* =========================
        VILLAGE FOG (STRONG & VISIBLE)
        ========================= */

        // Fog ring breathing (wall around village)
        if (this.villageFog) {
            this.villageFog.children.forEach((fog, i) => {
                fog.material.opacity =
                    0.45 + Math.sin(time * 0.3 + i) * 0.05;
            });
        }

        /* =========================
        EXIT EFFECTS
        ========================= */

        if (this.exitLight) {
            this.exitLight.intensity =
                1.0 * (0.7 + 0.2 * Math.sin(time * 1.5));
        }

        if (this.exitPlatform && this.exitPlatform.material) {
            this.exitPlatform.material.emissiveIntensity =
                0.3 * (0.8 + 0.15 * Math.sin(time * 1.5));
        }

        /* =========================
        HOUSE LIGHT EFFECTS
        ========================= */

        this.houses.forEach(house => {
            const pulseLight = house.userData.pulseLight;
            if (pulseLight) {
                pulseLight.intensity =
                    0.2 + 0.1 * Math.sin(time * 1.5);
            }

            if (house.userData.isCompleted) {
                house.userData.windowLights?.forEach(light => {
                    light.intensity =
                        0.4 + 0.2 * Math.sin(time * 1.0);
                });
            }
        });

        /* =========================
        WINDOW FLICKER (subtle horror)
        ========================= */
        this.houses.forEach(house => {
            const lights = house.userData.windowLights || [];
            lights.forEach(light => {
                const d = light.userData;
                if (!d) return;

                const flicker =
                    d.baseIntensity *
                    (0.85 +
                        Math.sin(
                            time * d.flickerSpeed + d.flickerOffset
                        ) * d.flickerAmount);

                light.intensity = Math.max(0.15, flicker);
            });
        });

        /* =========================
        STREET LIGHT FLICKER
        ========================= */

        this.scene.children.forEach(child => {
            if (child.userData && child.userData.light) {
                const data = child.userData;
                const flicker =
                    0.95 + 0.05 * Math.sin(
                        time * data.flickerSpeed + data.flickerOffset
                    );

                data.light.intensity = data.originalIntensity * flicker;

                if (child.material) {
                    child.material.emissiveIntensity = 1.0 * flicker;
                }
            }
        });
    }

    setDetailLevel(level) {
        this.houseDetailLevel = level;
        
        switch(level) {
            case 'low':
                this.starCount = 200;
                this.cloudCount = 3;
                this.maxParticles = 20;
                break;
            case 'medium':
                this.starCount = 400;
                this.cloudCount = 5;
                this.maxParticles = 50;
                break;
            case 'high':
                this.starCount = 600;
                this.cloudCount = 8;
                this.maxParticles = 80;
                break;
        }
        
        console.log(`Environment detail level set to: ${level}`);
    }
    
    dispose() {
        if (this.stars) {
            this.stars.geometry.dispose();
            this.stars.material.dispose();
        }
        
        this.clouds.forEach(cloud => {
            cloud.group.traverse(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        });
        
        this.houses = [];
        this.houseColliders = [];
        this.doorPositions = [];
        this.collisionDebugHelpers = [];
    }

    createGroundFog() {
        const fogGroup = new THREE.Group();

        for (let i = 0; i < 12; i++) {
            const fogPatch = new THREE.Mesh(
                new THREE.SphereGeometry(12 + Math.random() * 8, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: 0x1a2a3a,
                    transparent: true,
                    opacity: 0.12,
                    depthWrite: false
                })
            );

            fogPatch.position.set(
                (Math.random() - 0.5) * 80,
                3 + Math.random() * 2,
                -30 - Math.random() * 80
            );

            fogPatch.scale.y = 0.35;
            fogPatch.renderOrder = -20;

            fogGroup.add(fogPatch);
        }

        this.scene.add(fogGroup);
        this.groundFog = fogGroup;
    }

    createVillageFogRing() {
        const fogGroup = new THREE.Group();

        const fogMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a2a3a,
            transparent: true,
            opacity: 0.55,     // strong wall
            depthWrite: false
        });

        const ringRadius = 95;     // OUTSIDE village
        const fogCount = 32;

        for (let i = 0; i < fogCount; i++) {
            const fogWall = new THREE.Mesh(
                new THREE.PlaneGeometry(40, 20),
                fogMaterial
            );

            const angle = (i / fogCount) * Math.PI * 2;

            fogWall.position.set(
                Math.cos(angle) * ringRadius,
                8,
                Math.sin(angle) * ringRadius - 40
            );

            fogWall.lookAt(0, 8, -40);
            fogWall.rotation.y += Math.PI;

            fogWall.renderOrder = -10;
            fogGroup.add(fogWall);
        }

        this.scene.add(fogGroup);
        this.villageFogRing = fogGroup;
    }

    createOuterWorldFog() {
        const fogGroup = new THREE.Group();

        const fogMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a2a3a,
            transparent: true,
            opacity: 0.35,
            depthWrite: false
        });

        for (let i = 0; i < 30; i++) {
            const fogPatch = new THREE.Mesh(
                new THREE.SphereGeometry(30 + Math.random() * 20, 16, 16),
                fogMaterial
            );

            const distance = 120 + Math.random() * 120;
            const angle = Math.random() * Math.PI * 2;

            fogPatch.position.set(
                Math.cos(angle) * distance,
                4,
                Math.sin(angle) * distance - 40
            );

            fogPatch.scale.y = 0.3;
            fogPatch.renderOrder = -12;

            fogGroup.add(fogPatch);
        }

        this.scene.add(fogGroup);
        this.outerFog = fogGroup;
    }
}