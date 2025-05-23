import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { Entity, type EntityId } from "../core/ecs/Entity";
import { getTrimeshBodyAndColliders } from "../core/utils/physicsUtils";
import type { EventSystem } from "../core/events/EventSystem";
import type { RenderingComponent } from "../core/rendering/RenderingComponent";
import type { PhysicsComponent } from "../core/physics/PhysicsComponent";

// Definitions for entity
const ENTITY_ID: EntityId = "landing_plane";

export class LandingPlane extends Entity {
	private readonly renderingComponent: RenderingComponent;
	private readonly physicsComponent: PhysicsComponent;

	constructor(events: EventSystem) {
		const renderingComponent = new RenderingComponent(this);
		const physicsComponent = new PhysicsComponent(this);
		
		super(events, ENTITY_ID, renderingComponent, physicsComponent);
		this.events.emit("entity_render_init_request", () => {});
		this.events.emit("entity_physics_init_request", () => {});
	}
	
	this.initRender // Help Here
}// const landingPlane = initializeRenderingAttributes();
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

function initializePhysicsAttributes(model: THREE.Object3D): {
	rbDesc: RAPIER.RigidBodyDesc;
	collidersDesc: RAPIER.ColliderDesc[];
} {
	const { rbDesc, collidersDesc } = getTrimeshBodyAndColliders(model);
	return { rbDesc, collidersDesc };
}
