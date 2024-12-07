AFRAME.registerComponent('ai-locomotion', {
    schema: {
        speed: {type: 'number', default: 0.6},
    },

    init: function() {
        this.rig = this.el.object3D;
    },

    tick: function(time, delta) {
        
        if (!delta) return;
        delta = delta * 0.001; // Convert to seconds.
        
        // Experiment. Can we move the armadillo?
        const radCon = Math.PI / 180;
        
        const mx = this.rig.position.x;
        const mz = this.rig.position.z;
        const my = getTerrainHeight(mx,mz);
        this.rig.position.y = my+0.9;
        this.rig.position.x -= Math.sin(this.rig.rotation.y)*this.data.speed * delta;
        this.rig.position.z -= Math.cos(this.rig.rotation.y)*this.data.speed * delta;

        // Wiggle?
        this.rig.rotation.z = Math.sin((Math.abs(this.rig.position.z) + 
                            Math.abs(this.rig.position.x)) *8) * 0.16;

    }
});