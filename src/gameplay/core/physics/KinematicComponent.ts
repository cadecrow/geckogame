import * as RAPIER from "@dimforge/rapier3d-compat";
import { Component } from "../ec-s/Component";
import type { Entity } from "../ec-s/Entity";

export interface IKinematicPlayerEntity extends Entity {
	// entity has its own orientation relative to main world.
	// For example, forward for an entity may not be in the same direction as the world's forward
	orientationOffset: RAPIER.Quaternion;
	// forces being applied to the entity at any given time. Forces are applied according to the entity's orientationOffset
	forces: RAPIER.Vector3;
	// entity has a position must be updated over time
	position: RAPIER.Vector3;
}

export class KinematicPlayerComponent extends Component<IKinematicPlayerEntity> {
	constructor(entity: IKinematicPlayerEntity) {
		super(entity);
	}
}
