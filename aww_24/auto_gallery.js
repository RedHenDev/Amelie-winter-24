// For use with A-Frame.
function autoGalleryGo() {
    const imageFiles = ['drawing_1.jpg','moon_1.jpg','aww_24.png'];
    const scene = document.querySelector('a-scene');
    const assets = document.createElement('a-assets');

    console.log('auto img complete...' + ' ' + imageFiles.length + ' files built.');
    
    imageFiles.forEach(file => {
        const img = document.createElement('img');
        img.id = file.split('.')[0];
        img.src = file;
        img.setAttribute('crossorigin', 'local');
        assets.appendChild(img);

        console.log('generating image object in scene...');

        // Create giant 'gallery' planes for the images.
        const plane = document.createElement('a-plane');
        plane.setAttribute('src', `#${img.id}`);
        plane.setAttribute('position', `${Math.random() * 30 - 15} 
                                        ${Math.random() * 100 + 10}
                                        ${Math.random() * 30 - 15}`);
        plane.setAttribute('rotation', `0 ${Math.random() * 359} 0`);
        plane.setAttribute('width', '10');
        plane.setAttribute('height', '10');
        plane.setAttribute('material', 'side: double');
        scene.appendChild(plane);
    });

    scene.appendChild(assets);
}

// Run when scene is loaded.
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.addEventListener('loaded', autoGalleryGo);
    }
});