import * as THREE from "three";
import { Component } from "../ecs/Component";
import type { Entity } from "../ecs/Entity";

export interface IAnimatableEntity extends Entity {
	animation: THREE.AnimationClip;
	updateAnimation(deltaTime: number): void;
}

export class AnimationComponent extends Component {
	constructor(entity: IAnimatableEntity) {
		super(entity);
	}
}
