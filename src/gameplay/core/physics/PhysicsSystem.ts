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
	private scanOrbCollisionActive = false; // Track if we're currently in collision with scan orb
	private scanOrbCollisionCooldown = 0; // Cooldown timer to prevent rapid-fire events
	private readonly COLLISION_COOLDOWN_MS = 1000; // 1 second cooldown

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
		
		// Check for collisions between scan orb and player
		this.checkScanOrbCollisions();
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

		this.events.on("entity_dispose_physics_request", (payload) => {
			this.ensureValidCache();
			const entity = this.entityManager.getEntity(payload.entityId);
			if (entity && entity.hasComponent(PhysicsComponent)) {
				(entity as IPhysicsEntity).disposePhysics(this.rapierWorld);
			}

			if (payload.entityId === "scan_orb") {
				this.scanOrbCollisionActive = false;
				this.scanOrbCollisionCooldown = 0; // Reset cooldown when orb moves
			}
		});

		// Reset collision state when scan orb moves to new position
		this.events.on("scan_orb_position_changed", () => {
			console.log("PhysicsSystem: Scan orb moved, resetting collision state and cooldown");
			this.scanOrbCollisionActive = false;
			this.scanOrbCollisionCooldown = 0; // Reset cooldown when orb moves
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

	// Check for collisions between scan orb and player
	private checkScanOrbCollisions(): void {
		// Check cooldown timer
		const currentTime = Date.now();
		if (currentTime < this.scanOrbCollisionCooldown) {
			return; // Still in cooldown, skip collision detection
		}

		// Get the scan orb and player entities
		const scanOrbEntity = this.entityManager.getEntity("scan_orb");
		const playerEntity = this.entityManager.getEntity("player");
		
		if (!scanOrbEntity || !playerEntity) return;
		
		// Cast to physics entities
		const scanOrb = scanOrbEntity as IPhysicsEntity;
		const player = playerEntity as IPhysicsEntity;
		
		if (scanOrb.rigidBodies.length === 0 || player.rigidBodies.length === 0) return;
		
		// Get positions
		const scanOrbPos = scanOrb.rigidBodies[0].translation();
		const playerPos = player.rigidBodies[0].translation();
		
		// Calculate distance
		const distance = Math.sqrt(
			(scanOrbPos.x - playerPos.x) ** 2 +
			(scanOrbPos.y - playerPos.y) ** 2 +
			(scanOrbPos.z - playerPos.z) ** 2
		);
		
		// Check if within collision distance (3 units)
		const withinCollisionRange = distance < 3.0;
		
		if (withinCollisionRange && !this.scanOrbCollisionActive) {
			// Entering collision - emit event once and start cooldown
			console.log("PhysicsSystem: Scan orb collision detected!");
			this.scanOrbCollisionActive = true;
			this.scanOrbCollisionCooldown = currentTime + this.COLLISION_COOLDOWN_MS;
			this.events.emit("scan_orb_collision", undefined);
		} else if (!withinCollisionRange && this.scanOrbCollisionActive) {
			// Exiting collision - reset state
			console.log("PhysicsSystem: Scan orb collision ended");
			this.scanOrbCollisionActive = false;
		}
	}
}
