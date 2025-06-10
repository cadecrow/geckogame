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
import type { GameMode } from "../GameManager";

// Definitions for entity
const MODEL_PATH: string = "/models/robots/Cute_Bot.glb";
const ENTITY_ID: EntityId = "player";

// Movement constants
const MOVE_SPEED = 5.0; // Direct movement speed (units per second)
const GRAVITY_NORM = 5.0;

export class Player
	extends Entity
	implements IRenderableEntity, IPhysicsEntity
{
	public readonly group: THREE.Group = new THREE.Group();
	public readonly rigidBodies: RAPIER.RigidBody[] = [];
	public readonly colliders: RAPIER.Collider[] = [];

	private rbDesc: RAPIER.RigidBodyDesc | undefined;
	private collidersDesc: RAPIER.ColliderDesc[] | undefined;

	// Animation system
	private animationMixer: THREE.AnimationMixer | undefined;
	private animations: Map<string, THREE.AnimationClip> = new Map();
	private currentAnimation: THREE.AnimationAction | undefined;

	// Movement state
	private movementState: Set<string> = new Set(); // Track active movement directions
	private isMoving: boolean = false;
	private movementVector: RAPIER.Vector3 = new RAPIER.Vector3(0, 0, 0); // Cached movement force vector
	private playerGravity: RAPIER.Vector3 = new RAPIER.Vector3(
		0,
		-GRAVITY_NORM,
		0
	); // Player gravity vector
	public forwardDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 1); // Forward direction (orthogonal to gravity)
	public rightDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 0); // Right direction (orthogonal to gravity)

	// Fall detection
	private hasFallen: boolean = false; // Track if player has fallen off the platform
	private readonly FALL_THRESHOLD = -75; // Y position threshold for falling

	// Halt state
	private isHalted: boolean = true; // Track if player physics updates are suspended

	// Game mode tracking
	// while player is being created we should definitely be in the loading state - if logic changes we may need to revisit this
	private currentGameMode: GameMode = "loading"; // Track current game mode to control gravity application

	// Logging state tracking
	private lastForceApplied: { x: number; z: number } = { x: 0, z: 0 }; // Track previous force for change detection
	private frameCount: number = 0; // Frame counter for position logging

	constructor(events: EventBus) {
		super(events, ENTITY_ID);
		this.addComponent(new RenderingComponent(this));
		this.addComponent(new PhysicsComponent(this));
		this.initEventListeners();
	}

	static async create(events: EventBus): Promise<Player> {
		console.log("Player: Creating new player instance");
		const player = new Player(events);

		// Load model and animations asynchronously
		console.log("Player: Loading model and animations");
		const { model, mixer, animations } = await loadModel();
		if (model) {
			console.log("Player: Model loaded successfully, adding to group");
			player.group.add(model);
		} else {
			console.log("Player: Model failed to load, using fallback placeholder");
			// Fallback placeholder
			player.group.add(
				new THREE.Mesh(
					new THREE.BoxGeometry(1, 1, 1),
					new THREE.MeshBasicMaterial({ color: 0x804080 })
				)
			);
		}

		// Set up animations
		if (mixer && animations) {
			console.log(
				`Player: Setting up animations, found ${animations.length} animation clips`
			);
			player.animationMixer = mixer;
			// Store animations by name for easy access
			animations.forEach((clip) => {
				console.log(`Player: Registering animation: ${clip.name}`);
				player.animations.set(clip.name.toLowerCase(), clip);
			});
			// Start with idle animation if available
			player.playAnimation("idle");
		} else {
			console.log("Player: No animations available");
		}

		// Initialize physics attributes
		console.log("Player: Initializing physics attributes");
		const { rbDesc, collidersDesc } = initializePhysicsAttributes();
		player.rbDesc = rbDesc;
		player.collidersDesc = collidersDesc;
		console.log("Player: Physics attributes initialized");

		console.log("Player: Player creation complete");

		// Initialize direction vectors based on initial gravity
		player.updateDirectionVectors();

		return player;
	}

	private initEventListeners(): void {
		console.log("Player: Initializing event listeners");
		this.events.on("start_game_command", () => {
			this.unhalt();
		});
		this.events.on("player_move_command", (payload) => {
			const { command, direction } = payload;
			console.log(`Player: Received move command - ${command} ${direction}`);

			if (command === "MOVE_START") {
				this.movementState.add(direction);
				console.log(
					`Player: Added direction ${direction}, active directions:`,
					Array.from(this.movementState)
				);
			} else if (command === "MOVE_END") {
				this.movementState.delete(direction);
				console.log(
					`Player: Removed direction ${direction}, active directions:`,
					Array.from(this.movementState)
				);
			}

			// Handle jumping (space bar)
			if (direction === "UP" && command === "MOVE_START") {
				this.handleJump();
			}

			// Update movement vector and state
			this.updateMovementVector();

			// Update movement state (exclude UP from movement state since it's jumping)
			const wasMoving = this.isMoving;
			this.isMoving =
				this.movementState.size > 0 && !this.movementState.has("UP");
			console.log(
				`Player: Movement state changed from ${wasMoving} to ${this.isMoving}`
			);

			// Handle animation transitions
			if (this.isMoving && !wasMoving) {
				console.log("Player: Starting walk animation");
				this.playAnimation("walk");
			} else if (!this.isMoving && wasMoving) {
				console.log("Player: Starting idle animation");
				this.currentAnimation?.fadeOut(0.2);
				this.playAnimation("idle");
			}
		});

		// Listen for orientation adjustment events (will be emitted by UI)
		this.events.on(
			"player_orientation_adjust",
			(payload: { direction: "LEFT" | "RIGHT" }) => {
				const adjustment =
					payload.direction === "LEFT" ? Math.PI / 12 : -Math.PI / 12; // 15 degrees

				// Get the "up" vector (opposite to gravity)
				const gravityNorm = new THREE.Vector3(
					this.playerGravity.x,
					this.playerGravity.y,
					this.playerGravity.z
				).normalize();
				const up = gravityNorm.clone().multiplyScalar(-1);

				// Rotate the forward direction around the up axis
				const rotation = new THREE.Quaternion().setFromAxisAngle(
					up,
					adjustment
				);
				this.forwardDirection.applyQuaternion(rotation);

				// Recalculate right direction from new forward direction
				this.rightDirection = new THREE.Vector3()
					.crossVectors(this.forwardDirection, up)
					.normalize();

				console.log(
					`Player: Orientation adjusted by ${(
						(adjustment * 180) /
						Math.PI
					).toFixed(1)} degrees`
				);
			}
		);

		// Listen for player reset command (when they want to return to starting platform)
		this.events.on("player_reset_world_command", () => {
			console.log("Player: Received reset world command");
			this.resetPlayerPosition();
			this.unhalt();
		});

		// Listen for game mode changes to control when gravity should be applied
		this.events.on("game_mode_updated", (payload) => {
			const previousMode = this.currentGameMode;
			this.currentGameMode = payload.curr;
			console.log(
				`Player: Game mode changed from ${previousMode} to ${this.currentGameMode}`
			);

			// Reset any accumulated velocity when transitioning to active gameplay
			if (previousMode !== "normal") {
				if (this.rigidBodies.length > 0 && this.rigidBodies[0]) {
					const rigidBody = this.rigidBodies[0];
					// Reset Y velocity to prevent rubber band effect from accumulated gravity
					rigidBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
					console.log(
						"Player: Reset Y velocity to prevent gravity rubber band effect"
					);
				}
			}
		});
	}

	private updateMovementVector(): void {
		// If player has fallen or is halted, don't allow movement
		if (this.hasFallen || this.isHalted) {
			this.movementVector.x = 0;
			this.movementVector.y = 0;
			this.movementVector.z = 0;
			return;
		}

		// Reset the vector
		this.movementVector.x = 0;
		this.movementVector.y = 0;
		this.movementVector.z = 0;

		// Calculate movement velocity using gravity-oriented direction vectors
		const movement = new THREE.Vector3(0, 0, 0);

		if (this.movementState.has("FORWARD")) {
			movement.add(this.forwardDirection.clone().multiplyScalar(-MOVE_SPEED));
		}
		if (this.movementState.has("BACKWARD")) {
			movement.add(this.forwardDirection.clone().multiplyScalar(MOVE_SPEED));
		}
		if (this.movementState.has("LEFT")) {
			movement.add(this.rightDirection.clone().multiplyScalar(MOVE_SPEED));
		}
		if (this.movementState.has("RIGHT")) {
			movement.add(this.rightDirection.clone().multiplyScalar(-MOVE_SPEED));
		}

		// Normalize diagonal movement to prevent faster diagonal movement
		if (movement.length() > MOVE_SPEED) {
			movement.normalize().multiplyScalar(MOVE_SPEED);
			console.log(
				"Player: Normalized diagonal movement to maintain consistent speed"
			);
		}

		// Convert to RAPIER vector
		this.movementVector.x = movement.x;
		this.movementVector.y = movement.y;
		this.movementVector.z = movement.z;

		// Log the updated movement vector (now represents target velocity)
		if (this.movementState.size > 0 && !this.movementState.has("UP")) {
			console.log(
				`Player: Updated target velocity: x=${this.movementVector.x.toFixed(
					2
				)}, y=${this.movementVector.y.toFixed(
					2
				)}, z=${this.movementVector.z.toFixed(2)}`
			);
		} else {
			console.log("Player: Target velocity cleared (no active directions)");
		}
	}

	private updateDirectionVectors(): void {
		// Calculate forward and right directions based on gravity vector
		const gravityNorm = new THREE.Vector3(
			this.playerGravity.x,
			this.playerGravity.y,
			this.playerGravity.z
		).normalize();

		// Create a reference "up" vector (opposite to gravity)
		const up = new THREE.Vector3().copy(gravityNorm).multiplyScalar(-1);

		// Reset to base forward vector (perpendicular to gravity)
		// If gravity is purely vertical, use world Z as base
		if (Math.abs(gravityNorm.y) >= 0.99) {
			this.forwardDirection.set(0, 0, 1);
		} else {
			// If gravity isn't purely vertical, create perpendicular vector
			this.forwardDirection = new THREE.Vector3()
				.crossVectors(up, new THREE.Vector3(0, 1, 0))
				.normalize();
		}

		// Calculate right direction from forward and up
		this.rightDirection = new THREE.Vector3()
			.crossVectors(this.forwardDirection, up)
			.normalize();

		console.log(
			`Player: Updated direction vectors - forward: (${this.forwardDirection.x.toFixed(
				2
			)}, ${this.forwardDirection.y.toFixed(
				2
			)}, ${this.forwardDirection.z.toFixed(2)})`
		);
	}

	private handleJump(): void {
		// Don't allow jumping if player has fallen or is halted
		if (this.hasFallen || this.isHalted) return;

		if (this.rigidBodies.length === 0) return;

		const rigidBody = this.rigidBodies[0];
		if (!rigidBody) return;

		// Apply jump impulse opposite to gravity direction
		const jumpForce = 8.0; // Jump force magnitude
		const gravityNorm = new THREE.Vector3(
			this.playerGravity.x,
			this.playerGravity.y,
			this.playerGravity.z
		).normalize();

		// Jump impulse is opposite to gravity
		const jumpImpulse = new RAPIER.Vector3(
			-gravityNorm.x * jumpForce,
			-gravityNorm.y * jumpForce,
			-gravityNorm.z * jumpForce
		);

		rigidBody.applyImpulse(jumpImpulse, true);
		console.log(
			`Player: Applied jump impulse: x=${jumpImpulse.x.toFixed(
				2
			)}, y=${jumpImpulse.y.toFixed(2)}, z=${jumpImpulse.z.toFixed(2)}`
		);
	}

	private handlePlayerFall(): void {
		console.log(
			"Player: Fallen off world! Stopping movement and prompting return."
		);

		// Stop all movement
		this.hasFallen = true;
		this.movementState.clear();
		this.isMoving = false;
		this.isHalted = true;

		// Stop current animations and play idle
		if (this.currentAnimation) {
			this.currentAnimation.fadeOut(0.2);
		}
		this.playAnimation("idle");

		// Emit event to show UI prompt
		this.events.emit("player_fell_off_world", {
			message: "You've fallen off the map!.",
			position: { x: 0, y: 5, z: 0 }, // Starting position
		});
	}

	private resetPlayerPosition(): void {
		if (this.rigidBodies.length === 0) return;

		const rigidBody = this.rigidBodies[0];
		if (!rigidBody) return;

		console.log("Player: Resetting position to starting platform.");

		// Reset position to starting platform
		const startingPosition = new RAPIER.Vector3(0, 5, 0);
		rigidBody.setTranslation(startingPosition, true);

		// Stop all velocity
		rigidBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
		rigidBody.setAngvel(new RAPIER.Vector3(0, 0, 0), true);

		// Reset fall state
		this.hasFallen = false;

		console.log("Player: Successfully reset to starting position.");
	}

	// --- Halt State Control Methods ---
	public halt(): void {
		this.isHalted = true;
		console.log("Player: Movement halted - physics updates suspended");
	}

	public unhalt(): void {
		this.isHalted = false;
		console.log("Player: Movement unhalted - physics updates resumed");
	}

	public isPlayerHalted(): boolean {
		return this.isHalted;
	}

	private playAnimation(animationName: string): void {
		if (!this.animationMixer) return;

		let clip = this.animations.get(animationName.toLowerCase());
		if (!clip) {
			// Try common animation name variations
			const fallbackNames = ["walking", "run", "running"];
			if (animationName === "walk") {
				for (const name of fallbackNames) {
					const fallbackClip = this.animations.get(name);
					if (fallbackClip) {
						clip = fallbackClip;
						break;
					}
				}
			}
		}

		if (clip) {
			// Stop current animation
			if (this.currentAnimation) {
				this.currentAnimation.fadeOut(0.2);
			}

			// Start new animation
			this.currentAnimation = this.animationMixer.clipAction(clip);
			this.currentAnimation.reset().fadeIn(0.2).play();
		}
	}

	public initRendering(scene: THREE.Scene): void {
		console.log("Player: Initializing rendering, adding group to scene");
		scene.add(this.group);
		console.log("Player: Group added to scene successfully");
	}

	public initPhysics(rapierWorld: RAPIER.World): void {
		console.log("Player: Initializing physics");
		try {
			if (this.rbDesc && this.collidersDesc && this.collidersDesc.length > 0) {
				console.log(
					"Player: Creating rigid body and colliders from descriptions"
				);
				const rb = rapierWorld.createRigidBody(this.rbDesc);
				this.rigidBodies.push(rb);
				console.log(
					`Player: Created rigid body, total rigid bodies: ${this.rigidBodies.length}`
				);

				for (const colliderDesc of this.collidersDesc) {
					if (colliderDesc) {
						// CRITICAL FIX: Attach collider to the rigid body
						const collider = rapierWorld.createCollider(colliderDesc, rb);
						this.colliders.push(collider);
						console.log("Player: Attached collider to rigid body");
					}
				}
				console.log(
					`Player: Created ${this.colliders.length} colliders, all attached to rigid body`
				);
			} else {
				console.warn(
					"Player physics initialization skipped due to missing descriptions",
					{ rbDesc: !!this.rbDesc, collidersDesc: this.collidersDesc?.length }
				);
			}
		} catch (error) {
			console.error("Failed to initialize physics for Player:", error);

			// Emit error event for UI display
			this.events.emit("physics_initialization_error", {
				entityId: this.id,
				entityType: "Player",
				error: error as Error,
				errorMessage: `Failed to initialize physics for Player: ${
					error instanceof Error ? error.message : String(error)
				}`,
			});

			// Create a fallback simple collider if physics initialization fails
			try {
				console.log("Player: Creating fallback physics");
				const fallbackRb = rapierWorld.createRigidBody(
					RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 5, 0)
				);
				this.rigidBodies.push(fallbackRb);

				// CRITICAL FIX: Attach fallback collider to rigid body
				const fallbackCollider = rapierWorld.createCollider(
					RAPIER.ColliderDesc.capsule(0.5, 0.5),
					fallbackRb
				);
				this.colliders.push(fallbackCollider);
				console.log(
					"Created fallback physics for Player with attached collider"
				);
			} catch (fallbackError) {
				console.error(
					"Failed to create fallback physics for Player:",
					fallbackError
				);

				// Emit error event for fallback failure as well
				this.events.emit("physics_initialization_error", {
					entityId: this.id,
					entityType: "Player",
					error: fallbackError as Error,
					errorMessage: `Failed to create fallback physics for Player: ${
						fallbackError instanceof Error
							? fallbackError.message
							: String(fallbackError)
					}`,
				});
			}
		}
		console.log(
			`Player: Physics initialization complete. Rigid bodies: ${this.rigidBodies.length}, Colliders: ${this.colliders.length}`
		);
	}

	public updatePhysics(
		deltaTime: number
		// removing for now - eslint-disable-next-line @typescript-eslint/no-unused-vars
		// rapierWorld: RAPIER.World
	): void {
		// Early return if player is halted - suspend all physics updates
		if (this.isHalted) {
			return;
		}

		if (this.currentGameMode !== "normal" && this.currentGameMode !== "gecko") {
			return;
		}

		if (this.rigidBodies.length === 0) {
			console.log("Player: No rigid bodies for physics update");
			return;
		}

		const rigidBody = this.rigidBodies[0];
		if (!rigidBody) {
			console.log("Player: Rigid body is null");
			return;
		}

		this.frameCount++;

		// Get current position for fall detection
		const currentPos = rigidBody.translation();

		// Check for fall detection
		if (!this.hasFallen && currentPos.y <= this.FALL_THRESHOLD) {
			this.handlePlayerFall();
		}

		// Set velocity directly using cached movement vector
		const currentVelocity = rigidBody.linvel();

		// Only log position every 100 frames
		if (this.frameCount % 100 === 0) {
			console.log(
				`Player: Position at frame ${this.frameCount}: x=${currentPos.x.toFixed(
					2
				)}, y=${currentPos.y.toFixed(2)}, z=${currentPos.z.toFixed(2)}`
			);
		}

		// Check if target velocity has changed
		const velocityChanged =
			this.lastForceApplied.x !== this.movementVector.x ||
			this.lastForceApplied.z !== this.movementVector.z;

		if (velocityChanged) {
			console.log(
				`Player: Target velocity changed: x=${this.movementVector.x}, z=${this.movementVector.z}`
			);
			this.lastForceApplied.x = this.movementVector.x;
			this.lastForceApplied.z = this.movementVector.z;
		}

		// Only apply gravity during active gameplay modes
		let newVelocity: RAPIER.Vector3;
		if (this.currentGameMode === "normal" || this.currentGameMode === "gecko") {
			// Apply gravity to current velocity
			const gravityContribution = new RAPIER.Vector3(
				this.playerGravity.x * deltaTime,
				this.playerGravity.y * deltaTime,
				this.playerGravity.z * deltaTime
			);

			// Combine movement velocity with gravity-affected velocity
			newVelocity = new RAPIER.Vector3(
				this.movementVector.x,
				currentVelocity.y + gravityContribution.y, // Apply gravity to Y velocity
				this.movementVector.z
			);
		} else {
			// Don't apply gravity during loading/waiting modes to prevent accumulation
			newVelocity = new RAPIER.Vector3(
				this.movementVector.x,
				currentVelocity.y, // Keep current Y velocity without adding gravity
				this.movementVector.z
			);
		}

		rigidBody.setLinvel(newVelocity, true);

		// Log velocity on change or every 100 frames
		if (velocityChanged || this.frameCount % 100 === 0) {
			console.log(
				`Player: Set velocity - x=${newVelocity.x.toFixed(
					2
				)}, y=${newVelocity.y.toFixed(2)}, z=${newVelocity.z.toFixed(2)}`
			);
		}
	}

	public updateRendering(
		deltaTime: number,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_scene: THREE.Scene,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_camera: THREE.PerspectiveCamera,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_renderer: THREE.WebGLRenderer
	): void {
		// Update animations
		if (this.animationMixer) {
			this.animationMixer.update(deltaTime);
		}

		// Sync rendering position with physics
		if (this.rigidBodies.length > 0) {
			const rigidBody = this.rigidBodies[0];
			if (rigidBody) {
				const position = rigidBody.translation();

				// Set position from physics
				this.group.position.set(position.x, position.y, position.z);

				// Update player facing direction based on movement
				this.updatePlayerFacing();
			} else {
				console.log("Player: No rigid body available for position sync");
			}
		} else {
			console.log("Player: No rigid bodies available for rendering sync");
		}
	}

	private updatePlayerFacing(): void {
		// Only update facing direction when actually moving
		if (
			this.isMoving &&
			(this.movementVector.x !== 0 ||
				this.movementVector.y !== 0 ||
				this.movementVector.z !== 0)
		) {
			// Create movement direction vector (invert because movement vectors are opposite to intended direction)
			const movementDirection = new THREE.Vector3(
				-this.movementVector.x,
				-this.movementVector.y,
				-this.movementVector.z
			).normalize();

			// Get the "up" vector (opposite to gravity)
			const gravityNorm = new THREE.Vector3(
				this.playerGravity.x,
				this.playerGravity.y,
				this.playerGravity.z
			).normalize();
			const up = gravityNorm.clone().multiplyScalar(-1);

			// Calculate rotation to face movement direction while staying upright relative to gravity
			const targetRotation = new THREE.Quaternion();

			// Create a look-at matrix that faces the movement direction with gravity-relative up
			const matrix = new THREE.Matrix4();
			matrix.lookAt(
				new THREE.Vector3(0, 0, 0), // From origin
				movementDirection, // Look toward actual movement direction
				up // Use gravity-relative up vector
			);

			targetRotation.setFromRotationMatrix(matrix);
			this.group.quaternion.copy(targetRotation);
		}
		// If not moving, keep the current facing direction
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

		// Clean up animation mixer
		if (this.animationMixer) {
			this.animationMixer.stopAllAction();
		}
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
		console.error("Failed to load player model:", error);
		return { model: undefined, mixer: undefined, animations: undefined };
	}
}
