import * as RAPIER from "@dimforge/rapier3d-compat";
import { EventBus } from "../events/EventBus";
import { System } from "../ec-s/System";
import { type IPhysicsEntity, PhysicsComponent } from "./PhysicsComponent";
import type { EntityManager } from "../ec-s/EntityManager";

export class PhysicsSystem extends System {
	private readonly events: EventBus;
	// ---
	private rapierWorld!: RAPIER.World; // note non-null assertion
	// ---
	private isInitialized = false;
	private isInitializing = false; // Prevent concurrent initialization
	private cachedEntities: IPhysicsEntity[] | null = null; // null when cache invalid

	constructor(events: EventBus, gameEntities: EntityManager) {
		super(gameEntities);
		this.events = events;

		console.log("unawaited rapier init");
		this.initRapier();
		this.initListeners();
	}

	private async initRapier(): Promise<void> {
		// Prevent concurrent initialization
		if (this.isInitializing || this.isInitialized) {
			return;
		}
		this.isInitializing = true;

		// Initialize RAPIER asynchronously
		console.log("initializing Rapier physics engine...");
		try {
			await RAPIER.init();
			console.log("Rapier initialization successful");

			// Check if we've been disposed during initialization
			if (!this.isInitializing) {
				console.log("PhysicsSystem was disposed during initialization");
				return;
			}

			// Now create the world after RAPIER is initialized
			this.rapierWorld = new RAPIER.World(
				new RAPIER.Vector3(0, 0, 0) // world has no gravity. The player and other kinematic bodies will apply forces to themselves
			);

			this.isInitialized = true;
			this.isInitializing = false;
			this.events.emit("physics_engine_initialized", undefined);
			console.log("Physics world created successfully");
		} catch (error) {
			console.error("Failed to initialize Rapier:", error);
			this.isInitializing = false;
		}
	}

	public update(deltaTime: number): void {
		if (!this.isInitialized || !this.rapierWorld) return;
		this.rapierWorld.step();
		this.ensureValidCache();
		for (const entity of this.cachedEntities as IPhysicsEntity[]) {
			entity.updatePhysics(deltaTime, this.rapierWorld);
		}
	}

	public dispose(): void {
		console.log("Destroying PhysicsSystem");
		
		// Stop any ongoing initialization
		this.isInitializing = false;
		
		if (!this.isInitialized) return;

		// First dispose all entities' physics components
		this.populateCache();
		for (const entity of this.cachedEntities as IPhysicsEntity[]) {
			entity.disposePhysics(this.rapierWorld);
		}

		// Then dispose the Rapier world itself to free all resources
		if (this.rapierWorld) {
			this.rapierWorld.free();
		}

		// Reset initialization state to prevent any further operations
		this.isInitialized = false;
		this.cachedEntities = null;
	}

	// --- core init ---

	private initListeners(): void {
		this.events.on("entity_added_to_manager", (payload) => {
			if (payload.entity.hasComponent(PhysicsComponent)) {
				this.cachedEntities = null;
				// Only initialize physics if the world is properly initialized and not disposed
				if (this.isInitialized && this.rapierWorld) {
					(payload.entity as IPhysicsEntity).initPhysics(this.rapierWorld);
				}
			}
		});
	}

	// --- Event Handlers ---

	// --- HELPERS ---
	private ensureValidCache() {
		if (!this.cachedEntities) {
			this.populateCache();
		}
	}

	private populateCache() {
		this.cachedEntities = this.entityManager.getEntitiesHavingComponent<
			PhysicsComponent,
			IPhysicsEntity
		>(PhysicsComponent);
	}
}
