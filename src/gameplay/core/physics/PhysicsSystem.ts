import * as RAPIER from "@dimforge/rapier3d-compat";
import { EventBus } from "../events/EventBus";
import { System } from "../ec-s/System";
import { type IPhysicsEntity, PhysicsComponent } from "./PhysicsComponent";
import type { EntityManager } from "../ec-s/EntityManager";

export const GRAVITY_ACCELERATION = 9.81;

export class PhysicsSystem extends System {
	private readonly events: EventBus;
	// ---
	private rapierWorld!: RAPIER.World; // note non-null assertion
	// ---
	private isInitialized = false;
	private cachedEntities: IPhysicsEntity[] | null = null; // null when cache invalid
	// ---

	constructor(events: EventBus, gameEntities: EntityManager) {
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

	public update(deltaTime: number): void {
		if (!this.isInitialized) return;
		this.rapierWorld.step();
		if (!this.cachedEntities) {
			this.cachedEntities = this.entityManager.getEntitiesHavingComponent<
				PhysicsComponent,
				IPhysicsEntity
			>(PhysicsComponent);
		}
		for (const entity of this.cachedEntities) {
			entity.updatePhysics(deltaTime);
		}
	}

	public dispose(): void {
		if (!this.isInitialized) return;

		if (this.cachedEntities) {
			for (const entity of this.cachedEntities) {
				entity.disposePhysics();
			}
		} else {
			for (const entity of this.entityManager.getEntitiesHavingComponent<
				PhysicsComponent,
				IPhysicsEntity
			>(PhysicsComponent)) {
				entity.disposePhysics();
			}
		}
	}

	// --- core init ---

	private initListeners(): void {
		this.events.on("entity_request_init_physics", () => {
			this.cachedEntities = null;
		});
		// this.events.on(
		// EVENT.UPDATE_PHYSICS_ORIENTATION_COMMAND,
		// this.handleUpdatePhysicsOrientationCommand.bind(this)
		// );
	}

	// --- Event Handlers ---
}
