import * as THREE from "three";
import type { EventBus } from "../core/events/EventBus";
import { Entity, type EntityId } from "../core/ec-s/Entity";
import {
	RenderingComponent,
	type IRenderableEntity,
} from "../core/rendering/RenderingComponent";
import {
	createModelLoader,
	tryLoadModel,
} from "../core/utils/modelLoaderUtils";

// Definitions for entity
const MODEL_PATH: string = "/models/robots/Cute_Bot.glb";
const ENTITY_ID: EntityId = "ghost_player";

export class GhostPlayer extends Entity implements IRenderableEntity {
	public readonly group: THREE.Group = new THREE.Group();

	constructor(events: EventBus) {
		super(events, ENTITY_ID);
		this.addComponent(new RenderingComponent(this));
		this.initEventListeners();
	}

	static async create(events: EventBus): Promise<GhostPlayer> {
		console.log("Player: Creating new ghostPlayer instance");
		const ghostPlayer = new GhostPlayer(events);

		// Load model asynchronously
		console.log("Player: Loading model and animations");
		const { model } = await loadModel();
		if (model) {
			console.log("Player: Model loaded successfully, adding to group");
			ghostPlayer.group.add(model);
		} else {
			console.log("Player: Model failed to load, using fallback placeholder");
			// Fallback placeholder
			ghostPlayer.group.add(
				new THREE.Mesh(
					new THREE.BoxGeometry(1, 1, 1),
					new THREE.MeshBasicMaterial({ color: 0x804080 })
				)
			);
		}

		console.log("Ghost Player: Ghost Player creation complete");

		return ghostPlayer;
	}

	private initEventListeners(): void {
		console.log("GhostPlayer: Initializing event listeners");
	}

	public initRendering(scene: THREE.Scene): void {
		console.log("Player: Initializing rendering, adding group to scene");
		scene.add(this.group);
		console.log("Player: Group added to scene successfully");
	}

	public updateRendering(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_deltaTime: number,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_scene: THREE.Scene,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_camera: THREE.PerspectiveCamera,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_renderer: THREE.WebGLRenderer
	): void {
		// @todo Sync rendering position with pointer
		// @todo update facing direction based on normal vector to surface
	}

	public disposeRendering(
		scene: THREE.Scene,
		camera: THREE.PerspectiveCamera
	): void {
		scene.remove(this.group);
		camera.remove(this.group);
	}
}

async function loadModel(): Promise<{
	model: THREE.Group | undefined;
}> {
	const modelLoader = createModelLoader();
	try {
		const { model } = await tryLoadModel(modelLoader, MODEL_PATH);

		return { model };
	} catch (error) {
		console.error("Failed to load ghostPlayer model:", error);
		return { model: undefined };
	}
}
