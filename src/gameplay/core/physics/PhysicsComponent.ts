import * as RAPIER from "@dimforge/rapier3d-compat";
import { Component } from "../ecs/Component";
import type { Entity } from "../ecs/Entity";

export interface IPhysicsEntity extends Entity {
	rigidBodies: RAPIER.RigidBody[];
	colliders: RAPIER.Collider[];
	initPhysics(): void; // is there a good way to make this generic? sometimes, there will be multiple colliders and rigid bodies for a given entity
	updatePhysics(deltaTime: number): void;
	disposePhysics(): void;
}

export class PhysicsComponent extends Component {
	constructor(entity: IPhysicsEntity) {
		super(entity);
	}
}
