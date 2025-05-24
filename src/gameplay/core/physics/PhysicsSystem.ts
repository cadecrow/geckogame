import * as RAPIER from "@dimforge/rapier3d-compat";
import { EventSystem } from "../events/EventSystem";
import { Entity, type EntityId } from "../ecs/Entity";
import { System } from "../ecs/System";
import { PhysicsComponent } from "./PhysicsComponent";

export const GRAVITY_ACCELERATION = 9.81;

export class PhysicsSystem extends System {
	private readonly events: EventSystem;
	// ---
	private rapierWorld!: RAPIER.World; // note non-null assertion
	// ---
	private isInitialized = false;
	// ---

	constructor(events: EventSystem, gameEntities: Map<EntityId, Entity>) {
		super(gameEntities);
		this.events = events;

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
			this.events.emit("physics_engine_initialized", undefined);
			console.log("Physics world created successfully");
		} catch (error) {
			console.error("Failed to initialize Rapier:", error);
		}
	}

	public destroy(): void {
		if (!this.isInitialized) return;

		for (const entity of this.entities.values()) {
			const physicsComponent = entity.getComponent(PhysicsComponent);
			if (physicsComponent) {
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
