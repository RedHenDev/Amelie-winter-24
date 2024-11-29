AFRAME.registerComponent('toadstool-system', {
    schema: {
        count: { type: 'number', default: 3 },
        range: { type: 'number', default: 204 },
        minHeight: { type: 'number', default: 0.1 },
        maxHeight: { type: 'number', default: 0.4 },
        minRadius: { type: 'number', default: 1 },
        maxRadius: { type: 'number', default: 2.4 },
        canopySize: { type: 'number', default: 8 }
    },

    init: function() {
        this.generateToadstools();
    },

    generateToadstools: function() {
        for (let i = 0; i < this.data.count; i++) {
            const toadstool = this.createToadstool();
            this.el.appendChild(toadstool);
        }
    },

    createToadstool: function() {
        const height = THREE.MathUtils.randFloat(this.data.minHeight, this.data.maxHeight);
        const radius = THREE.MathUtils.randFloat(this.data.minRadius, this.data.maxRadius);
        const canopySize = this.data.canopySize;

        const toadstoolEntity = document.createElement('a-entity');
        
        // Stem - very short and slightly curved
        const stem = document.createElement('a-cylinder');
        stem.setAttribute('color', 'beige');
        stem.setAttribute('height', height);
        stem.setAttribute('radius', radius * 0.6);
        stem.setAttribute('position', `0 ${height/2} 0`);
        stem.setAttribute('curve', '0.1 0 0');  // Slight curve

        // Cap - more rounded and shorter
        const cap = document.createElement('a-sphere');
        cap.setAttribute('color', 'crimson');
        cap.setAttribute('radius', radius);
        cap.setAttribute('position', `0 ${height + radius * 0.6} 0`);
        cap.setAttribute('scale', '1 0.6 1');  // Flatter, rounder shape

        // White spots higher on the cap
        for (let j = 0; j < 6; j++) {
            const spot = document.createElement('a-sphere');
            const spotRadius = radius * 0.1;
            const angle = Math.random() * Math.PI * 2;
            const distance = radius * 0.7 * Math.random();
            
            spot.setAttribute('color', 'white');
            spot.setAttribute('radius', spotRadius);
            spot.setAttribute('position', `${Math.cos(angle) * distance * 1.1} ${radius * 0.75} ${Math.sin(angle) * distance * 1.1}`);
            
            cap.appendChild(spot);
        }

        toadstoolEntity.appendChild(stem);
        toadstoolEntity.appendChild(cap);

        // Randomize position within the given range
        const x = THREE.MathUtils.randFloat(-this.data.range/2, this.data.range/2);
        const z = THREE.MathUtils.randFloat(-this.data.range/2, this.data.range/2);
        toadstoolEntity.setAttribute('position', `${x} -2 ${z}`);

        return toadstoolEntity;
    }
});