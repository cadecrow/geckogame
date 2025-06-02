import * as RAPIER from "@dimforge/rapier3d-compat";
import { Component } from "../ec-s/Component";
import type { Entity } from "../ec-s/Entity";

export interface IPhysicsEntity extends Entity {
	rigidBodies: RAPIER.RigidBody[];
	colliders: RAPIER.Collider[];
	initPhysics(rapierWorld: RAPIER.World): void; // is there a good way to make this generic? sometimes, there will be multiple colliders and rigid bodies for a given entity
	updatePhysics(deltaTime: number, rapierWorld: RAPIER.World): void;
	disposePhysics(rapierWorld: RAPIER.World): void;
}

export class PhysicsComponent extends Component<IPhysicsEntity> {
	constructor(entity: IPhysicsEntity) {
		super(entity);
	}
}
