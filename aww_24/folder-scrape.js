async function loadLocalImageFiles() {
    try {
        // Get the current script's path
        //const scriptPath = document.currentScript.src;
        const scriptPath="./";
        const baseUrl = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);

        // Attempt to fetch the directory listing.
        const response = await fetch(baseUrl);
        const text = await response.text();

        // Use a simple regex to extract href links.
        const fileLinks = text.match(/href="([^"]*\.(jpg|jpeg|png|gif|webp))"/gi);

        if (fileLinks) {
            return fileLinks.map(link => 
                link.match(/href="([^"]*)"/i)[1]
            ).filter(filename => 
                /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
            );
        }

        return [];
    } catch (error) {
        console.error('Error loading local image files:', error);
        return [];
    }
}

// Usage in A-Frame.
async function setupImageAssets() {
    const imageFiles = await loadLocalImageFiles();
    const scene = document.querySelector('a-scene');
    const assets = document.createElement('a-assets');

    console.log('scrape complete...' + ' ' + imageFiles.length + ' files scarped.');
    
    imageFiles.forEach(file => {
        const img = document.createElement('img');
        img.id = file.split('.')[0];
        img.src = file;
        assets.appendChild(img);

        console.log('generating image...');

        // Optional: create planes for the images
        const plane = document.createElement('a-plane');
        plane.setAttribute('src', `#${img.id}`);
        plane.setAttribute('position', `${Math.random() * 100 - 50} 
                                        ${Math.random() * 200}
                                        ${Math.random() * 100 - 50}`);
        plane.setAttribute('rotation', `0 ${Math.random() * 359} 0`);
        plane.setAttribute('width', '200');
        plane.setAttribute('height', '200');
        plane.setAttribute('material', 'side: double');
        plane.setAttribute('crossorigin', 'local');
        scene.appendChild(plane);
    });

    scene.appendChild(assets);
}

// Run when scene is loaded.
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.addEventListener('loaded', setupImageAssets);
    }
});