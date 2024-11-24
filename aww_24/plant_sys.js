AFRAME.registerComponent('plant-system', {
    schema: {
        count: { type: 'number', default: 512 },
        range: { type: 'number', default: 88 },
        minHeight: { type: 'number', default: 0.5 },
        maxHeight: { type: 'number', default: 2 },
        windStrength: { type: 'number', default: 0.2 },
        windTurbulence: { type: 'number', default: 0.05 },
        flowerProbability: { type: 'number', default: 0.3 } // 30% chance of flowers
    },

    init: function() {
        this.camera = document.querySelector('#player').object3D;
        this.transforms = [];

        const plantGeometry = this.createPlantGeometry();

        // Updated material with better colors and transparency
        const material = new THREE.MeshPhongMaterial({
            color: '#4a8505',
            side: THREE.DoubleSide,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            shininess: 10
        });

        this.instancedPlants = new THREE.InstancedMesh(
            plantGeometry,
            material,
            this.data.count
        );
        this.el.setObject3D('plants', this.instancedPlants);

        this.populatePlantMeshes();
        this.time = 0;
    },

    createPlantGeometry: function() {
        const combinedGeometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const colors = [];

        // Helper function to create a single blade of grass
        const createBlade = (baseX, baseY, baseZ, height, lean, rotation) => {
            const segments = 4;
            // 0.02 not 0.2.
            const width = 0.2 + Math.random() * 0.2;
            
            let prevLeft, prevRight; // Store previous points for proper segment joining
            
            for (let i = 0; i < segments; i++) {
                const t = i / (segments - 1);
                const nextT = (i + 1) / (segments - 1);
                
                // Create a smooth curve using quadratic bezier
                const curveX = lean * Math.pow(t, 2);
                const nextCurveX = lean * Math.pow(nextT, 2);
                
                const segmentWidth = width * (1 - t * 0.7);
                const nextSegmentWidth = width * (1 - nextT * 0.7);
                
                // Add slight waviness
                const waveZ = Math.sin(t * Math.PI) * 0.02;
                
                // Rotate points
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                
                // Calculate current points
                const currentLeft = [
                    baseX + (curveX - segmentWidth) * cos,
                    baseY + height * t,
                    baseZ + (waveZ - segmentWidth) * sin
                ];
                
                const currentRight = [
                    baseX + (curveX + segmentWidth) * cos,
                    baseY + height * t,
                    baseZ + (waveZ + segmentWidth) * sin
                ];
                
                if (i > 0) {
                    // Create two triangles to form a quad
                    positions.push(
                        ...prevLeft, ...prevRight, ...currentLeft,  // First triangle
                        ...prevRight, ...currentRight, ...currentLeft // Second triangle
                    );
                    
                    // Add normals
                    const normal = calculateNormal(prevLeft, prevRight, currentLeft);
                    for (let j = 0; j < 6; j++) {
                        normals.push(...normal);
                    }
                    
                    // Add colors with gradient
                    const baseColor = [
                        0.2 + Math.random() * 0.1,
                        0.5 + Math.random() * 0.3,
                        0.1 + Math.random() * 0.1
                    ];
                    
                    const topColor = [
                        baseColor[0] * 1.2,
                        baseColor[1] * 1.2,
                        baseColor[2] * 1.2
                    ];
                    
                    const color = t < 0.5 ? baseColor : topColor;
                    for (let j = 0; j < 6; j++) {
                        colors.push(...color);
                    }
                }
                
                prevLeft = currentLeft;
                prevRight = currentRight;
            }
        };

        // Helper function to create a flower
        const createFlower = (x, y, z, rotation) => {
            const petalCount = 5;
            const petalLength = 0.03;
            const petalWidth = 0.015;
            const centerRadius = 0.01;
            
            // Create flower center (yellow)
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const nextAngle = ((i + 1) / 8) * Math.PI * 2;
                
                const centerPoints = [
                    [x, y, z], // Center
                    [x + Math.cos(angle) * centerRadius, y, z + Math.sin(angle) * centerRadius],
                    [x + Math.cos(nextAngle) * centerRadius, y, z + Math.sin(nextAngle) * centerRadius]
                ];
                
                positions.push(...centerPoints.flat());
                
                // Yellow color for center
                const centerColor = [1, 0.9, 0.1];
                for (let j = 0; j < 3; j++) {
                    colors.push(...centerColor);
                }
                
                // Normal pointing up for center
                const normal = [0, 1, 0];
                for (let j = 0; j < 3; j++) {
                    normals.push(...normal);
                }
            }
            
            // Create petals
            for (let i = 0; i < petalCount; i++) {
                const angle = rotation + (i / petalCount) * Math.PI * 2;
                const petalRotation = angle + Math.PI / 2;
                
                // Create a petal (triangle pair)
                const petalBase = [
                    x + Math.cos(angle) * centerRadius,
                    y,
                    z + Math.sin(angle) * centerRadius
                ];
                
                const petalTip = [
                    x + Math.cos(angle) * (centerRadius + petalLength),
                    y + 0.02, // Slight upward tilt
                    z + Math.sin(angle) * (centerRadius + petalLength)
                ];
                
                const petalLeft = [
                    x + Math.cos(angle - 0.4) * (centerRadius + petalWidth),
                    y,
                    z + Math.sin(angle - 0.4) * (centerRadius + petalWidth)
                ];
                
                const petalRight = [
                    x + Math.cos(angle + 0.4) * (centerRadius + petalWidth),
                    y,
                    z + Math.sin(angle + 0.4) * (centerRadius + petalWidth)
                ];
                
                // Two triangles for each petal
                positions.push(
                    ...petalBase, ...petalLeft, ...petalTip,
                    ...petalBase, ...petalTip, ...petalRight
                );
                
                // White/pink color for petals
                const petalColor = [
                    1,  // Red
                    0.8 + Math.random() * 0.2,  // Green (slight variation)
                    0.8 + Math.random() * 0.2   // Blue (slight variation)
                ];
                
                for (let j = 0; j < 6; j++) {
                    colors.push(...petalColor);
                }
                
                // Calculate and add normals for petals
                const normal = [0, 1, 0]; // Simplified normal
                for (let j = 0; j < 6; j++) {
                    normals.push(...normal);
                }
            }
        };

        // Helper function to calculate normal for a triangle
        const calculateNormal = (p1, p2, p3) => {
            const v1 = [
                p2[0] - p1[0],
                p2[1] - p1[1],
                p2[2] - p1[2]
            ];
            
            const v2 = [
                p3[0] - p1[0],
                p3[1] - p1[1],
                p3[2] - p1[2]
            ];
            
            const normal = [
                v1[1] * v2[2] - v1[2] * v2[1],
                v1[2] * v2[0] - v1[0] * v2[2],
                v1[0] * v2[1] - v1[1] * v2[0]
            ];
            
            // Normalize
            const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
            return normal.map(n => n / length);
        };

        // Create multiple blades for each plant
        const createPlant = () => {
            const bladeCount = 3 + Math.floor(Math.random() * 4);
            
            for (let i = 0; i < bladeCount; i++) {
                const angle = (i / bladeCount) * Math.PI * 2 + Math.random() * 0.5;
                const radius = 0.02 + Math.random() * 0.03;
                const baseX = Math.cos(angle) * radius;
                const baseZ = Math.sin(angle) * radius;
                const height = 0.3 + Math.random() * 0.3;
                const lean = 0.05 + Math.random() * 0.05;
                
                createBlade(baseX, 0, baseZ, height, lean, angle);
            }
            
            // Add flower with probability
            // Default flowerHeight 0.25.
            if (Math.random() < this.data.flowerProbability) {
                const flowerHeight = 0.9 + Math.random() * 0.1;
                createFlower(0, flowerHeight, 0, Math.random() * Math.PI * 2);
            }
        };

        // Create the plant
        createPlant();

        // Set attributes for combined geometry
        combinedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        combinedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        combinedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        return combinedGeometry;
    },

    populatePlantMeshes: function() {
        const dummy = new THREE.Object3D();
        const chunkOffsetX = this.el.object3D.position.x;
        const chunkOffsetZ = this.el.object3D.position.z;

        for (let i = 0; i < this.data.count; i++) {
            const localX = (Math.random() - 0.5) * this.data.range;
            const localZ = (Math.random() - 0.5) * this.data.range;
            
            const worldX = localX + chunkOffsetX;
            const worldZ = localZ + chunkOffsetZ;
            
            let y;
            try {
                y = getTerrainHeight(worldX, worldZ);
            } catch (e) {
                y = 0;
            }

            const transform = {
                position: new THREE.Vector3(localX, y, localZ),
                rotation: new THREE.Euler(
                    0,
                    Math.random() * Math.PI * 2,
                    0
                ),
                scale: new THREE.Vector3(
                    0.8 + Math.random() * 0.4,
                    0.6 + Math.random() * 0.8,
                    0.8 + Math.random() * 0.4
                )
            };

            this.transforms.push(transform);

            dummy.position.copy(transform.position);
            dummy.rotation.copy(transform.rotation);
            dummy.scale.copy(transform.scale);
            dummy.updateMatrix();
            this.instancedPlants.setMatrixAt(i, dummy.matrix);
        }
        this.instancedPlants.instanceMatrix.needsUpdate = true;
    },

    tick: function(t, dt) {
        this.time += dt * 0.001;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.data.count; i++) {
            const transform = this.transforms[i];

            dummy.position.copy(transform.position);
            dummy.rotation.copy(transform.rotation);
            dummy.scale.copy(transform.scale);

            // Enhanced wind simulation
            const windFrequency = 2;
            const xOffset = transform.position.x * 0.1;
            const zOffset = transform.position.z * 0.1;

            const windAngle = 
                Math.sin(this.time * windFrequency + xOffset) * 
                Math.cos(this.time * windFrequency * 0.7 + zOffset) * 
                this.data.windStrength;

            // More natural turbulence
            const turbulence = 
                Math.sin(this.time * 4 + xOffset * 2) * 
                Math.cos(this.time * 3 + zOffset * 2) * 
                this.data.windTurbulence;

            dummy.rotation.z = windAngle + turbulence;
            dummy.rotation.x = windAngle * 0.3;

            dummy.updateMatrix();
            this.instancedPlants.setMatrixAt(i, dummy.matrix);
        }
        this.instancedPlants.instanceMatrix.needsUpdate = true;
    },

    remove: function() {
        if (this.instancedPlants) {
            this.instancedPlants.geometry.dispose();
            this.instancedPlants.material.dispose();
            this.el.removeObject3D('plants');
        }
    }
});

AFRAME.registerComponent('plant-system-simple', {
    schema: {
        count: { type: 'number', default: 512 },
        range: { type: 'number', default: 88 },
        minHeight: { type: 'number', default: 0.5 },
        maxHeight: { type: 'number', default: 2 },
        windStrength: { type: 'number', default: 0.2 },
        windTurbulence: { type: 'number', default: 0.05 }
    },

    init: function() {
        this.camera = document.querySelector('#player').object3D;
        this.transforms = [];

        const plantGeometry = this.createPlantGeometry();

        // Updated material with better colors and transparency
        const material = new THREE.MeshPhongMaterial({
            color: '#4a8505', // More vibrant green
            side: THREE.DoubleSide,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            shininess: 10
        });

        this.instancedPlants = new THREE.InstancedMesh(
            plantGeometry,
            material,
            this.data.count
        );
        this.el.setObject3D('plants', this.instancedPlants);

        this.populatePlantMeshes();
        this.time = 0;
    },

    createPlantGeometry: function() {
        const combinedGeometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const colors = [];

        // Helper function to create a single blade of grass
        const createBlade = (baseX, baseY, baseZ, height, lean, rotation) => {
            const segments = 4; // Number of segments per blade
            const width = 0.02 + Math.random() * 0.02; // Random width for variety
            
            // Create a curved blade shape
            for (let i = 0; i < segments; i++) {
                const t = i / (segments - 1);
                const segmentHeight = height * t;
                
                // Create a bezier curve effect for natural bending
                const bendX = lean * Math.pow(t, 2);
                const bendZ = (Math.random() - 0.5) * 0.1 * t;
                
                // Calculate positions for the quad vertices
                const segmentWidth = width * (1 - t * 0.7); // Blade gets thinner at the top
                
                // Rotate the blade
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                
                // Add two triangles to create a quad segment
                const points = [
                    // Left bottom
                    [baseX + (bendX - segmentWidth) * cos, baseY + segmentHeight, baseZ + (bendZ - segmentWidth) * sin],
                    // Right bottom
                    [baseX + (bendX + segmentWidth) * cos, baseY + segmentHeight, baseZ + (bendZ + segmentWidth) * sin],
                    // Left top
                    [baseX + (bendX - segmentWidth) * cos, baseY + segmentHeight + height/segments, baseZ + (bendZ - segmentWidth) * sin],
                    // Right top
                    [baseX + (bendX + segmentWidth) * cos, baseY + segmentHeight + height/segments, baseZ + (bendZ + segmentWidth) * sin]
                ];

                // First triangle
                positions.push(...points[0], ...points[1], ...points[2]);
                // Second triangle
                positions.push(...points[1], ...points[3], ...points[2]);

                // Calculate normal
                const normal = [0, 1, 0]; // Simplified normal
                for (let j = 0; j < 6; j++) { // 6 vertices (2 triangles)
                    normals.push(...normal);
                }

                // Add colors with variation
                const greenIntensity = 0.7 + Math.random() * 0.3;
                const baseColor = [
                    0.2 + Math.random() * 0.1,        // Red
                    0.5 + Math.random() * 0.3,        // Green
                    0.1 + Math.random() * 0.1         // Blue
                ];
                
                // Gradient from bottom to top
                const topColor = [
                    baseColor[0] * 1.2,
                    baseColor[1] * 1.2,
                    baseColor[2] * 1.2
                ];
                
                for (let j = 0; j < 6; j++) { // 6 vertices (2 triangles)
                    const color = t < 0.5 ? baseColor : topColor;
                    colors.push(...color);
                }
            }
        };

        // Create multiple blades for each plant
        const createPlant = () => {
            const bladeCount = 3 + Math.floor(Math.random() * 4); // 3-6 blades per plant
            
            for (let i = 0; i < bladeCount; i++) {
                const angle = (i / bladeCount) * Math.PI * 2 + Math.random() * 0.5;
                const radius = 0.02 + Math.random() * 0.03;
                const baseX = Math.cos(angle) * radius;
                const baseZ = Math.sin(angle) * radius;
                const height = 0.3 + Math.random() * 0.3;
                const lean = 0.05 + Math.random() * 0.05;
                
                createBlade(baseX, 0, baseZ, height, lean, angle);
            }
        };

        // Create the plant
        createPlant();

        // Set attributes for combined geometry
        combinedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        combinedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        combinedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        return combinedGeometry;
    },

    populatePlantMeshes: function() {
        const dummy = new THREE.Object3D();
        const chunkOffsetX = this.el.object3D.position.x;
        const chunkOffsetZ = this.el.object3D.position.z;

        for (let i = 0; i < this.data.count; i++) {
            const localX = (Math.random() - 0.5) * this.data.range;
            const localZ = (Math.random() - 0.5) * this.data.range;
            
            const worldX = localX + chunkOffsetX;
            const worldZ = localZ + chunkOffsetZ;
            
            let y;
            try {
                y = getTerrainHeight(worldX, worldZ);
            } catch (e) {
                y = 0;
            }

            const transform = {
                position: new THREE.Vector3(localX, y, localZ),
                rotation: new THREE.Euler(
                    0,
                    Math.random() * Math.PI * 2,
                    0
                ),
                scale: new THREE.Vector3(
                    0.8 + Math.random() * 0.4,
                    0.6 + Math.random() * 0.8,
                    0.8 + Math.random() * 0.4
                )
            };

            this.transforms.push(transform);

            dummy.position.copy(transform.position);
            dummy.rotation.copy(transform.rotation);
            dummy.scale.copy(transform.scale);
            dummy.updateMatrix();
            this.instancedPlants.setMatrixAt(i, dummy.matrix);
        }
        this.instancedPlants.instanceMatrix.needsUpdate = true;
    },

    tick: function(t, dt) {
        this.time += dt * 0.001;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.data.count; i++) {
            const transform = this.transforms[i];

            dummy.position.copy(transform.position);
            dummy.rotation.copy(transform.rotation);
            dummy.scale.copy(transform.scale);

            // Enhanced wind simulation
            const windFrequency = 2;
            const xOffset = transform.position.x * 0.1;
            const zOffset = transform.position.z * 0.1;

            const windAngle = 
                Math.sin(this.time * windFrequency + xOffset) * 
                Math.cos(this.time * windFrequency * 0.7 + zOffset) * 
                this.data.windStrength;

            // More natural turbulence
            const turbulence = 
                Math.sin(this.time * 4 + xOffset * 2) * 
                Math.cos(this.time * 3 + zOffset * 2) * 
                this.data.windTurbulence;

            dummy.rotation.z = windAngle + turbulence;
            dummy.rotation.x = windAngle * 0.3;

            dummy.updateMatrix();
            this.instancedPlants.setMatrixAt(i, dummy.matrix);
        }
        this.instancedPlants.instanceMatrix.needsUpdate = true;
    },

    remove: function() {
        if (this.instancedPlants) {
            this.instancedPlants.geometry.dispose();
            this.instancedPlants.material.dispose();
            this.el.removeObject3D('plants');
        }
    }
});

/*
AFRAME.registerComponent('plant-system', {
    schema: {
        count: { type: 'number', default: 512 },
        range: { type: 'number', default: 88 },
        minHeight: { type: 'number', default: 0.5 },
        maxHeight: { type: 'number', default: 2 },
        windStrength: { type: 'number', default: 0.2 },
        windTurbulence: { type: 'number', default: 0.05 }
    },

    init: function() {
        this.camera = document.querySelector('#player').object3D;
        this.transforms = [];

        // Create a more complex plant geometry 
        const plantGeometry = this.createPlantGeometry();

        // Material for plants
        const material = new THREE.MeshPhongMaterial({
            color: '#556B2F', // Dark olive green
            side: THREE.DoubleSide,
            vertexColors: true
        });

        // Create instanced mesh for plants
        this.instancedPlants = new THREE.InstancedMesh(
            plantGeometry,
            material,
            this.data.count
        );
        this.el.setObject3D('plants', this.instancedPlants);

        this.populatePlantMeshes();
        this.time = 0;
    },

    createPlantGeometry: function() {
        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(
            0.1, // top radius
            0.2, // bottom radius
            1.5, // height
            6    // radial segments
        );

        // Branch and leaf offsets
        const branchOffsets = [
            { x: 0.3, y: 1.2, z: 0.2, rotX: 0.5, rotY: 0.3 },
            { x: -0.3, y: 1.2, z: -0.2, rotX: -0.4, rotY: -0.3 }
        ];

        const leafOffsets = [
            { x: 0.4, y: 1.5, z: 0.3, rotX: 0.5, rotY: 0 },
            { x: -0.4, y: 1.5, z: -0.3, rotX: -0.5, rotY: Math.PI }
        ];

        // Create branches
        const branchGeometry = new THREE.CylinderGeometry(
            0.05, // top radius
            0.1,  // bottom radius
            1,    // height
            4     // radial segments
        );

        // Create leaves
        const leafGeometry = new THREE.ConeGeometry(
            0.3,  // radius
            0.5,  // height
            4     // radial segments
        );

        // Create a buffer geometry to combine meshes
        const combinedGeometry = new THREE.BufferGeometry();
        
        // Arrays to hold all geometries
        const geometries = [trunkGeometry];
        const positions = [];
        const normals = [];
        const colors = [];

        // Add branches and leaves
        [branchGeometry, ...branchOffsets.map(offset => {
            const branchClone = branchGeometry.clone();
            branchClone.translate(offset.x, offset.y, offset.z);
            return branchClone;
        }), leafGeometry, ...leafOffsets.map(offset => {
            const leafClone = leafGeometry.clone();
            leafClone.translate(offset.x, offset.y, offset.z);
            return leafClone;
        })].forEach(geo => geometries.push(geo));

        // Merge geometries
        geometries.forEach(geometry => {
            const posAttr = geometry.attributes.position;
            const normAttr = geometry.attributes.normal;
            
            for (let i = 0; i < posAttr.count; i++) {
                positions.push(
                    posAttr.getX(i),
                    posAttr.getY(i),
                    posAttr.getZ(i)
                );
                
                normals.push(
                    normAttr.getX(i),
                    normAttr.getY(i),
                    normAttr.getZ(i)
                );

                // Add vertex colors
                const y = posAttr.getY(i);
                const intensity = 0.8 + (y / 2) * 0.2;
                colors.push(
                    0.3 * intensity,   // Red
                    0.6 * intensity,   // Green
                    0.3 * intensity    // Blue
                );
            }
        });

        // Set attributes for combined geometry
        combinedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        combinedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        combinedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        return combinedGeometry;
    },

    populatePlantMeshes: function() {
        const dummy = new THREE.Object3D();

        // Get the current entity's position (chunk offset)
        const chunkOffsetX = this.el.object3D.position.x;
        const chunkOffsetZ = this.el.object3D.position.z;

        for (let i = 0; i < this.data.count; i++) {
            // Generate local coordinates within the chunk range
            const localX = (Math.random() - 0.5) * this.data.range;
            const localZ = (Math.random() - 0.5) * this.data.range;
            
            // Calculate world coordinates by adding chunk offset
            const worldX = localX + chunkOffsetX;
            const worldZ = localZ + chunkOffsetZ;
            
            let y;
            try {
                y = getTerrainHeight(worldX, worldZ);
            } catch (e) {
                y = 0;
            }

            const transform = {
                position: new THREE.Vector3(localX, y, localZ),
                rotation: new THREE.Euler(
                    (Math.random() - 0.5) * 0.2,
                    Math.random() * Math.PI * 2,
                    0
                ),
                scale: new THREE.Vector3(
                    0.7 + Math.random() * 0.6,
                    0.8 + Math.random() * 0.4,
                    0.7 + Math.random() * 0.6
                )
            };

            this.transforms.push(transform);

            // Set instance matrix
            dummy.position.copy(transform.position);
            dummy.rotation.copy(transform.rotation);
            dummy.scale.copy(transform.scale);
            dummy.updateMatrix();
            this.instancedPlants.setMatrixAt(i, dummy.matrix);
        }
        this.instancedPlants.instanceMatrix.needsUpdate = true;
    },

    tick: function(t, dt) {
        this.time += dt * 0.001;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.data.count; i++) {
            const transform = this.transforms[i];

            dummy.position.copy(transform.position);
            dummy.rotation.copy(transform.rotation);
            dummy.scale.copy(transform.scale);

            // Wind simulation
            const windFrequency = 2;
            const xOffset = transform.position.x * 0.1;
            const zOffset = transform.position.z * 0.1;

            const windAngle = 
                Math.sin(this.time * windFrequency + xOffset) * 
                Math.cos(this.time * windFrequency + zOffset) * 
                this.data.windStrength;

            // Add turbulence
            const turbulence = 
                Math.sin(this.time * 3 + xOffset) * 
                Math.cos(this.time * 3 + zOffset) * 
                this.data.windTurbulence;

            dummy.rotation.z = windAngle + turbulence;

            dummy.updateMatrix();
            this.instancedPlants.setMatrixAt(i, dummy.matrix);
        }
        this.instancedPlants.instanceMatrix.needsUpdate = true;
    },

    remove: function() {
        // Cleanup instanced plants
        if (this.instancedPlants) {
            this.instancedPlants.geometry.dispose();
            this.instancedPlants.material.dispose();
            this.el.removeObject3D('plants');
        }
    }
});

*/