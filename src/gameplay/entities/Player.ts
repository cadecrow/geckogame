import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import type { EventBus } from "../core/events/EventBus";
import { Entity, type EntityId } from "../core/ec-s/Entity";
import {
	RenderingComponent,
	type IRenderableEntity,
} from "../core/rendering/RenderingComponent";
import {
	PhysicsComponent,
	type IPhysicsEntity,
} from "../core/physics/PhysicsComponent";
import {
	createModelLoader,
	tryLoadModel,
} from "../core/utils/modelLoaderUtils";

// Definitions for entity
const MODEL_PATH: string = "/models/robots/Cute_Bot.glb";
const ENTITY_ID: EntityId = "player";

export class Player
	extends Entity
	implements IRenderableEntity, IPhysicsEntity
{
	public readonly group: THREE.Group = new THREE.Group();
	public readonly rigidBodies: RAPIER.RigidBody[] = [];
	public readonly colliders: RAPIER.Collider[] = [];

	private rbDesc: RAPIER.RigidBodyDesc | undefined;
	private collidersDesc: RAPIER.ColliderDesc[] | undefined;

	constructor(events: EventBus) {
		super(events, ENTITY_ID);
		this.addComponent(new RenderingComponent(this));
		this.addComponent(new PhysicsComponent(this));
		// be sure to prepare all necessary data for initialization to avoid race conditions in initialization
	}

	static async create(events: EventBus): Promise<Player> {
		const player = new Player(events);

		// @todo Show loading spinner or placeholder

		// Load model asynchronously
		const { model } = await loadModel();
		// const { model, mixer, animations } = await loadModel();
		if (model) {
			player.group.add(model);
		} else {
			// throw new Error("Failed to load starship model");
			player.group.add(
				new THREE.Mesh(
					new THREE.BoxGeometry(1, 1, 1),
					new THREE.MeshBasicMaterial({ color: 0x804080 })
				)
			);
		}

		// Initialize physics attributes
		const { rbDesc, collidersDesc } = initializePhysicsAttributes();
		player.rbDesc = rbDesc;
		player.collidersDesc = collidersDesc;

		return player;
	}

	public initRendering(scene: THREE.Scene): void {
		scene.add(this.group);
	}

	public initPhysics(rapierWorld: RAPIER.World): void {
		try {
			if (this.rbDesc && this.collidersDesc && this.collidersDesc.length > 0) {
				const rb = rapierWorld.createRigidBody(this.rbDesc);
				this.rigidBodies.push(rb);
				for (const colliderDesc of this.collidersDesc) {
					if (colliderDesc) {
						const collider = rapierWorld.createCollider(colliderDesc);
						this.colliders.push(collider);
					}
				}
			} else {
				console.warn(
					"Player physics initialization skipped due to missing descriptions"
				);
			}
		} catch (error) {
			console.error("Failed to initialize physics for Player:", error);
			// Create a fallback simple collider if physics initialization fails
			try {
				const fallbackRb = rapierWorld.createRigidBody(
					RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 5, 0)
				);
				this.rigidBodies.push(fallbackRb);

				const fallbackCollider = rapierWorld.createCollider(
					RAPIER.ColliderDesc.capsule(0.5, 0.5)
				);
				this.colliders.push(fallbackCollider);
				console.log("Created fallback physics for Player");
			} catch (fallbackError) {
				console.error(
					"Failed to create fallback physics for Player:",
					fallbackError
				);
			}
		}
	}

	// no updates for this entity
	public updatePhysics(): void {
		return;
	}
	// no updates for this entity
	public updateRendering(): void {
		return;
	}

	public disposePhysics(rapierWorld: RAPIER.World): void {
		for (const rb of this.rigidBodies) {
			rapierWorld.removeRigidBody(rb);
		}
	}
	public disposeRendering(
		scene: THREE.Scene,
		camera: THREE.PerspectiveCamera
	): void {
		scene.remove(this.group);
		camera.remove(this.group);
	}
}

function initializePhysicsAttributes(): {
	rbDesc: RAPIER.RigidBodyDesc;
	collidersDesc: RAPIER.ColliderDesc[];
} {
	const rbDesc = RAPIER.RigidBodyDesc.dynamic()
		.setTranslation(0, 5, 0)
		.setLinearDamping(0.2)
		.setAngularDamping(10.0)
		.setCcdEnabled(true);
	const collidersDesc = [
		RAPIER.ColliderDesc.capsule(0.5, 0.5)
			.setTranslation(0, 0.5, 0)
			.setMass(1.0)
			.setRestitution(0.1)
			.setFriction(0.5),
	];
	return { rbDesc, collidersDesc };
}

async function loadModel(): Promise<{
	model: THREE.Group | undefined;
	mixer: THREE.AnimationMixer | undefined;
	animations: THREE.AnimationClip[] | undefined;
}> {
	const modelLoader = createModelLoader();
	try {
		const { model, mixer, animations } = await tryLoadModel(
			modelLoader,
			MODEL_PATH
		);

		return { model, mixer, animations };
	} catch (error) {
		console.error("Failed to load starship model:", error);
		return { model: undefined, mixer: undefined, animations: undefined };
	}
}
