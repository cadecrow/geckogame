import * as RAPIER from "@dimforge/rapier3d-compat";
import { EVENT, EventSystem } from "../events/EventSystem";
import { Entity, type EntityId } from "../entity/Entity";

export const GRAVITY_ACCELERATION = 9.81;

export class PhysicsSystem {
	private readonly events: EventSystem;
	private readonly gameEntities: Map<EntityId, Entity>;
	// ---
	private rapierWorld!: RAPIER.World; // note non-null assertion
	// ---
	private isInitialized = false;
	// ---

	constructor(events: EventSystem, gameEntities: Map<EntityId, Entity>) {
		this.events = events;
		this.gameEntities = gameEntities;

		console.log("unawaited rapier init");
		this.initRapier();
		this.initListeners();
	}

	private async initRapier(): Promise<void> {
		// Initialize RAPIER asynchronously
		console.log("initializing Rapier physics engine...");
		try {
			await RAPIER.init();
			console.log("Rapier initialization successful");

			// Now create the world after RAPIER is initialized
			this.rapierWorld = new RAPIER.World(
				new RAPIER.Vector3(0, -GRAVITY_ACCELERATION, 0)
			);

			this.isInitialized = true;
			this.events.emit(EVENT.PHYSICS_ENGINE_INITIALIZED, {});
			console.log("Physics world created successfully");
		} catch (error) {
			console.error("Failed to initialize Rapier:", error);
		}
	}

	public destroy(): void {
		if (!this.isInitialized) return;

		for (const entity of this.gameEntities.values()) {
			if (entity.hasPhysics) {
				this.rapierWorld.removeCollider(entity.collider, false);
				this.rapierWorld.removeRigidBody(entity.rigidBody);
				entity.destroyPhysics();
			}
		}
	}

	// --- core init ---

	private initListeners(): void {
		// this.events.on(
		// EVENT.UPDATE_PHYSICS_ORIENTATION_COMMAND,
		// this.handleUpdatePhysicsOrientationCommand.bind(this)
		// );
	}

	// --- Event Handlers ---

	public update(deltaTime: number): void {
		if (!this.isInitialized) return;
		this.rapierWorld.step();
		for (const entity of this.gameEntities.values()) {
			if (entity.hasPhysics) {
				entity.updatePhysics(this.rapierWorld);
			}
		}
	}
}
