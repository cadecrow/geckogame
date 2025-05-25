import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { Entity, type EntityAnimationMap, type EntityId } from "../core/ec-s/Entity";
import {
	createModelLoader,
	tryAsyncLoadModel,
	tryResolveAnimationActions,
} from "./loaderHelpers";
import type { AnimationResolver } from "./loaderHelpers";
import { getTrimeshBodyAndColliders } from "../core/utils/physicsUtils";
import { EVENT, EventSystem } from "../core/events/EventBus";

// Definitions for entity
const MODEL_PATH: string = "/models/ships/starship.glb";
const ENTITY_ID: EntityId = "starship";
const ANIMATION_RESOLVERS: AnimationResolver[] = [];

export class Starship extends Entity {
	private events: EventSystem;
	public model: THREE.Group;
	// Character model
	public mixer: THREE.AnimationMixer;
	public animationActions: EntityAnimationMap;
	// physics descriptions
	public rbDesc: RAPIER.RigidBodyDesc;
	public collidersDesc: RAPIER.ColliderDesc[];

	constructor(events: EventSystem) {
		super(ENTITY_ID);
		this.events = events;
		this.model = new THREE.Group(); // Temporary empty group
		this.mixer = new THREE.AnimationMixer(this.model);
		this.animationActions = new Map();

		// Initialize physics attributes
		const { rbDesc, collidersDesc } = this.initializePhysicsAttributes(
			this.model
		);
		this.rbDesc = rbDesc;
		this.collidersDesc = collidersDesc;

		// Load the model asynchronously
		this.loadModel();
	}

	private async loadModel(): Promise<void> {
		const modelLoader = createModelLoader();
		try {
			const { model, mixer, animations } = await tryAsyncLoadModel(
				modelLoader,
				MODEL_PATH
			);

			this.model = model;
			this.mixer = mixer;

			this.animationActions = tryResolveAnimationActions(
				ANIMATION_RESOLVERS,
				mixer,
				animations
			);

			// Emit event that model is loaded
			this.events.emit(EVENT.ENTITY_MODEL_LOAD_SUCCESS, {
				entityId: this.id,
				model: this.model,
				animations,
			});
		} catch (error) {
			console.error("Failed to load starship model:", error);
			this.events.emit(EVENT.ENTITY_MODEL_LOAD_ERROR, {
				entityId: this.id,
				error: error as Error,
			});
		}
	}

	private initializePhysicsAttributes(model: THREE.Object3D): {
		rbDesc: RAPIER.RigidBodyDesc;
		collidersDesc: RAPIER.ColliderDesc[];
	} {
		const { rbDesc, collidersDesc } = getTrimeshBodyAndColliders(model);
		return { rbDesc, collidersDesc };
	}
}
