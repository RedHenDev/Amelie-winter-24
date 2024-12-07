AFRAME.registerComponent('ai-locomotion', {
    schema: {
        speed: {type: 'number', default: 0.3},
    },

    init: function() {
        this.rig = this.el.object3D;
    },

    tick: function(time, delta) {
        
        if (!delta) return;
        delta = delta * 0.001; // Convert to seconds.
        
        // Experiment. Can we move the armadillo?
        const mx = this.rig.position.x;
        const mz = this.rig.position.z;
        const my = getTerrainHeight(mx,mz);
        this.rig.position.y = my+0.6;
        this.rig.position.z -= this.data.speed * delta;

        // Wiggle?
        const radCon = Math.PI / 180;
        this.rig.rotation.z = Math.sin(radCon*this.rig.position.z*10) * 2;

    }
});