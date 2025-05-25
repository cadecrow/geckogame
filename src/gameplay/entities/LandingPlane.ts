import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { Entity, type EntityId } from "../core/ec-s/Entity";
import { getTrimeshBodyAndColliders } from "../core/utils/physicsUtils";
import type { EventSystem } from "../core/events/EventBus";
import { RenderingComponent } from "../core/rendering/RenderingComponent";
import { PhysicsComponent } from "../core/physics/PhysicsComponent";

// Definitions for entity
const ENTITY_ID: EntityId = "landing_plane";

export class LandingPlane extends Entity {
	public readonly group: THREE.Group = new THREE.Group();
	public readonly rigidBodies: RAPIER.RigidBody[] = [];
	public readonly colliders: RAPIER.Collider[] = [];

	constructor(events: EventSystem) {
		super(events, ENTITY_ID);
		// this.events.emit("entity_render_init_request", () => {});
		// this.events.emit("entity_physics_init_request", () => {});
		this.addComponent(new RenderingComponent(this));
		this.addComponent(new PhysicsComponent(this));
	}

	public initRender(): void {}

	public initPhysics(): void {}

	public updateRender(deltaTime: number): void {}

	public updatePhysics(deltaTime: number): void {}

	public destroyRender(): void {}

	public destroyPhysics(): void {}
}
// this.initRender // Help Here
// const landingPlane = initializeRenderingAttributes();
// const { rbDesc, collidersDesc } = initializePhysicsAttributes(landingPlane);

function initializeRenderingAttributes(): THREE.Mesh {
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
