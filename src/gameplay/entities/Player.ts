import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { Entity, type EntityId } from "../core/ec-s/Entity";
import {
	createModelLoader,
	tryAsyncLoadModel,
	tryResolveAnimationActions,
	type EntityAnimationMap,
} from "../core/utils/modelLoaderUtils";
import type { AnimationResolver } from "../core/utils/modelLoaderUtils";
import { EVENT, EventSystem } from "../core/events/EventBus";
import { QuaternionVisualizer } from "./utilObjects/QuaternionVisualizer";

// --- Definitions for entity ---
const MODEL_PATH: string = "/models/robots/Cute_Bot.glb";
const ENTITY_ID: EntityId = "player";
// ---
const ANIMATION_RESOLVERS: AnimationResolver[] = [
	{
		intendedName: "walking",
		potentialNames: ["walk", "run", "walking"],
		actionCallback: (action) => {
			action.setLoop(THREE.LoopRepeat, Infinity);
			action.timeScale = 0.5;
			action.clampWhenFinished = true;
			action.stop();
		},
	},
];
// ---
const QUATERNION_VISUALIZER_OFFSET = new THREE.Vector3(0, 3.5, 0);
// ---

export class Player extends Entity {
	private events: EventSystem;
	private quaternionVisualizer: QuaternionVisualizer | null = null;
	// Character model
	public mixer: THREE.AnimationMixer;
	public animationActions: EntityAnimationMap;
	// physics descriptions
	public rbDesc: RAPIER.RigidBodyDesc;
	public colliderDesc: RAPIER.ColliderDesc;
	public moveSpeed: number;
	public jumpImpulse: number;
	public movingForces: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
	private isLoading: boolean = false;
	private isDisposed: boolean = false;


	constructor(events: EventSystem) {
		super(ENTITY_ID);
		console.log("[Player] Constructor called");
		this.events = events;
		this.model = new THREE.Group(); // Temporary empty group
		this.mixer = new THREE.AnimationMixer(this.model);
		this.animationActions = new Map();

		// Initialize physics attributes
		const { rbDesc, colliderDesc, moveSpeed, jumpImpulse } =
			this.initializePhysicsAttributes();
		this.rbDesc = rbDesc;
		this.colliderDesc = colliderDesc;
		this.moveSpeed = moveSpeed;
		this.jumpImpulse = jumpImpulse;

		// Set up event listeners
		this.initEventListeners();

		// Load the model asynchronously
		if (!this.isLoading && !this.isDisposed) {
			console.log("[Player] Starting model load");
			this.isLoading = true;
			this.loadModel();
		}
	}

	private initEventListeners(): void {
		this.boundMoveCommandHandler = this.handleMoveCommand.bind(this);
		this.events.on(EVENT.PLAYER_MOVE_COMMAND, this.boundMoveCommandHandler);
	}

	private updateMovingForces(forceVector: THREE.Vector3): void {
		const prev = this.movingForces.clone();
		this.movingForces.add(forceVector);

		// Ensure horizontal movement forces don't exceed 1.0 in magnitude
		// This normalizes XZ plane movement while preserving Y
		if (
			Math.abs(this.movingForces.x) > 0.01 ||
			Math.abs(this.movingForces.z) > 0.01
		) {
			const horizontalLength = Math.sqrt(
				this.movingForces.x * this.movingForces.x +
					this.movingForces.z * this.movingForces.z
			);

			if (horizontalLength > 1.0) {
				const scale = 1.0 / horizontalLength;
				this.movingForces.x *= scale;
				this.movingForces.z *= scale;
			}
		}

		this.events.emit(EVENT.ENTITY_FORCE_VECTOR_UPDATED, {
			entityId: this.id,
			prev,
			curr: this.movingForces,
		});
	}

	private handleMoveCommand(payload: {
		command: "MOVE_START" | "MOVE_END";
		direction: string;
	}): void {
		if (payload.command === "MOVE_START") {
			console.log("move start: ", payload.direction);
			// Update the moving forces
			this.updateMovingForces(
				DIRECTION_TO_VECTOR[payload.direction.toLowerCase()]
			);
			// update the animation
			const walkAction = this.animationActions.get("walking");
			if (walkAction && this.movingForces.length() > 0.01) {
				console.log("playing walk action");
				walkAction.reset();
				walkAction.timeScale = 0.5;
				walkAction.play();
			}
		} else if (payload.command === "MOVE_END") {
			console.log("move end: ", payload.direction);
			// Update the moving forces
			this.updateMovingForces(
				DIRECTION_TO_VECTOR[payload.direction.toLowerCase()].negate()
			);
			// update the animation
			const walkAction = this.animationActions.get("walking");
			if (walkAction && this.movingForces.length() < 0.01) {
				console.log("stopping walk action");
				walkAction.stop();
			}
		}
	}

	public initQuaternionVisualizer(scene: THREE.Scene): void {
		if (!this.quaternionVisualizer) {
			this.quaternionVisualizer = new QuaternionVisualizer(
				scene,
				this,
				QUATERNION_VISUALIZER_OFFSET
			);
		}
	}

	public dispose(): void {
		console.log("[Player] Disposing player");
		this.isDisposed = true;

		// Clean up event listeners
		if (this.boundMoveCommandHandler) {
			this.events.off(EVENT.PLAYER_MOVE_COMMAND, this.boundMoveCommandHandler);
			this.boundMoveCommandHandler = null;
		}

		// Clean up animations
		this.animationActions.forEach((action) => action.stop());
		this.animationActions.clear();

		// Clean up mixer
		if (this.mixer) {
			this.mixer.stopAllAction();
			this.mixer.uncacheRoot(this.model);
		}

		// Clean up quaternion visualizer
		if (this.quaternionVisualizer) {
			this.quaternionVisualizer.dispose();
			this.quaternionVisualizer = null;
		}

		// Clean up model
		if (this.model) {
			this.model.clear();
		}

		// Emit event that entity is disposed
		this.events.emit(EVENT.ENTITY_DISPOSED, {
			entityId: this.id,
		});
	}

	private initializePhysicsAttributes(): {
		rbDesc: RAPIER.RigidBodyDesc;
		colliderDesc: RAPIER.ColliderDesc;
		moveSpeed: number;
		jumpImpulse: number;
	} {
		return {
			rbDesc: RAPIER.RigidBodyDesc.dynamic()
				.setTranslation(0, 5, 0)
				.setLinearDamping(0.2)
				.setAngularDamping(10.0)
				.setCcdEnabled(true),
			colliderDesc: RAPIER.ColliderDesc.capsule(0.5, 0.5)
				.setFriction(0.9)
				.setRestitution(0.0),
			moveSpeed: 3.5, // meters per second
			jumpImpulse: 7, // upward impulse
		};
	}

	private async loadModel(): Promise<void> {
		if (this.isDisposed) return;

		console.log("[Player] loadModel function called");
		const modelLoader = createModelLoader();
		try {
			console.log("[Player] Attempting to load model from:", MODEL_PATH);
			const { model, mixer, animations } = await tryAsyncLoadModel(
				modelLoader,
				MODEL_PATH
			);

			if (this.isDisposed) {
				console.log(
					"[Player] Player was disposed during model load, cleaning up"
				);
				model.clear();
				mixer.stopAllAction();
				return;
			}

			// Debug animation information
			console.log(
				"[Player] Model loaded successfully with animations:",
				animations.map((a) => ({
					name: a.name,
					duration: a.duration,
					fps: 1 / a.duration,
				}))
			);

			this.model = model;
			this.mixer = mixer;

			// Set a more reasonable update rate for the mixer
			this.mixer.timeScale = 1.0;

			this.animationActions = tryResolveAnimationActions(
				ANIMATION_RESOLVERS,
				mixer,
				animations
			);

			// Start with idle animation
			const idleAction = this.animationActions.get("idle");
			if (idleAction) {
				idleAction.play();
			}

			// Emit event that model is loaded
			if (!this.isDisposed) {
				console.log("[Player] Emitting model load success event");
				this.events.emit(EVENT.ENTITY_MODEL_LOAD_SUCCESS, {
					entityId: this.id,
					model: this.model,
					animations,
				});
			}
		} catch (error) {
			console.error("[Player] Failed to load model:", error);
			if (!this.isDisposed) {
				this.events.emit(EVENT.ENTITY_MODEL_LOAD_ERROR, {
					entityId: this.id,
					error: error as Error,
				});
			}
		} finally {
			this.isLoading = false;
		}
	}
}
