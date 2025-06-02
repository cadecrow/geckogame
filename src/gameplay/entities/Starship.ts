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
import { getTrimeshBodyAndColliders } from "../core/utils/physicsUtils";
import {
	createModelLoader,
	tryLoadModel,
} from "../core/utils/modelLoaderUtils";

// Definitions for entity
const MODEL_PATH: string = "/models/ships/starship.glb";
const ENTITY_ID: EntityId = "starship";

export class Starship
	extends Entity
	implements IRenderableEntity, IPhysicsEntity
{
	public readonly group: THREE.Group = new THREE.Group();
	public readonly rigidBodies: RAPIER.RigidBody[] = [];
	public readonly colliders: RAPIER.Collider[] = [];

	private rbDesc: RAPIER.RigidBodyDesc | undefined;
	private collidersDesc: RAPIER.ColliderDesc[] | undefined;

	constructor(
		events: EventBus,
		model: THREE.Group,
		rbDesc: RAPIER.RigidBodyDesc,
		collidersDesc: RAPIER.ColliderDesc[]
	) {
		super(events, ENTITY_ID);
		this.group.add(model);
		this.rbDesc = rbDesc;
		this.collidersDesc = collidersDesc;
		this.addComponent(new RenderingComponent(this));
		this.addComponent(new PhysicsComponent(this));
		// be sure to prepare all necessary data for initialization to avoid race conditions in initialization
	}

	static async create(events: EventBus): Promise<Starship> {
		// @todo Show loading spinner or placeholder

		// Load model asynchronously
		let { model } = await loadModel();
		if (!model) {
			// throw new Error("Failed to load starship model");
			const mesh = new THREE.Mesh(
				new THREE.BoxGeometry(1, 1, 1),
				new THREE.MeshBasicMaterial({ color: 0x804080 })
			);
			model = new THREE.Group().add(mesh);
		}

		// Initialize physics attributes
		const { rbDesc, collidersDesc } = initializePhysicsAttributes(model);

		const starship = new Starship(events, model, rbDesc, collidersDesc);
		return starship;
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
						const collider = rapierWorld.createCollider(colliderDesc, rb);
						this.colliders.push(collider);
					}
				}
			} else {
				console.warn(
					"Starship physics initialization skipped due to missing descriptions"
				);
			}
		} catch (error) {
			console.error("Failed to initialize physics for Starship:", error);
			// Create a fallback simple box collider if physics initialization fails
			try {
				const fallbackRb = rapierWorld.createRigidBody(
					RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0)
				);
				this.rigidBodies.push(fallbackRb);

				const fallbackCollider = rapierWorld.createCollider(
					RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5),
					fallbackRb
				);
				this.colliders.push(fallbackCollider);
				console.log("Created fallback physics for Starship");
			} catch (fallbackError) {
				console.error(
					"Failed to create fallback physics for Starship:",
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

function initializePhysicsAttributes(object: THREE.Object3D): {
	rbDesc: RAPIER.RigidBodyDesc;
	collidersDesc: RAPIER.ColliderDesc[];
} {
	const { rbDesc, collidersDesc } = getTrimeshBodyAndColliders(object);
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
