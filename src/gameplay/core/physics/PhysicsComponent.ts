import * as RAPIER from "@dimforge/rapier3d-compat";
import { Entity } from "../entity/Entity";

export class PhysicsComponent {
	public entity: Entity;
	public rbDesc: RAPIER.RigidBodyDesc;
	public colliderDesc: RAPIER.ColliderDesc;
	public rigidBody: RAPIER.RigidBody;
	public collider: RAPIER.Collider;

	constructor(
		entity: Entity,
		rbDesc: RAPIER.RigidBodyDesc,
		colliderDesc: RAPIER.ColliderDesc
	) {
		this.entity = entity;
		this.rbDesc = rbDesc;
		this.colliderDesc = colliderDesc;
	}
}
