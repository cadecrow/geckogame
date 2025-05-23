import * as THREE from "three";
// even if entities are static and have no animations,
// they still need an updateRender method
// this is because the rendering manager needs to call updateRender on all entities
// if an entity is static with no animations, the updateRender method will do nothing
// it is still better to immediately return from the updateRender method rather than doing a bunch of conditional checks in the render manager
// @todofun - fun - try some actual perf benchmarks to compare conditional checks vs immediately returning in update function

import type { Entity } from "../entity/Entity";

export class RenderingComponent {
	private readonly entity: Entity;
	public readonly group: THREE.Group;
	public readonly initRender: () => void;
	public readonly updateRender: (deltaTime: number) => void;
	public readonly disposeRender: () => void;

	constructor(
		entity: Entity,
		initRender: () => void,
		updateRender: (deltaTime: number) => void,
		disposeRender: () => void
	) {
		this.entity = entity;
		this.group = new THREE.Group();
		this.initRender = initRender;
		this.updateRender = updateRender;
		this.disposeRender = disposeRender;
	}
}
