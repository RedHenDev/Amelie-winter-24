AFRAME.registerComponent('terrain-tree-instances', {
    dependencies: ['terrain-generator'],

    schema: {
        count: { type: 'number', default: 5 },
        range: { type: 'number', default: 204 },
        scale: { type: 'number', default: 1.0 },
        minScale: { type: 'number', default: 0.8 },
        maxScale: { type: 'number', default: 1.2 }
    },

    init: function() {
        this.terrainGenerator = this.el.components['terrain-generator'];
        this.treeInstances = new Map();
        this.player = document.querySelector('#player').object3D;
        
        // Create instanced mesh for trees
        this.initInstancedTrees();
        
        // Bind event handlers
        this.boundChunkHandler = this.onChunkGenerated.bind(this);
        this.cleanup = this.cleanup.bind(this);
        
        // Setup cleanup listeners
        this.el.addEventListener('componentremoved', (evt) => {
            if (evt.detail.name === 'terrain-tree-instances') {
                this.cleanup();
            }
        });
        
        const sceneEl = this.el.sceneEl;
        if (sceneEl) {
            sceneEl.addEventListener('destroy', this.cleanup);
        }

        // Add chunk generation listener
        this.el.addEventListener('chunk-generated', this.boundChunkHandler);
    },

    initInstancedTrees: function() {
        // Load the tree model once and create an instanced mesh
        const loader = new THREE.OBJLoader();
        
        // Create a loading manager to handle the tree.obj load
        const manager = new THREE.LoadingManager();
        manager.onError = function(url) {
            console.error('Error loading tree model:', url);
        };

        loader.load('./tree.obj', (obj) => {
            // Get the geometry from the loaded model
            const treeGeometry = obj.children[0].geometry;
            
            // Create material for the trees
            const treeMaterial = new THREE.MeshStandardMaterial({
                color: '#2d4c1e',
                roughness: 0.8,
                metalness: 0.1
            });

            // Create the instanced mesh
            this.instancedTrees = new THREE.InstancedMesh(
                treeGeometry,
                treeMaterial,
                this.data.count * 100 // Buffer for multiple chunks
            );

            this.el.object3D.add(this.instancedTrees);
        });
    },

    onChunkGenerated: function(event) {
        const { chunkX, chunkZ } = event.detail;
        this.generateTreesForChunk(chunkX, chunkZ);
    },

    generateTreesForChunk: function(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        
        // Skip if trees already exist for this chunk
        if (this.treeInstances.has(key)) return;

        // Skip certain chunks for variety (can be adjusted)
        if (Math.random() < 0.3) return;

        const chunkSize = this.terrainGenerator.chunkSize;
        const offsetX = chunkX * (chunkSize - 1);
        const offsetZ = chunkZ * (chunkSize - 1);

        const instances = [];
        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.data.count; i++) {
            const localX = (Math.random() - 0.5) * this.data.range;
            const localZ = (Math.random() - 0.5) * this.data.range;
            
            const worldX = localX + offsetX;
            const worldZ = localZ + offsetZ;
            
            // Get terrain height at tree position
            let y = 0;
            try {
                y = getTerrainHeight(worldX, worldZ);
            } catch (e) {
                continue; // Skip if height calculation fails
            }

            // Skip if underwater or too high
            if (y < -12 || y > 50) continue;

            // Create transform for this instance
            const scale = this.data.minScale + 
                         Math.random() * (this.data.maxScale - this.data.minScale);
            
            dummy.position.set(localX, y, localZ);
            dummy.rotation.set(
                (Math.random() - 0.5) * 0.2, // Slight random tilt
                Math.random() * Math.PI * 2,  // Random rotation
                0
            );
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            // Store instance data
            instances.push({
                matrix: dummy.matrix.clone(),
                position: dummy.position.clone(),
                scale: scale
            });

            // Set the instance in the instanced mesh
            if (this.instancedTrees) {
                const instanceId = this.getNextAvailableInstanceId();
                this.instancedTrees.setMatrixAt(instanceId, dummy.matrix);
            }
        }

        this.treeInstances.set(key, instances);
        
        if (this.instancedTrees) {
            this.instancedTrees.instanceMatrix.needsUpdate = true;
        }
    },

    getNextAvailableInstanceId: function() {
        // Simple counter for instance IDs
        if (!this.currentInstanceId) this.currentInstanceId = 0;
        return this.currentInstanceId++;
    },

    tick: function() {
        if (!this.terrainGenerator || !this.player) return;
        
        const chunkSize = this.terrainGenerator.chunkSize;
        const chunkX = Math.floor(this.player.position.x / chunkSize);
        const chunkZ = Math.floor(this.player.position.z / chunkSize);
        
        // Remove far chunks
        for (const [key, instances] of this.treeInstances.entries()) {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - chunkX) > 3 || Math.abs(z - chunkZ) > 3) {
                this.treeInstances.delete(key);
                // No need to explicitly remove instances as they'll be overwritten
            }
        }
    },

    cleanup: function() {
        this.treeInstances.clear();
        
        if (this.instancedTrees) {
            this.instancedTrees.geometry.dispose();
            this.instancedTrees.material.dispose();
            this.el.object3D.remove(this.instancedTrees);
        }

        this.el.removeEventListener('chunk-generated', this.boundChunkHandler);
        
        if (this.el.sceneEl) {
            this.el.sceneEl.removeEventListener('destroy', this.cleanup);
        }

        this.terrainGenerator = null;
        this.player = null;
    },

    remove: function() {
        this.cleanup();
    }
});