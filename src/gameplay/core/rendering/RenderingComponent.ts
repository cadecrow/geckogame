import * as THREE from "three";
import { Component } from "../ec-s/Component";
import type { Entity } from "../ec-s/Entity";

// even if entities are static and have no animations,
// they still need an updateRender method
// this is because the rendering manager needs to call updateRender on all entities
// if an entity is static with no animations, the updateRender method will do nothing
// it is still better to immediately return from the updateRender method rather than doing a bunch of conditional checks in the render manager
// @todofun - fun - try some actual perf benchmarks to compare conditional checks vs immediately returning in update function

export interface IRenderableEntity extends Entity {
	group: THREE.Group;
	initRendering(): void;
	updateRendering(deltaTime: number): void;
	disponseRendering(): void;
}

export class RenderingComponent extends Component<IRenderableEntity> {
	constructor(entity: IRenderableEntity) {
		super(entity);
	}
}
