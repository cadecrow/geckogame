import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { Entity, type EntityId } from "../core/ec-s/Entity";
import { getTrimeshBodyAndColliders } from "../core/utils/physicsUtils";
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
const ENTITY_ID: EntityId = "landing_plane";

export class LandingPlane
	extends Entity
	implements IRenderableEntity, IPhysicsEntity
{
	public readonly group: THREE.Group = new THREE.Group();
	public readonly rigidBodies: RAPIER.RigidBody[] = [];
	public readonly colliders: RAPIER.Collider[] = [];

	private rbDesc: RAPIER.RigidBodyDesc;
	private collidersDesc: RAPIER.ColliderDesc[];

	constructor(events: EventBus) {
		super(events, ENTITY_ID);
		this.addComponent(new RenderingComponent(this));
		this.addComponent(new PhysicsComponent(this));
		// be sure to prepare all necessary data for initialization to avoid race conditions in initialization
		const landingPlane = initializeMesh();
		this.group.add(landingPlane);
		const { rbDesc, collidersDesc } = initializePhysicsAttributes(landingPlane);
		this.rbDesc = rbDesc;
		this.collidersDesc = collidersDesc;
	}

	public initRendering(scene: THREE.Scene): void {
		scene.add(this.group);
	}

	public initPhysics(rapierWorld: RAPIER.World): void {
		try {
			const rb = rapierWorld.createRigidBody(this.rbDesc);
			this.rigidBodies.push(rb);
			for (const colliderDesc of this.collidersDesc) {
				if (colliderDesc) {
					const collider = rapierWorld.createCollider(colliderDesc);
					this.colliders.push(collider);
				}
			}
		} catch (error) {
			console.error("Failed to initialize physics for LandingPlane:", error);
			// Create a fallback simple collider if physics initialization fails
			try {
				const fallbackRb = rapierWorld.createRigidBody(
					RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0)
				);
				this.rigidBodies.push(fallbackRb);
				
				const fallbackCollider = rapierWorld.createCollider(
					RAPIER.ColliderDesc.cuboid(5, 0.1, 5) // A flat plane-like collider
				);
				this.colliders.push(fallbackCollider);
				console.log("Created fallback physics for LandingPlane");
			} catch (fallbackError) {
				console.error("Failed to create fallback physics for LandingPlane:", fallbackError);
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
		for (const collider of this.colliders) {
			rapierWorld.removeCollider(collider, false);
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

function initializeMesh(): THREE.Mesh {
	const landingPlaneGeometry = new THREE.PlaneGeometry(20, 20);
	const landingPlaneMaterial = new THREE.MeshStandardMaterial({
		color: 0x555555,
		roughness: 0.8,
		metalness: 0.2,
	});

	const landingPlane = new THREE.Mesh(
		landingPlaneGeometry,
		landingPlaneMaterial
	);
	landingPlane.rotation.x = -Math.PI / 2;
	landingPlane.position.y = 0;
	landingPlane.receiveShadow = true;

	return landingPlane;
}

function initializePhysicsAttributes(object: THREE.Object3D): {
	rbDesc: RAPIER.RigidBodyDesc;
	collidersDesc: RAPIER.ColliderDesc[];
} {
	const { rbDesc, collidersDesc } = getTrimeshBodyAndColliders(object);
	return { rbDesc, collidersDesc };
}
