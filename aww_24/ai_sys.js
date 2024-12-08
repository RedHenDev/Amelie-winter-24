AFRAME.registerComponent('ai-locomotion', {
    schema: {
        speed: {type: 'number', default: 0.6},
        height: {type: 'number', default: 0.6},
        wiggle: {type: 'boolean', default: true},
        flee: {type: 'boolean', default: true},
        target: {type: 'string', default: '#baby2'},
        aidrive: {type: 'boolean', default: false}

    },

    init: function() {
        this.rig = this.el.object3D;
        this.target = document.querySelector(this.data.target).object3D;
    },

    turn: function() {
        this.rig.lookAt(this.target);
    },

    tick: function(time, delta) {
        
        if (!delta) return;
        delta = delta * 0.001; // Convert to seconds.
        
        // Experiment. Can we move the armadillo?
        const radCon = Math.PI / 180;
        
        const mx = this.rig.position.x;
        const mz = this.rig.position.z;
        const my = getTerrainHeight(mx,mz);
        this.rig.position.y = my+this.data.height;

        if (this.data.aidrive){
            this.turn();
        }

        if (this.data.flee){
            this.rig.position.x -= 
                Math.sin(this.rig.rotation.y)*this.data.speed * delta;
            this.rig.position.z -= 
                Math.cos(this.rig.rotation.y)*this.data.speed * delta;
        } else {
            this.rig.position.x += 
                Math.sin(this.rig.rotation.y)*this.data.speed * delta;
            this.rig.position.z += 
                Math.cos(this.rig.rotation.y)*this.data.speed * delta;
        }

        if (!this.data.wiggle) return;
        // Wiggle?
        this.rig.rotation.z = Math.sin((Math.abs(this.rig.position.z) + 
                            Math.abs(this.rig.position.x)) *8) * 0.16;

    }
});