// Procedural terrain generation
let ws = prompt('Type a word or phrase to generate\n a new terrain.');
const worldSeed = getSeed(ws);

function getSeed(seedWord) {
    if (!seedWord) return 1;
    let hash = 5381;
    for (let i = 0; i < seedWord.length; i++) {
        hash = ((hash << 5) + hash) + seedWord.charCodeAt(i);
    }
    if (hash == NaN || hash === 5381) return 1;
    return hash >>> 0;
}

// Perlin noise implementation.
const noise = {
    p: new Uint8Array(512),
    // 151, not ws. 160, not ws.
    permutation: [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180],
    init: function() {
        for(let i=0; i < 256; i++) {
            // Here's where we add world seed :)
            this.p[i] = this.p[i + 256] = this.permutation[i]*getSeed(ws);
        }
        // What's our seed?
        console.log('world seed is ' + getSeed(ws));
    },
    fade: function(t) { return t * t * t * (t * (t * 6 - 15) + 10); },
    lerp: function(t, a, b) { return a + t * (b - a); },
    grad: function(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    },
    noise: function(x, y, z) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;

        return this.lerp(w,
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA], x, y, z),
                    this.grad(this.p[BA], x-1, y, z)
                ),
                this.lerp(u,
                    this.grad(this.p[AB], x, y-1, z),
                    this.grad(this.p[BB], x-1, y-1, z)
                )
            ),
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA+1], x, y, z-1),
                    this.grad(this.p[BA+1], x-1, y, z-1)
                ),
                this.lerp(u,
                    this.grad(this.p[AB+1], x, y-1, z-1),
                    this.grad(this.p[BB+1], x-1, y-1, z-1)
                )
            )
        );
    }
};

function getBiomeHeight(x, z, gSpread) {
    const xCoord = x * 0.05 * gSpread;
    const zCoord = z * 0.05 * gSpread;
    
    // Biome selection.
    const biomeNoise = noise.noise(xCoord * 0.002, 0, zCoord * 0.002);
    
    let height = 0;
    
    // Default < 0.5.
    // Hills is 0.6.
    if (biomeNoise < 0.5) {
        // Plains biome
        height += noise.noise(xCoord * 1, 0, zCoord * 1) * 8;
        height += noise.noise(xCoord * 2, 0, zCoord * 2) * 4;
        
    } else if (biomeNoise < 0.6) {
        // Hills biome
        height += noise.noise(xCoord * 0.5, 0, zCoord * 0.5) * 20;
        height += noise.noise(xCoord * 1, 0, zCoord * 1) * 10;
        
    } else {
        // Mountains biome
        height += noise.noise(xCoord * 0.3, 0, zCoord * 0.3) * 35;
        height += noise.noise(xCoord * 0.8, 0, zCoord * 0.8) * 15;
        
        // Sharp peaks
        const peakNoise = noise.noise(xCoord * 1.5, 0, zCoord * 1.5);
        if (peakNoise > 0.7) {
            height += Math.pow(peakNoise - 0.7, 2) * 60;
        }
    }
    
    return height;
}

function getRidgeNoise(x, z) {
    const n = noise.noise(x, 0, z);
    return 1 - Math.abs(n); // Creates sharp ridges
}

function getErosionNoise(xCoord,zCoord){
    // Erosion effect.
    const erosionNoise = noise.noise(xCoord * 3, 0, zCoord * 3);
    const slope = Math.abs(
        noise.noise(xCoord + 0.1, 0, zCoord) - 
        noise.noise(xCoord - 0.1, 0, zCoord)
    );
    
    // More erosion on steeper slopes.
    // Strength default is 10, not 20.
    const erosionStrength=16;
    if (slope > 0.2) {
        return -erosionNoise * slope * erosionStrength;
    } else return 0;
}

function getTerrainHeight(x, z) {
    // Default 0.05.
    const xCoord = x * 0.05;  // Base frequency - try 0.03 for wider features or 0.08 for tighter.
    const zCoord = z * 0.05;
    
    // Base terrain with multiple layers
    let height = 0;

    const gSpread2 = 0.001;
    height += noise.noise(xCoord * 0.1 * gSpread2, 0, zCoord * 0.1 * gSpread2) * 2048;
    
    // Large features (mountains and valleys)
    // Original values 0.5 and 24.
    // General spread multiplier attempt. Default 1.
    const gSpread = 0.7;
    height += noise.noise(xCoord * 0.1 * gSpread, 0, zCoord * 0.1 * gSpread) * 64;  // Increased from 10.
    
    // Medium features (hills)
    height += noise.noise(xCoord * 1 * gSpread, 0, zCoord * 1 * gSpread) * 12;  // New medium scale.
    
    // Small features (rough terrain)
    height += noise.noise(xCoord * 2 * gSpread, 0, zCoord * 2 * gSpread) * 6;
    
    // Micro features (texture)
    height += noise.noise(xCoord * 4 * gSpread, 0, zCoord * 4 * gSpread) * 3;
    
    // Mountain generation with more variation
    const mountainNoise = noise.noise(xCoord * 0.25 * gSpread, 0, zCoord * 0.25 * gSpread);
    if (mountainNoise > 0.5) {
        // Create more varied mountains.
        // Default 40, not 160.
        const mountainHeight = (mountainNoise - 0.5) * 2; // 0 to 1
        const mountainScale = 40 + noise.noise(xCoord * 0.1, 0, zCoord * 0.1) * 200;
        height += mountainHeight * mountainScale;
    }
    
    // Add plateaus.
    const plateauNoise = noise.noise(xCoord * 0.15 * gSpread, 0, zCoord * 0.15 * gSpread);
    if (plateauNoise > 0.7) {
        // Default 15..
        const plateauHeight = 15;
        const plateauBlend = (plateauNoise - 0.7) * 3.33; // 0 to 1
        height = height * (1 - plateauBlend) + plateauHeight * plateauBlend;
    }
    
    // Add valleys/canyons.
    const valleyNoise = noise.noise(xCoord * 0.2 * gSpread, 0, zCoord * 0.2 * gSpread);
    if (valleyNoise < 0.2) {
        const valleyDepth = -10;
        const valleyBlend = (0.2 - valleyNoise) * 5; // 0 to 1
        height *= (1 - valleyBlend * 0.8);
    }

    let biomes=true;
    let erosion=true;
    let ridges=false;
    // Add biomes.
    if (biomes){
        height += getBiomeHeight(x,z,gSpread)
    }
    // Add ridges.
    if (ridges){
        const ridgeNoise = getRidgeNoise(xCoord * 0.5, zCoord * 0.5);
        // Ridge strength default 30, not 12.
        height += ridgeNoise * ridgeNoise * 12; // Square it for sharper ridges.
    }
    // Add erosion.
    if (erosion){
        height += getErosionNoise(xCoord, zCoord);
    }
    
    return height;
}

function getTerrainColor(height) {

    if (worldSeed!=1){
    // Grassy height-based colouring.
    if (height < -11.5) return '#002222';
    if (height < 0) return '#002200';     
    if (height < 5) return '#002900';     
    if (height < 10) return '#003000';    
    if (height < 30) return '#003800';    
    if (height < 50) return '#004400';    
    if (height < 70) return '#6B776B';    
    return '#FFFFFF';
    }
    else if (worldSeed===1){
    // Snowy appearance.
    if (height < -11.5) return '#002222';
    if (height < 0) return '#AAA';     // Deep water
    if (height < 5) return '#BBB';     // Shallow water
    if (height < 10) return '#CCC';    // Beach/Sand
    if (height < 30) return '#DDD';    // Grass/Plains
    if (height < 50) return '#EEE';    // Forest
    if (height < 70) return '#FFFFFF';    // Mountain
    return '#FFFFFF';                     // Snow peaks
    }
}

AFRAME.registerComponent('terrain-generator', {
    schema: {
        chunk: {type: 'vec2'},
        poolSize: {type: 'number', default: 50}, // Added for optimization
        preloadRadius: {type: 'number', default: 4} // Added for optimization
    },

    init: function() {
        noise.init();
        this.player = document.querySelector('#player').object3D;
        this.chunks = new Map();
        this.chunkPool = []; // New chunk pool
        this.chunkSize = 204;
        this.chunksToGen = 2;

        // Initialize chunk pool
        console.log('Initializing chunk pool...');
        for (let i = 0; i < this.data.poolSize; i++) {
            const chunk = this.createChunkMesh();
            chunk.visible = false;
            this.chunkPool.push(chunk);
        }

        // Pre-generate initial chunks
        console.log('Pre-generating initial chunks...');
        this.preloadChunks().then(() => {
            console.log('Initial chunks generated');
            this.el.emit('terrain-ready');
        });
    },

    createChunkMesh: function() {
        const maxVertices = (this.chunkSize * this.chunkSize);
        const geometry = new THREE.BufferGeometry();
        
        // Preallocate buffers
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxVertices * 3), 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(maxVertices * 3), 3));
        
        let material;
        if (worldSeed != 1) {
            material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.8,
                metalness: 0.2,
                flatShading: true
            });
        } else {
            material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.6,
                metalness: 0.1,
                flatShading: true
            });
        }

        return new THREE.Mesh(geometry, material);
    },

    getChunkFromPool: function() {
        let chunk;
        if (this.chunkPool.length > 0) {
            chunk = this.chunkPool.pop();
        } else {
            console.warn('Chunk pool depleted, creating new chunk');
            chunk = this.createChunkMesh();
        }
        chunk.visible = true;
        return chunk;
    },

    returnChunkToPool: function(chunk) {
        chunk.visible = false;
        this.chunkPool.push(chunk);
    },

    preloadChunks: async function() {
        const radius = this.data.preloadRadius;
        const promises = [];
        
        // Generate chunks in a spiral pattern from center
        for (let r = 0; r <= radius; r++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const x = Math.round(Math.cos(angle) * r);
                const z = Math.round(Math.sin(angle) * r);
                promises.push(this.generateChunk(x, z));
            }
        }

        return Promise.all(promises);
    },

    generateChunk: async function(chunkX, chunkZ) {
        const chunkSize = this.chunkSize;
        const resolution = 1;
        const vertices = [];
        const indices = [];
        const colors = [];
        
        const offsetX = chunkX * (chunkSize - 1);
        const offsetZ = chunkZ * (chunkSize - 1);
        
        // Get or create chunk mesh
        const chunk = this.getChunkFromPool();
        const geometry = chunk.geometry;

        // Generate vertices
        for (let z = 0; z < chunkSize; z += resolution) {
            for (let x = 0; x < chunkSize; x += resolution) {
                const worldX = x + offsetX;
                const worldZ = z + offsetZ;
                const height = getTerrainHeight(worldX, worldZ);
                vertices.push(worldX, height, worldZ);
            }
        }

        // Generate indices
        const verticesPerRow = chunkSize / resolution;
        for (let z = 0; z < verticesPerRow - 1; z++) {
            for (let x = 0; x < verticesPerRow - 1; x++) {
                const topLeft = z * verticesPerRow + x;
                const topRight = topLeft + 1;
                const bottomLeft = (z + 1) * verticesPerRow + x;
                const bottomRight = bottomLeft + 1;

                indices.push(topLeft, bottomLeft, topRight);
                indices.push(bottomLeft, bottomRight, topRight);
            }
        }

        // Generate colors
        for (let i = 0; i < vertices.length; i += 3) {
            const height = vertices[i + 1];
            const color = new THREE.Color(getTerrainColor(height));
            colors.push(color.r, color.g, color.b);
        }

        // Update geometry
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        this.el.object3D.add(chunk);
        this.chunks.set(`${chunkX},${chunkZ}`, chunk);

        // Emit chunk-generated event for other components
        const event = new CustomEvent('chunk-generated', {
            detail: { 
                chunkX, 
                chunkZ,
                offsetX,
                offsetZ
            }
        });
        this.el.dispatchEvent(event);

        return chunk;
    },

    tick: function() {
        const player = this.player;
        const chunkSize = this.chunkSize;
        
        const chunkX = Math.floor(player.position.x / chunkSize);
        const chunkZ = Math.floor(player.position.z / chunkSize);
        
        // Generate surrounding chunks if they don't exist
        for (let z = chunkZ - this.chunksToGen; z <= chunkZ + this.chunksToGen; z++) {
            for (let x = chunkX - this.chunksToGen; x <= chunkX + this.chunksToGen; x++) {
                const key = `${x},${z}`;
                if (!this.chunks.has(key)) {
                    this.generateChunk(x, z);
                }
            }
        }

        // Remove far chunks
        for (const [key, chunk] of this.chunks.entries()) {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - chunkX) > (this.chunksToGen + 1) || 
                Math.abs(z - chunkZ) > (this.chunksToGen + 1)) {
                this.el.object3D.remove(chunk);
                this.returnChunkToPool(chunk);
                this.chunks.delete(key);
            }
        }
    },

    remove: function() {
        // Cleanup all chunks and pool
        for (const chunk of this.chunks.values()) {
            this.el.object3D.remove(chunk);
            chunk.geometry.dispose();
            chunk.material.dispose();
        }
        for (const chunk of this.chunkPool) {
            chunk.geometry.dispose();
            chunk.material.dispose();
        }
        this.chunks.clear();
        this.chunkPool = [];
    }
});

// Modify terrain-movement component to wait for terrain
AFRAME.registerComponent('terrain-movement', {
    schema: {
        height: {type: 'number', default: 4.6}
    },

    init: function() {
        // Existing initialization code
        this.velocity = new THREE.Vector3();
        this.targetY = 0;
        
        this.fov = 80;
        this.cam = document.querySelector("#cam").object3D;
        this.rig = document.querySelector("#player").object3D;
        this.timeStamp = Date.now();
        this.moveZ = 0;
        this.moveX = 0;

        this.running = false;
        this.flying = false;
        this.hud = document.querySelector("#hud").object3D;

        this.lunaBounce = false;
        this.jumpTime = Date.now();
        this.jumping = false;
        this.presentJumpSpeed = 0.5;

        // Add terrain ready check
        this.enabled = true;
        const terrainEl = document.querySelector('[terrain-generator]');
        if (terrainEl) {
            terrainEl.addEventListener('terrain-ready', () => {
                console.log('Terrain ready, enabling movement');
                this.enabled = true;
            });
        }
        
        // Setup key listeners for smoother movement.
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            s: false,
            a: false,
            d: false,
            ShiftLeft: false
        };
        
        document.addEventListener('keydown', (e) => this.keys[e.key] = true);
        document.addEventListener('keyup', (e) => this.keys[e.key] = false);
        // Also listen for shift key...
        document.addEventListener('keydown', (e) => {
            if (e.code === 'ShiftLeft') {
                this.keys.ShiftLeft = true;
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'ShiftLeft') {
                this.keys.ShiftLeft = false;
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.hudToggle();
            }
        });
    },

    hudToggle: function(){
        this.hud.visible=!this.hud.visible;
                if (this.hud.visible){
                this.hud.position.y=2;
                this.hud.rotation.y=this.cam.rotation.y;
                }
                else this.hud.position.y=999;
            
    },
    

    tick: function(time, delta) {
        if (!this.enabled || !delta) return;
        delta = delta * 0.001; // Convert to seconds.
        
        const position = this.rig.position;
        const rotation = this.cam.rotation;

        // Camera controls testing, for VR (and mobile).
        //if(AFRAME.utils.device.isMobile()){
            const pitch=rotation.x;
            const roll=rotation.z;

        // Location of co-ords projected to a HUD.
        document.querySelector('#micro-hud-text').setAttribute(
            'value',`${Math.floor(position.x*0.01)} ${Math.floor(position.z*0.01)}`);
        
            // document.querySelector('#micro-hud-text').setAttribute(
            //     'value',`${pitch}`);
            
            // Let's try a toggle left.
            const minZ=0.3;  // Default 0.2.
			const maxZ=0.5; // Default 0.4.
                if ((roll > minZ && roll < maxZ)){
                    //console.log('rooling?');
            // Log time stamp. This will be for
            // toggling via head z rotations.
            // Have 2s elapsed?
            let cTime = Date.now();
            if (cTime-this.timeStamp > 2000){
            
                // Toggle locomotion.
                this.timeStamp=Date.now();
                if(this.moveZ==1) this.moveZ=0;
                else this.moveZ=1;

                // Build testing...
                // const bud = document.createElement('a-box');
                // bud.setAttribute('position', `  ${position.x} 
                //                                 ${position.y+5}
                //                                 ${position.z-5}`);
                // bud.setAttribute('scale','2 2 2');
                // bud.setAttribute('color','#FFF');
                // document.querySelector('a-scene').appendChild(bud);
                //console.log('boomy');
                
            }
        //}
        }

        // Let's try a toggle to the right.
        const RminZ=-0.3;  
        const RmaxZ=-0.5;
         //document.querySelector('#hud-text').setAttribute('value',`${roll}`);
        if ((roll < RminZ && roll > RmaxZ)){
            //console.log('right toggle!');
         // Log time stamp. This will be for
         // toggling via head z rotations.
         // Have 2s elapsed?
            let cTime = Date.now();
            if (cTime-this.timeStamp > 2000){
                this.timeStamp=Date.now();
                //this.hud.visible=!this.hud.visible;
                this.hudToggle();
            }
        }

        // Calculate movement direction.
        // Have negated sign of 1 here -- before, inverted movement bug.
        if(!AFRAME.utils.device.isMobile()){
            
            this.moveX =    (this.keys.a || this.keys.ArrowLeft ? -1 : 0) + 
                            (this.keys.d || this.keys.ArrowRight ? 1 : 0);
            this.moveZ =    (this.keys.w || this.keys.ArrowUp ? 1 : 0) + 
                            (this.keys.s || this.keys.ArrowDown ? -1 : 0);

            // Running toggle via shift.
            let sTime = Date.now();
            if (sTime-this.timeStamp > 500){
                if (this.keys.ShiftLeft) {
                    this.running=!this.running;
                    this.timeStamp=Date.now();
                }
            }
            

        } 

        
        // Running settings!
        let run_speed=1;
        if (this.running) { 
            run_speed = 5;
            } else {
                run_speed = 1;
                
                }
        
        
        // Return fov to normal, i.e. not running.
        if (this.fov<80){this.fov=80;}
        else 
            {document.querySelector("#cam").setAttribute("fov",`${this.fov-=0.5}`);}
        

        // Apply movement in camera direction.
        if (this.moveX !== 0 || this.moveZ !== 0) {
            const angle = rotation.y;
            
            if (this.running)
            document.querySelector("#cam").setAttribute("fov",`${this.fov+=0.6}`);
            if (this.fov>120)this.fov=120;

            const speed = 5 * run_speed;

            this.velocity.x = (-this.moveZ * Math.sin(angle) + this.moveX * Math.cos(angle)) * speed;
            this.velocity.z = (-this.moveZ * Math.cos(angle) - this.moveX * Math.sin(angle)) * speed;
        } else {
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
        }
        
        // Update position.
        position.x += this.velocity.x * delta;
        position.z += this.velocity.z * delta;
        
        // Get terrain height at current position.
        const terrainY = getTerrainHeight(position.x, position.z);
        this.targetY = terrainY + this.data.height;
        
        // Test hack to use ridges button as luna bounce.
        //this.lunaBounce=ridges;
        if (this.flying){
            // Pitch can affect y position...for flight :D
            //position.y += pitch*0.06 * Math.abs(this.velocity.z+this.velocity.x);
            position.y += pitch*0.4*this.moveZ;
        } else if (this.lunaBounce) {
            if (!this.jumping){
                position.y -= this.presentJumpSpeed;
                // Moony = 1.01 Earthy = 1.1
                this.presentJumpSpeed *= 1.02;
            }
            else if (this.jumping && this.moveZ==1){
                position.y += this.presentJumpSpeed;
                // Friction upward is 0.986.
                this.presentJumpSpeed *= 0.986;
                // The smaller the number below, the smoother the crest and fall.
                // 0.0085 is nice.
                if (this.presentJumpSpeed <= 0.0085){
                    this.jumping=false;
                }
            }
        } else if (!this.lunaBounce) {
            // So, just walking...interpolate to target. Slower if in water (<=-12).
            if (position.y <= -12) 
                position.y += (this.targetY - position.y) * 0.01;
            else
                position.y += (this.targetY - position.y) * 0.1;
        }

        // Prevent falling below present surface.
        if (position.y < this.targetY) {
            //this.jumpTime=Date.now();
            if (this.lunaBounce){
                this.jumping=true;
                this.presentJumpSpeed=0.1;
            }
            position.y = terrainY + this.data.height;
        }
    
    }
});