/* ----------------------------------------------------------
WebGL App, Vytautas Magnus University, faculty of Informatics
---------------------------------------------------------- */

// Import modules
import * as THREE from 'three';
import Stats from 'addons/libs/stats.module.js';
import { OrbitControls } from 'addons/controls/OrbitControls.js';
import { Water } from 'addons/objects/Water2.js';   // lib for water effect
import { GUI } from 'addons/libs/lil-gui.module.min.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';

// Global variables
const mainContainer = document.getElementById('webgl-scene');
const fpsContainer = document.getElementById('fps');
let stats = null;
let scene, camera, renderer = null;
let camControls = null;
let dirLight, spotLight, ambientLight = null;
let plane, box, sphere, wheel = null;
let water, cloud = null;

// Create animation group - pivot
let wheelGroup = new THREE.Group();

// Scene creation
function createScene() {
    scene = new THREE.Scene();

    // Load 6 sides of the skybox
    const loader = new THREE.CubeTextureLoader();
    const skyboxTexture = loader.load([
        './textures/skybox/px.png', // right
        './textures/skybox/nx.png', // left
        './textures/skybox/py.png', // top
        './textures/skybox/ny.png', // bottom
        './textures/skybox/pz.png', // front
        './textures/skybox/nz.png'  // back
    ]);

    // Set as the background for the entire scene
    skyboxTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyboxTexture;

    // You can add a slight fog for depth
    scene.fog = new THREE.Fog(0xcce0ff, 50, 300);
}

// FPS counter
function createStats(){
    stats = new Stats();
    stats.showPanel( 0 );   // 0: fps, 1: ms, 2: mb, 3+: custom
    fpsContainer.appendChild( stats.dom );
}

// Camera
function createPerspectiveCamera(){
    const fov = 45;
    const aspect =  mainContainer.clientWidth / mainContainer.clientHeight;
    const near = 0.1;
    const far = 500;    // meters
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    camera.position.x = 10;
    camera.position.y = 20;
    camera.position.z = 50;
    camera.lookAt(scene.position);
}

// Interactive controls
function createControls(){
    camControls = new OrbitControls(camera, mainContainer);
    camControls.autoRotate = false;

    camControls.target.set( 0, 2, 0 );
    camControls.maxPolarAngle = THREE.MathUtils.degToRad( 90 );
    camControls.maxDistance = 80;
    camControls.minDistance = 20;
    // camControls.enablePan = false;
    camControls.update();  
}

function createDirectionalLight() {
    dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(-40, 60, 40);
    dirLight.castShadow = true;

    // Key shadow parameters
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;

    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;

    // To make shadows soft
    dirLight.shadow.radius = 4;

    scene.add(dirLight);

    // Shadow area visualizer (for debugging)
    // const helper = new THREE.CameraHelper(dirLight.shadow.camera);
    // scene.add(helper);
}

// Create spot - lamp light
function createSpotLight(){
    spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.position.set( -15, 25, 10 );
    // lighting params
    spotLight.intensity = 5;
    spotLight.distance = 50;
    spotLight.angle = Math.PI/4;
    spotLight.penumbra = 0.4;   // 0 - 1
    spotLight.decay = 0.2;      // how quickly light dimishes
    // Makes the shadows with less blurry edges
    spotLight.shadow.mapSize.width = 1024; // default 512
    spotLight.shadow.mapSize.height = 1024; //default 512
    // enable shadows for light source
    spotLight.castShadow = true;
    scene.add( spotLight );
    // set light target to sphere
    if(sphere != null){
        spotLight.target = sphere;
        spotLight.target.updateMatrixWorld();
    }

    // adds helping lines
    // const spotLightHelper = new THREE.SpotLightHelper( spotLight, 0xcc0000 );
    // scene.add( spotLightHelper );    
}

// Create ambient light
function createAmbientLight(){
    // If you want to make the whole scene lighter or add some mood, usually it should be some grey tone
    ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 ); // 0x111111 - 0xaaaaaa, 1 ; 0xffffff, 0.1 - 0.3; 0x404040
    scene.add( ambientLight );
}

function createAxes(){
    const axes = new THREE.AxesHelper( 10 );
    scene.add(axes);
}

function createPlane(){
    const texture = new THREE.TextureLoader().load( "textures/sea_depth.jpg" );    // load texture
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;    // set anisotropy coef.
    // Set min max texture filters
    // texture.magFilter = THREE.NearestFilter;
    texture.magFilter = THREE.LinearFilter;     // default mag filter
    // texture.minFilter = THREE.NearestFilter;
    // texture.minFilter = THREE.NearestMipMapNearestFilter;
    // texture.minFilter = THREE.NearestMipMapLinearFilter;
    // texture.minFilter = THREE.LinearFilter;
    // texture.minFilter = THREE.LinearMipMapNearestFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;     // default min filter
    // set repeating params
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    // texture.repeat.set(-2, -2); // repeat reversed

    const geometry = new THREE.PlaneGeometry(100,80);
    // const material =  new THREE.MeshLambertMaterial({color: 0xcccccc, side:THREE.DoubleSide});
    const material =  new THREE.MeshStandardMaterial({ map: texture, side:THREE.DoubleSide });  
   
    plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -0.5*Math.PI;
    plane.position.x = 0;
    plane.position.y = 0;
    plane.position.z = 0;
    plane.receiveShadow = true;
    scene.add(plane);  
}

let shore;

function createShore() {
    // Main sand texture
    const texture = new THREE.TextureLoader().load("textures/sand.jpg");
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);

    // Bump map texture
    const bump = new THREE.TextureLoader().load("textures/sand_bump.jpg");
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(1, 4);

    // Geometry — quarter cylinder
    const geometry = new THREE.CylinderGeometry(
        11, 6,   // top/bottom radii
        80,        // height
        2, 4,    // segments around and along height
        false,    // openEnded = false
        0,        // thetaStart
        Math.PI / 2  // thetaLength 
    );

    // Material with bump map
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: bump,
        bumpScale: 5,  // bump map intensity
        color: 0xdeb887, // sandy tone
        roughness: 1,
        metalness: 0.0
    });

    shore = new THREE.Mesh(geometry, material);
    shore.position.set(50, 0, 0);
    shore.rotation.x = -Math.PI / 2;
    shore.rotation.y = -Math.PI / 2;
    shore.castShadow = true;
    shore.receiveShadow = true;

    scene.add(shore);
}



function createPier(){
    const texture = new THREE.TextureLoader().load( "textures/pier_wood.jpg" );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
   
    // Load bump map   
    const bump = new THREE.TextureLoader().load( "textures/pier_wood_bump.jpg" );
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(1, 1);
   
    const geometry = new THREE.BoxGeometry(10,0.75,75);
    const material =  new THREE.MeshStandardMaterial({ map: texture, bumpMap: bump, bumpScale: 10});

    box = new THREE.Mesh(geometry, material);
    box.material.map.wrapS = THREE.RepeatWrapping;
    box.material.map.wrapT = THREE.RepeatWrapping;
    box.material.map.repeat.set(1, 1); // zoom texture

    box.position.x=40;
    box.position.y=2.7;
    box.position.z=0;
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
}


let pierCube1, pierCube2;

function createPierCubes() {
    // Load textures
    const texture = new THREE.TextureLoader().load("textures/pier_wood.jpg");
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 1;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    const bump = new THREE.TextureLoader().load("textures/pier_wood_bump.jpg");
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(1, 1);

    // Material with bump
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: bump,
        bumpScale: 10,
    });

    // Cube geometry
    const geometry = new THREE.BoxGeometry(22, 0.75, 5); // width, height, depth

    // First cube
    pierCube1 = new THREE.Mesh(geometry, material);
    pierCube1.position.set(24, 2.7, -20);  // position
    pierCube1.castShadow = true;
    pierCube1.receiveShadow = true;
    scene.add(pierCube1);

    // Second cube
    pierCube2 = new THREE.Mesh(geometry, material);
    pierCube2.position.set(24, 2.7, 10); // can be shifted along X/Z
    pierCube2.castShadow = true;
    pierCube2.receiveShadow = true;
    scene.add(pierCube2);
}



let pillarCube1, pillarCube2;

function createPillarCubes() {
    // Load textures
    const texture = new THREE.TextureLoader().load("textures/pier_wood.jpg");
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 1;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    const bump = new THREE.TextureLoader().load("textures/pier_wood_bump.jpg");
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(1, 1);

    // Material with bump
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: bump,
        bumpScale: 2,
    });

    // Cube geometry
    const geometry = new THREE.BoxGeometry(1, 5, 1); // width, height, depth

    // First cube
    pillarCube1 = new THREE.Mesh(geometry, material);
    pillarCube1.position.set(15, 2.5, -20);  // position
    pillarCube1.castShadow = true;
    pillarCube1.receiveShadow = true;
    scene.add(pillarCube1);

    // Second cube
    pillarCube2 = new THREE.Mesh(geometry, material);
    pillarCube2.position.set(15, 2.5, 10); // can be shifted along X/Z
    pillarCube2.castShadow = true;
    pillarCube2.receiveShadow = true;
    scene.add(pillarCube2);
}


let boat, boatGroup;
let boatBounceStep = 0;

function loadBoatModel() {
    const loader = new GLTFLoader();
    loader.load(
        './js/jsm/models/boat/boat.gltf',
        function (gltf) {
            boat = gltf.scene;


            // shadow settings for all meshes
            boat.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });


            // scale 
            boat.scale.set(0.9, 0.9, 0.9);

            // starting position
            boat.position.set(19, 1.7, 18);

            // rotation 
            boat.rotation.y = Math.PI / 1.3;

            // creating a group for animation
            boatGroup = new THREE.Group();
            boatGroup.add(boat);
            boatGroup.position.set(0, 1.47, 0); // starting position above the water
            scene.add(boatGroup);
        },
        undefined,
        function (error) {
            console.error('Error loading boat model:', error);
        }
    );
}

let boat2, boatGroup2;

function loadSecondBoat() {
    const loader = new GLTFLoader();
    loader.load(
        './js/jsm/models/boat/boat.gltf', 
        function (gltf) {
            boat2 = gltf.scene;

            // shadow settings for all meshes
            boat2.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            boat2.scale.set(0.9, 0.9, 0.9);

            // rotation
            boat2.rotation.y = Math.PI / 1.6;

            // creating a group for animation
            boatGroup2 = new THREE.Group();
            boatGroup2.add(boat2);

            boatGroup2.position.set(28, 1.47, 17); // X offset = 5
            scene.add(boatGroup2);
        },
        undefined,
        function (error) {
            console.error('Error loading second boat:', error);
        }
    );
}






let mountain;

function loadMountain() {
    const loader = new GLTFLoader();
    loader.load(
        './js/jsm/models/mountain/scene.gltf', 
        function (gltf) {
            mountain = gltf.scene;
            mountain.scale.set(5, 5, 5);  // size
            mountain.position.set(-50, 0, -20); // placement
            mountain.rotation.y = Math.PI / 3;  // rotation

            // shadow settings for all meshes
            mountain.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            // mountain.castShadow = true;
            // mountain.receiveShadow = true;
            scene.add(mountain);
            console.log("Mountain successfully loaded!");
        },
        undefined,
        function (error) {
            console.error("Error loading mountain model:", error);
        }
    );
}

let deadship;
function loadDeadShip() {
    const loader = new GLTFLoader();
    loader.load(
        './js/jsm/models/deadship/scene.gltf', // path to your model
        function (gltf) {
            deadship = gltf.scene;
            deadship.scale.set(4, 4, 4);  // adjust size to the scene
            deadship.position.set(-40, 1, -3); // where the ghost ship will stand
            deadship.rotation.y = Math.PI / 1.8;  // rotate if necessary

            // shadow settings for all meshes
            deadship.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            scene.add(deadship);
            console.log("Ghost ship successfully loaded!");
        },
        undefined,
        function (error) {
            console.error("Error loading ghost ship model:", error);
        }
    );
}

let yacht, yachtGroup;
let yachtOrbitStep = 0;

function loadYachtModel() {
    const loader = new GLTFLoader();
    loader.load(
        './js/jsm/models/ship/scene.gltf', // path to the model
        function (gltf) {
            yacht = gltf.scene;

            // shadow settings for all meshes
            yacht.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // scale to the scene
            yacht.scale.set(5.6, 5.6, 5.6);



            // create a group for animation
            yachtGroup = new THREE.Group();
            yachtGroup.add(yacht);

            // initial position at the orbit center
            yachtGroup.position.set(0, 1.5, 0);
            // if the model requires initial rotation
            yacht.rotation.y = Math.PI / 2;

            scene.add(yachtGroup);
            console.log("Yacht successfully loaded!");
        },
        undefined,
        function (error) {
            console.error("Error loading yacht model:", error);
        }
    );
}

// Creates water effect
function createWater(){
    const waterGeometry = new THREE.PlaneGeometry( 100, 80 );
    // flow direction - x, y
    water = new Water( waterGeometry, {
        color: 0xAFDCE0,
        scale: 4,
        flowDirection: new THREE.Vector2( 0.6, 0.6 ),
        textureWidth: 1024,
        textureHeight: 1024
    } );
    water.position.y = 2;
    water.rotation.x = -0.5 * Math.PI;
    scene.add( water );
}

function createShadowCatcher() {
    const geometry = new THREE.PlaneGeometry(200, 200);
    const material = new THREE.ShadowMaterial({
        opacity: 0.3 // shadow opacity
    });

    const shadowPlane = new THREE.Mesh(geometry, material);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 1.9; 
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);
}



// Create sprite
let clouds = []; 

function createClouds(count = 6) {
    const cloudTexture = new THREE.TextureLoader().load("textures/cloud.png");
    cloudTexture.colorSpace = THREE.SRGBColorSpace;

    for (let i = 0; i < count; i++) {
        const cloudMaterial = new THREE.SpriteMaterial({ map: cloudTexture, color: 0xffffff });
        const cloud = new THREE.Sprite(cloudMaterial);

        // Assign direction via .userData
        // The first half (i < count / 2) goes right (1), the second half goes left (-1).
        cloud.userData.direction = (i < count / 2) ? 1 : -1; 
        
        // random cloud size
        const scaleX = 10 + Math.random() * 15;
        const scaleY = 5 + Math.random() * 10;
        cloud.scale.set(scaleX, scaleY, 1);

        // random position
        let initialX = (cloud.userData.direction === 1) 
            ? -50 + Math.random() * 50 // Starts on the left
            : 0 + Math.random() * 50;  // Starts on the right

        cloud.position.set(
            initialX, 
            15 + Math.random() * 10,  
            -40 + Math.random() * 80 
        );

        cloud.renderOrder = 1;  
        clouds.push(cloud);
        scene.add(cloud);
    }
}

// Renderer object and features
function createRenderer(){
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(mainContainer.clientWidth, mainContainer.clientHeight);
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // THREE.BasicShadowMap | THREE.PCFShadowMap | THREE.PCFSoftShadowMap
    mainContainer.appendChild( renderer.domElement );
}

// Animation variables
const timer = new THREE.Timer();
let moveStep = 0;
let rotateStep = 0;
let bounceStep = 0;
let cameraStep = 0;

// control menu params
let menu = new GUI();
let menuParams = {
    boatBounceSpeed: 1,       // boat bounce speed
    cloudSpeed: 0.5,          // cloud movement speed
    yachtOrbitSpeed: 0.2,     // yacht movement speed
    mountainScale: 5,         // mountain scale
    yachtOrbitRadiusX: 16,    // orbit radius on X
    yachtOrbitRadiusZ: 30,    // orbit radius on Z
    yachtOrbitCenterX: -9,     // orbit center X
    yachtOrbitCenterZ: 0      // orbit center Z
};


// create control menuя
function createMenu() {
    // Parameters that need continuous reading
    menu.add(menuParams, 'boatBounceSpeed').min(0).max(5).step(0.5).name('Boat bounce speed');
    menu.add(menuParams, 'cloudSpeed').min(0).max(10).step(1).name('Cloud speed');
    menu.add(menuParams, 'yachtOrbitSpeed').min(0).max(5).step(0.2).name('Yacht speed');
    menu.add(menuParams, 'yachtOrbitRadiusX').min(5).max(50).step(1).name('Yacht orbit X');
    menu.add(menuParams, 'yachtOrbitRadiusZ').min(5).max(50).step(1).name('Yacht orbit Z');
    menu.add(menuParams, 'mountainScale').min(0.5).max(10).step(1).name('Mountain scale');

    // Parameters with onChange (update yacht orbit center only when changed)
    menu.add(menuParams, 'yachtOrbitCenterX').min(-50).max(50).step(1).name('Yacht center X')
        .onChange(value => {
            if (yachtGroup) {
                yachtGroup.position.x = value + menuParams.yachtOrbitRadiusX * Math.cos(yachtOrbitStep);
            }
        });

    menu.add(menuParams, 'yachtOrbitCenterZ').min(-50).max(50).step(1).name('Yacht center Z')
        .onChange(value => {
            if (yachtGroup) {
                yachtGroup.position.z = value + menuParams.yachtOrbitRadiusZ * Math.sin(yachtOrbitStep);
            }
        });
}

// Animations
function update() {
    timer.update();
    const delta = timer.getDelta();

    // First boat animation
    if (boat) {
        bounceStep += delta * menuParams.boatBounceSpeed;
        boat.position.y = 0.2 + 0.2 * Math.abs(Math.sin(bounceStep));
    }


    // Second boat animation
    if (boat2) {
        boatBounceStep += delta * menuParams.boatBounceSpeed;
        boat2.position.y = 0.2 + 0.2 * Math.abs(Math.sin(boatBounceStep));
    }


    // Mountain scaling
if (mountain) {
        mountain.scale.set(
            menuParams.mountainScale, 
            menuParams.mountainScale, 
            menuParams.mountainScale
        );
    }


// Cloud animation (with two directions)

    clouds.forEach(cloud => {
        const direction = cloud.userData.direction;

        // Movement: speed * delta * direction
        cloud.position.x += menuParams.cloudSpeed * delta * direction;
        
        // Looping logic (respawn on the opposite side)
        if (direction > 0) { // Cloud moves to the right
            if (cloud.position.x > 50) cloud.position.x = -50;
        } else { // Cloud moves to the left
            if (cloud.position.x < -50) cloud.position.x = 50;
        }
    });


    // Yacht elliptical orbit animation

if (yachtGroup) {
    yachtOrbitStep += delta * menuParams.yachtOrbitSpeed;

    const a = menuParams.yachtOrbitRadiusX;
    const b = menuParams.yachtOrbitRadiusZ;
    const cx = menuParams.yachtOrbitCenterX;
    const cz = menuParams.yachtOrbitCenterZ;

    // ellipse relative to the center
    yachtGroup.position.x = cx + a * Math.cos(yachtOrbitStep);
    yachtGroup.position.z = cz + b * Math.sin(yachtOrbitStep);

    // direction angle
    const dx = a * Math.sin(yachtOrbitStep);
    const dz = b * Math.cos(yachtOrbitStep);
    yacht.rotation.y = Math.atan2(dz, dx);
}


}


function init(){
    // https://threejs.org/docs/index.html#manual/en/introduction/Color-management
    THREE.ColorManagement.enabled = true;
   
    // Create scene
    createScene();

    // FPS counter
    createStats();
   
    // Create camera:
    createPerspectiveCamera();
   
    // Create interactive controls:
    createControls();
   
    // Create lights:
    createDirectionalLight();
    // createSpotLight();
    createAmbientLight();
   
    // Create meshes and other visible objects:
    // createAxes(); // add axes (red – x, green – y, blue - z)
    createPlane();

    createPier();

    createPierCubes();

    createPillarCubes();

    loadMountain();

    createShore();

    loadDeadShip();

    loadYachtModel();

    loadBoatModel();

    loadSecondBoat();
    // createBall();
    // createWheel();

    createWater();
    createShadowCatcher();

    createClouds(6); // create 6 clouds
 
    createMenu();

    // Render elements
    createRenderer();

    // Create animations
    renderer.setAnimationLoop( () => {
        update();
        stats.begin();
        renderer.render( scene, camera );
        stats.end();
    });
}

init();

// Auto resize window
window.addEventListener('resize', e => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
});