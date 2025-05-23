import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { sceneConfig } from "../../config";

export function initScene(): THREE.Scene {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(sceneConfig.backgroundColor);
	return scene;
}

export function initCamera(container: HTMLElement): THREE.PerspectiveCamera {
	const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
	camera.position.set(0, 8, 16);
	camera.aspect = container.clientWidth / container.clientHeight;
	camera.updateProjectionMatrix();
	return camera;
}

export function initRenderer(container: HTMLElement): THREE.WebGLRenderer {
	const renderer = new THREE.WebGLRenderer({
		antialias: true,
	});
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setSize(container.clientWidth, container.clientHeight);
	return renderer;
}

export function initOrbitControls(
	camera: THREE.PerspectiveCamera,
	renderer: THREE.WebGLRenderer
): OrbitControls {
	const orbitControls = new OrbitControls(camera, renderer.domElement);
	orbitControls.enableDamping = true;
	orbitControls.dampingFactor = 0.1;
	orbitControls.enablePan = false;
	orbitControls.minDistance = 2;
	orbitControls.maxDistance = 30;
	orbitControls.target.set(0, 0.5, 0); // Look at character's head/center
	// Limit vertical angle so camera can't go below ground
	orbitControls.minPolarAngle = Math.PI / 6; // 30 deg
	orbitControls.maxPolarAngle = Math.PI / 1.2; // 150 deg
	return orbitControls;
}

export function initAmbientLight(): THREE.AmbientLight {
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	return ambientLight;
}

export function initPointLight(): THREE.PointLight {
	const pointLight = new THREE.PointLight(0xffffff, 1);
	pointLight.position.set(5, 5, 5);
	return pointLight;
}

export function initDirectionalLight(): THREE.DirectionalLight {
	const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
	directionalLight.position.set(5, 10, 5);
	directionalLight.castShadow = true;
	// directionalLight.shadow.mapSize.width = 2048;
	// directionalLight.shadow.mapSize.height = 2048;
	directionalLight.shadow.camera.near = 1;
	directionalLight.shadow.camera.far = 50;
	directionalLight.shadow.camera.left = -15;
	directionalLight.shadow.camera.right = 15;
	directionalLight.shadow.camera.top = 15;
	directionalLight.shadow.camera.bottom = -15;

	return directionalLight;
}

export function styleCanvas(canvas: HTMLCanvasElement): void {
	canvas.style.position = "absolute";
	canvas.style.top = "0";
	canvas.style.left = "0";
	canvas.style.width = "100%";
	canvas.style.height = "100%";
}
