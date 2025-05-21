import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { EVENT, EventSystem, type EventPayload } from "../EventSystem";
import { Entity, type EntityId } from "../entities/Entity";
import { Player } from "../entities/Player";
import { LandingPlane } from "../entities/LandingPlane";

export type PhysicsType = "kinematic" | "dynamic" | "static";

const DEFAULT_UP = new THREE.Vector3(0, 1, 0);
const DEFAULT_FORWARD = new THREE.Vector3(0, 0, 1);
const DEFAULT_RIGHT = new THREE.Vector3(1, 0, 0);
const ORIGIN = new THREE.Vector3(0, 0, 0);

export const GRAVITY_ACCELERATION = 9.81;

export class PhysicsManager {
	private events: EventSystem;
	private rapierWorld!: RAPIER.World;
	public up: THREE.Vector3;
	public forward: THREE.Vector3;
	public right: THREE.Vector3;
	public quaternion: THREE.Quaternion;

	private isChangingOrientation = false;
	private isInitialized = false;

	private readonly gameEntities: Map<EntityId, Entity>;
	private physicsEntities: Map<
		EntityId,
		{ rigidBody: RAPIER.RigidBody; collider: RAPIER.Collider }
	>;

	constructor(events: EventSystem, gameEntities: Map<EntityId, Entity>) {
		this.events = events;
		this.gameEntities = gameEntities;

		this.up = DEFAULT_UP.clone();
		this.forward = DEFAULT_FORWARD.clone();
		this.right = DEFAULT_RIGHT.clone();
		this.quaternion = new THREE.Quaternion(); // Identity
		this.updateWorldQuaternionFromVectors();

		this.physicsEntities = new Map();
		this.initRapier();
		this.initListeners();
	}

	private async initRapier(): Promise<void> {
		// Initialize RAPIER asynchronously
		console.log("[PhysicsManager] Initializing Rapier physics engine...");
		try {
			await RAPIER.init();
			console.log("[PhysicsManager] Rapier initialization successful");
			
			// Now create the world after RAPIER is initialized
			this.rapierWorld = new RAPIER.World({
				x: 0,
				y: -GRAVITY_ACCELERATION * this.up.y, // Apply gravity along the current 'up'
				z: 0, // Assuming gravity mainly acts on Y relative to current up.
			});
			
			this.isInitialized = true;
			this.events.emit(EVENT.PHYSICS_ENGINE_INITIALIZED, {});
			console.log("[PhysicsManager] Physics world created successfully");
		} catch (error) {
			console.error("[PhysicsManager] Failed to initialize Rapier:", error);
		}
	}

	public destroy(): void {
		if (!this.isInitialized) return;
		
		for (const entity of this.physicsEntities.values()) {
			this.rapierWorld.removeCollider(entity.collider, false);
			this.rapierWorld.removeRigidBody(entity.rigidBody);
		}
		this.physicsEntities.clear();
	}

	// --- core init ---

	private initListeners(): void {
		this.events.on(
			EVENT.UPDATE_PHYSICS_ORIENTATION_COMMAND,
			this.handleUpdatePhysicsOrientationCommand.bind(this)
		);

		this.events.on(
			EVENT.ENTITY_FORCE_VECTOR_UPDATED,
			this.onEntityForceVectorUpdated.bind(this)
		);

		// Add listener for entity model load success to create physics objects
		this.events.on(
			EVENT.ENTITY_MODEL_LOAD_SUCCESS,
			this.onEntityModelLoadSuccess.bind(this)
		);

		// Add listener for player jump commands
		this.events.on(
			EVENT.PLAYER_JUMP_COMMAND,
			this.onPlayerJumpCommand.bind(this)
		);
	}

	// --- Event Handlers ---
	private handleUpdatePhysicsOrientationCommand(
		args: EventPayload<typeof EVENT.UPDATE_PHYSICS_ORIENTATION_COMMAND>
	): void {
		if (!this.isInitialized) return;
		
		if (args.semanticCommand === "forwardLeft") {
			this.updateWorldYaw(THREE.MathUtils.degToRad(15));
		} else if (args.semanticCommand === "forwardRight") {
			this.updateWorldYaw(THREE.MathUtils.degToRad(-15));
		} else if (args.quaternion) {
			this.quaternion.copy(args.quaternion);
			this.updateWorldVectorsFromQuaternion();
		}
	}

	private onEntityForceVectorUpdated(payload: {
		entityId: EntityId;
		prev: THREE.Vector3;
		curr: THREE.Vector3;
	}): void {
		if (!this.isInitialized) return;
		
		const entity = this.gameEntities.get(payload.entityId);
		const entityPhysics = this.physicsEntities.get(payload.entityId);
		if (entity && entityPhysics && entity instanceof Player) {
			// Only rotate if we have a non-zero force vector on XZ plane
			if (payload.curr.x !== 0 || payload.curr.z !== 0) {
				const forceDirection = new THREE.Vector3(
					payload.curr.x,
					0,
					payload.curr.z
				).normalize();

				// Create rotation to align with force direction
				const targetRotation = new THREE.Quaternion();
				targetRotation.setFromUnitVectors(this.forward, forceDirection);

				// Apply rotation to rigid body with smooth interpolation
				const currentRotation = entityPhysics.rigidBody.rotation();
				const currentQuat = new THREE.Quaternion(
					currentRotation.x,
					currentRotation.y,
					currentRotation.z,
					currentRotation.w
				);

				// Smoothly interpolate between current and target rotation
				// Adjust rotation speed based on angle difference for more responsive rotation
				const currentAngle = currentQuat.angleTo(targetRotation);
				const ROTATION_SPEED = Math.min(0.2, currentAngle * 0.1); // Faster for bigger angles

				currentQuat.slerp(targetRotation, ROTATION_SPEED);

				// Apply the rotation
				entityPhysics.rigidBody.setRotation(currentQuat, true);

				// Log rotation for debugging (occasionally)
				if (Math.random() < 0.01) {
					console.log(
						"[PhysicsManager] Player rotation:",
						"Force:",
						forceDirection,
						"Angle:",
						THREE.MathUtils.radToDeg(currentAngle)
					);
				}

				// Update moving velocity based on force vector (not jumping)
				entityPhysics.rigidBody.setLinvel(
					new THREE.Vector3(
						payload.curr.x * entity.moveSpeed,
						entityPhysics.rigidBody.linvel().y, // Preserve vertical velocity
						payload.curr.z * entity.moveSpeed
					),
					true
				);
			}
		}
	}

	private onEntityModelLoadSuccess(payload: {
		entityId: EntityId;
		model: THREE.Group;
		animations: THREE.AnimationClip[];
	}): void {
		if (!this.isInitialized) return;
		
		const entity = this.gameEntities.get(payload.entityId);
		if (!entity) return;

		// Create physics bodies based on entity type
		if (entity.id === "player") {
			this.createPlayerPhysics(entity as Player);
		} else if (entity.id === "landing_plane") {
			this.createLandingPlanePhysics(entity as LandingPlane);
		}
	}

	private createPlayerPhysics(player: Player): void {
		if (!this.isInitialized) return;
		
		// Create rigid body
		const rigidBody = this.rapierWorld.createRigidBody(player.rbDesc);

		// Create collider
		const collider = this.rapierWorld.createCollider(
			player.colliderDesc,
			rigidBody
		);

		// Register with physics manager
		this.addEntityToPhysicsManager(player, rigidBody, collider);

		console.log(
			"[PhysicsManager] Created physics for player at position:",
			rigidBody.translation().x,
			rigidBody.translation().y,
			rigidBody.translation().z
		);
	}

	private createLandingPlanePhysics(landingPlane: LandingPlane): void {
		if (!this.isInitialized) return;
		
		// Create rigid body
		const rigidBody = this.rapierWorld.createRigidBody(landingPlane.rbDesc);

		// Create colliders - landing plane might have multiple colliders
		const colliders = landingPlane.collidersDesc.map((colliderDesc) =>
			this.rapierWorld.createCollider(colliderDesc, rigidBody)
		);

		// Register the first collider with physics manager
		if (colliders.length > 0) {
			this.addEntityToPhysicsManager(landingPlane, rigidBody, colliders[0]);
		}

		console.log("[PhysicsManager] Created physics for landing plane");
	}

	// Method for Character to register its physics components
	// entityId will be important when managing multiple dynamic entities
	public addEntityToPhysicsManager(
		entity: Entity,
		rigidBody: RAPIER.RigidBody,
		collider: RAPIER.Collider
	): void {
		if (!this.isInitialized) return;
		
		this.physicsEntities.set(entity.id, {
			rigidBody,
			collider,
		});
	}

	public updateWorldVectorsFromQuaternion(): void {
		this.up.set(0, 1, 0).applyQuaternion(this.quaternion);
		this.forward.set(0, 0, 1).applyQuaternion(this.quaternion);
		this.right.set(1, 0, 0).applyQuaternion(this.quaternion);
	}

	public updateWorldQuaternionFromVectors(): void {
		const matrix = new THREE.Matrix4().lookAt(ORIGIN, this.forward, this.up);
		this.quaternion.setFromRotationMatrix(matrix);
	}

	public setWorldOrientationToDefault(): void {
		this.up.copy(DEFAULT_UP);
		this.forward.copy(DEFAULT_FORWARD);
		this.right.copy(DEFAULT_RIGHT);
		this.quaternion.identity();
	}

	public updateWorldOrientationFromNormal(newNormal: THREE.Vector3): void {
		this.up.copy(newNormal).normalize();
		this.updateWorldQuaternionFromVectors();
	}

	// Sets the yaw (rotation around the current 'up' axis).
	public updateWorldYaw(radians: number): void {
		this.quaternion.setFromAxisAngle(this.up, radians);
		this.updateWorldVectorsFromQuaternion(); // This will derive forward, right based on the new quaternion & existing up.
	}

	private onPlayerJumpCommand(): void {
		if (!this.isInitialized) return;
		
		const player = this.gameEntities.get("player");
		if (player && player instanceof Player) {
			const playerPhysics = this.physicsEntities.get(player.id);
			if (playerPhysics) {
				// Apply jump impulse in current up direction
				const jumpVector = new THREE.Vector3(0, player.jumpImpulse, 0);
				playerPhysics.rigidBody.applyImpulse(jumpVector, true);
				console.log(
					"[PhysicsManager] Player jump impulse applied:",
					jumpVector
				);
			}
		}
	}

	public update(): void {
		if (!this.isInitialized) return;
		
		// Apply physics simulation step
		this.rapierWorld.step();

		// Apply forces for dynamic entities
		for (const entity of this.gameEntities.values()) {
			if (entity.physicsType === "dynamic") {
				const entityPhysics = this.physicsEntities.get(entity.id);

				// Apply forces for player movement
				if (entity instanceof Player && entityPhysics) {
					// Only apply forces if player is moving
					if (entity.movingForces.length() > 0.01) {
						// Get normalized direction vector
						const normalizedForce = entity.movingForces.clone().normalize();

						// Get current movement direction - match rotation to this
						const currentLinvel = entityPhysics.rigidBody.linvel();

						// If already moving, preserve some of the horizontal momentum for smoother movement
						// But still apply the new direction force
						entityPhysics.rigidBody.setLinvel(
							new THREE.Vector3(
								normalizedForce.x * entity.moveSpeed,
								currentLinvel.y, // Preserve vertical velocity (for jumping)
								normalizedForce.z * entity.moveSpeed
							),
							true
						);
					} else {
						// Apply horizontal damping when not actively moving
						const currentLinvel = entityPhysics.rigidBody.linvel();
						if (
							Math.abs(currentLinvel.x) > 0.1 ||
							Math.abs(currentLinvel.z) > 0.1
						) {
							// Apply damping to horizontal velocity for smoother stop
							entityPhysics.rigidBody.setLinvel(
								new THREE.Vector3(
									currentLinvel.x * 0.8, // Apply damping
									currentLinvel.y, // Preserve vertical velocity
									currentLinvel.z * 0.8 // Apply damping
								),
								true
							);
						}
					}
				}
			}
		}

		// emit events for dynamic entities
		for (const entity of this.gameEntities.values()) {
			if (entity.physicsType === "dynamic") {
				const entityPhysics = this.physicsEntities.get(entity.id);
				if (entityPhysics) {
					const position = entityPhysics.rigidBody.translation();
					const rotation = entityPhysics.rigidBody.rotation();
					this.events.emit(EVENT.ENTITY_PHYSICS_TRANSFORM_UPDATED, {
						entityId: entity.id,
						position: new THREE.Vector3(position.x, position.y, position.z),
						quaternion: new THREE.Quaternion(
							rotation.x,
							rotation.y,
							rotation.z,
							rotation.w
						),
					});
				}
			}
		}
	}
}
