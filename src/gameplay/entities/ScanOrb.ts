import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { Entity, type EntityId } from "../core/ec-s/Entity";
import type { EventBus } from "../core/events/EventBus";
import {
	RenderingComponent,
	type IRenderableEntity,
} from "../core/rendering/RenderingComponent";
import {
	PhysicsComponent,
	type IPhysicsEntity,
} from "../core/physics/PhysicsComponent";

// Definitions for entity
const ENTITY_ID: EntityId = "scan_orb";

export class ScanOrb
	extends Entity
	implements IRenderableEntity, IPhysicsEntity
{
	public readonly group: THREE.Group = new THREE.Group();
	public readonly rigidBodies: RAPIER.RigidBody[] = [];
	public readonly colliders: RAPIER.Collider[] = [];

	private rbDesc: RAPIER.RigidBodyDesc;
	private collidersDesc: RAPIER.ColliderDesc[];
	private orb: THREE.Mesh;
	private glowSphere: THREE.Mesh;
	private startTime: number = Date.now();
	private previousPosition: THREE.Vector3 = new THREE.Vector3();

	public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
	public floatingOffset: number = 0; // Public property for floating height offset

	constructor(events: EventBus, position?: THREE.Vector3) {
		super(events, ENTITY_ID);
		this.addComponent(new RenderingComponent(this));
		this.addComponent(new PhysicsComponent(this));
		this.position = position ?? new THREE.Vector3(0, 0, 0);
		this.previousPosition.copy(this.position);
		// be sure to prepare all necessary data for initialization to avoid race conditions in initialization
		const { orb, glowSphere } = initializeMesh();
		this.orb = orb;
		this.glowSphere = glowSphere;
		this.group.add(orb);
		this.group.add(glowSphere);
		const { rbDesc, collidersDesc } = initializePhysicsAttributes(
			this.position
		);
		this.rbDesc = rbDesc;
		this.collidersDesc = collidersDesc;
	}

	public initRendering(scene: THREE.Scene): void {
		scene.add(this.group);
	}

	public initPhysics(rapierWorld: RAPIER.World): void {
		try {
			// Update rigid body translation based on position property
			this.rbDesc.setTranslation(
				this.position.x,
				this.position.y + this.floatingOffset,
				this.position.z
			);

			const rb = rapierWorld.createRigidBody(this.rbDesc);
			this.rigidBodies.push(rb);
			for (const colliderDesc of this.collidersDesc) {
				if (colliderDesc) {
					const collider = rapierWorld.createCollider(colliderDesc, rb);
					this.colliders.push(collider);
				}
			}
		} catch (error) {
			console.error("Failed to initialize physics for ScanOrb:", error);

			// Emit error event for UI display
			this.events.emit("physics_initialization_error", {
				entityId: this.id,
				entityType: "ScanOrb",
				error: error as Error,
				errorMessage: `Failed to initialize physics for ScanOrb: ${
					error instanceof Error ? error.message : String(error)
				}`,
			});

			// Create a fallback simple collider if physics initialization fails
			try {
				const fallbackRb = rapierWorld.createRigidBody(
					RAPIER.RigidBodyDesc.fixed().setTranslation(
						this.position.x,
						this.position.y,
						this.position.z
					)
				);
				this.rigidBodies.push(fallbackRb);

				const fallbackCollider = rapierWorld.createCollider(
					RAPIER.ColliderDesc.ball(2), // Sphere collider for orb
					fallbackRb
				);
				this.colliders.push(fallbackCollider);
				console.log("Created fallback physics for ScanOrb");
			} catch (fallbackError) {
				console.error(
					"Failed to create fallback physics for ScanOrb:",
					fallbackError
				);

				// Emit error event for fallback failure as well
				this.events.emit("physics_initialization_error", {
					entityId: this.id,
					entityType: "ScanOrb",
					error: fallbackError as Error,
					errorMessage: `Failed to create fallback physics for ScanOrb: ${
						fallbackError instanceof Error
							? fallbackError.message
							: String(fallbackError)
					}`,
				});
			}
		}
	}

	// Physics updates to handle position changes
	public updatePhysics(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_deltaTime: number,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_rapierWorld: RAPIER.World
	): void {
		// Safety check - ensure position is defined
		if (!this.position) {
			console.error("ScanOrb: this.position is undefined! Reinitializing...");
			this.position = new THREE.Vector3(0, 0, 0);
			this.previousPosition = new THREE.Vector3(0, 0, 0);
			return;
		}

		// Safety check - ensure previousPosition is defined
		if (!this.previousPosition) {
			console.error("ScanOrb: this.previousPosition is undefined! Reinitializing...");
			this.previousPosition = new THREE.Vector3();
			this.previousPosition.copy(this.position);
			return;
		}

		// Check if position has changed and update rigid body accordingly
		if (!this.position.equals(this.previousPosition)) {
			if (this.rigidBodies.length > 0) {
				const rigidBody = this.rigidBodies[0];
				rigidBody.setTranslation(
					new RAPIER.Vector3(
						this.position.x,
						this.position.y + this.floatingOffset,
						this.position.z
					),
					true
				);
				console.log(`ScanOrb: Updated physics position to (${this.position.x}, ${this.position.y + this.floatingOffset}, ${this.position.z})`);
			}
			this.previousPosition.copy(this.position);
		}
	}

	// Add floating animation and glow effects
	public updateRendering(): void {
		const currentTime = Date.now();
		const elapsed = (currentTime - this.startTime) / 1000; // Convert to seconds

		// Floating animation - gentle up and down motion
		const floatOffset = Math.sin(elapsed * 1.5) * 0.3; // 1.5 speed, 0.3 amplitude
		this.group.position.set(
			this.position.x,
			this.position.y + this.floatingOffset + floatOffset, // Base height + floating offset + animation
			this.position.z
		);

		// Rotation animation - slow spin
		this.orb.rotation.y = elapsed * 0.5;
		this.glowSphere.rotation.y = elapsed * -0.3; // Counter-rotate for dynamic effect

		// Pulsing glow effect
		const pulseIntensity = 0.3 + Math.sin(elapsed * 2) * 0.2; // Pulse between 0.1 and 0.5
		(this.orb.material as THREE.MeshStandardMaterial).emissiveIntensity =
			pulseIntensity;

		// Glow sphere scale pulsing
		const glowScale = 1 + Math.sin(elapsed * 1.8) * 0.1; // Slight scale variation
		this.glowSphere.scale.setScalar(glowScale);
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

	public dispose(): void {
		console.log(`ScanOrb: Disposing entity ${this.id}`);
		this.events.emit("entity_dispose_physics_request", { entityId: this.id });
		this.events.emit("entity_dispose_rendering_request", { entityId: this.id });
	}
}

function initializeMesh(): { orb: THREE.Mesh; glowSphere: THREE.Mesh } {
	// Main orb geometry and material
	const orbGeometry = new THREE.SphereGeometry(2, 32, 32);
	const orbMaterial = new THREE.MeshStandardMaterial({
		color: 0x00ffaa, // Cyan-green color
		emissive: 0x004466, // Subtle emissive base
		emissiveIntensity: 0.3,
		metalness: 0.1,
		roughness: 0.2,
		transparent: true,
		opacity: 0.9,
	});

	const orb = new THREE.Mesh(orbGeometry, orbMaterial);
	orb.castShadow = true;

	// Outer glow sphere for enhanced glow effect
	const glowGeometry = new THREE.SphereGeometry(2.5, 16, 16);
	const glowMaterial = new THREE.MeshBasicMaterial({
		color: 0x00ffaa,
		transparent: true,
		opacity: 0.1,
		side: THREE.BackSide, // Render from inside for glow effect
	});

	const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);

	return { orb, glowSphere };
}

function initializePhysicsAttributes(position: THREE.Vector3): {
	rbDesc: RAPIER.RigidBodyDesc;
	collidersDesc: RAPIER.ColliderDesc[];
} {
	// Create a fixed rigid body positioned at the specified location
	const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
		position.x,
		position.y,
		position.z
	);

	// Use a sphere collider that matches the orb geometry
	const sphereCollider = RAPIER.ColliderDesc.ball(2); // Radius of 2 to match geometry

	// Set as sensor so it triggers collision events but doesn't physically block
	sphereCollider.setSensor(true);

	const collidersDesc = [sphereCollider];

	return { rbDesc, collidersDesc };
}
