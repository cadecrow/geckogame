import * as THREE from "three";
import {
	type GLTF,
	GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const DRACO_PATH = "/draco/";

export function createModelLoader(draco: boolean = true): GLTFLoader {
	const gltfLoader = new GLTFLoader();
	if (draco) {
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath(DRACO_PATH);
		gltfLoader.setDRACOLoader(dracoLoader);
	}
	return gltfLoader;
}

export async function tryAsyncLoadModel(
	modelLoader: GLTFLoader,
	modelPath: string,
	onLoad?: (gltf: GLTF) => {
		model: THREE.Group;
		mixer: THREE.AnimationMixer;
		animations: THREE.AnimationClip[];
	},
	onProgress?: (progress: ProgressEvent) => void,
	onError?: (error: Error | unknown) => void
): Promise<{
	model: THREE.Group;
	mixer: THREE.AnimationMixer;
	animations: THREE.AnimationClip[];
}> {
	return new Promise((resolve, reject) => {
		modelLoader.load(
			modelPath,
			(gltf) => {
				if (onLoad) {
					const { model, mixer, animations } = onLoad(gltf);
					resolve({ model, mixer, animations });
				} else {
					const { model, mixer, animations } = defaultOnLoad(gltf);
					resolve({ model, mixer, animations });
				}
			},
			(progress) => {
				if (onProgress) {
					onProgress(progress);
				} else {
					console.log(
						"Loading model " + modelPath + ":",
						(progress.loaded / progress.total) * 100,
						"%"
					);
				}
			},
			(error) => {
				if (onError) {
					onError(error);
				} else {
					console.error("Error loading model" + modelPath + ":", error);
				}
				reject(error);
			}
		);
	});
}

export function defaultOnLoad(gltf: GLTF): {
	model: THREE.Group;
	mixer: THREE.AnimationMixer;
	animations: THREE.AnimationClip[];
} {
	const model = gltf.scene;
	model.position.set(0, 0, 0);
	model.scale.set(1, 1, 1);
	const mixer = new THREE.AnimationMixer(model);
	const animations: THREE.AnimationClip[] = [];

	if (gltf.animations && gltf.animations.length > 0) {
		console.log(
			"available animations:",
			gltf.animations.map((a) => a.name)
		);
		animations.push(...gltf.animations);
	} else {
		console.warn("No animations found in model");
	}

	return { model, mixer, animations };
}

// --- Animations ---

export type AnimationResolver = {
	intendedName: string;
	potentialNames: string[];
	actionCallback?: (action: THREE.AnimationAction) => void;
};

export type EntityAnimationMap = Map<string, THREE.AnimationAction>;

export function tryResolveAnimationActions(
	animationResolvers: AnimationResolver[],
	mixer: THREE.AnimationMixer,
	animationClips: THREE.AnimationClip[],
	errorOnMissing: boolean = false
): EntityAnimationMap {
	const actions: EntityAnimationMap = new Map();
	for (const {
		intendedName,
		potentialNames,
		actionCallback,
	} of animationResolvers) {
		for (const name of potentialNames) {
			const animation = animationClips.find(
				(a) => a.name.toLowerCase() === name.toLowerCase()
			);
			if (animation) {
				const action = mixer.clipAction(animation);
				if (actionCallback) {
					actionCallback(action);
				} else {
					action.setLoop(THREE.LoopRepeat, Infinity);
					action.stop();
				}
				actions.set(intendedName, action);
				break;
			} else {
				if (errorOnMissing) {
					throw new Error(`Animation ${intendedName} not found`);
				} else {
					console.warn(
						`Animation ${intendedName} not found. Using empty animation.`
					);
					actions.set(
						intendedName,
						mixer.clipAction(new THREE.AnimationClip())
					);
				}
			}
		}
	}
	return actions;
}
