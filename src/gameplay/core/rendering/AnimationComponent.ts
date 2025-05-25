import * as THREE from "three";
import { Component } from "../ec-s/Component";
import type { Entity } from "../ec-s/Entity";

export interface IAnimatableEntity extends Entity {
	animation: THREE.AnimationClip;
	initAnimation(): void;
	updateAnimation(deltaTime: number): void;
	disposeAnimation(): void;
}

export class AnimationComponent extends Component<IAnimatableEntity> {
	constructor(entity: IAnimatableEntity) {
		super(entity);
	}
}
