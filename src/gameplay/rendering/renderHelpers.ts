import * as THREE from "three";

export async function asyncAddModelToScene(
	model: THREE.Object3D,
	scene: THREE.Scene,
	renderer: THREE.WebGLRenderer,
	camera: THREE.Camera
): Promise<void> {
	const target = scene.clone();
	target.add(model);
	await renderer.compileAsync(scene, camera, target);
	scene.add(target);
}
