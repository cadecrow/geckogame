import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { Entity, type EntityId } from "./Entity";
import { getTrimeshBodyAndColliders } from "../physics/physicsHelpers";

// Definitions for entity
const ENTITY_ID: EntityId = "landing_plane";

export class LandingPlane extends Entity {
	// rendering descriptions
	public mesh: THREE.Mesh;
	// physics descriptions
	public rbDesc: RAPIER.RigidBodyDesc;
	public collidersDesc: RAPIER.ColliderDesc[];

	constructor() {
		super(ENTITY_ID);

		// create model and animation actions
		const landingPlane = this.initializeRenderingAttributes();
		this.mesh = landingPlane;

		// create physics attributes
		const { rbDesc, collidersDesc } = this.initializePhysicsAttributes(
			this.mesh
		);
		this.rbDesc = rbDesc;
		this.collidersDesc = collidersDesc;
	}

	private initializeRenderingAttributes(): THREE.Mesh {
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

	private initializePhysicsAttributes(model: THREE.Object3D): {
		rbDesc: RAPIER.RigidBodyDesc;
		collidersDesc: RAPIER.ColliderDesc[];
	} {
		const { rbDesc, collidersDesc } = getTrimeshBodyAndColliders(model);
		return { rbDesc, collidersDesc };
	}
}
