import * as THREE from "three";
import { Component } from "../ecs/Component";
import type { Entity } from "../ecs/Entity";
// even if entities are static and have no animations,
// they still need an updateRender method
// this is because the rendering manager needs to call updateRender on all entities
// if an entity is static with no animations, the updateRender method will do nothing
// it is still better to immediately return from the updateRender method rather than doing a bunch of conditional checks in the render manager
// @todofun - fun - try some actual perf benchmarks to compare conditional checks vs immediately returning in update function

export interface IRenderableEntity extends Entity {
	group: THREE.Group; // Example: If the component needs to manipulate the entity's root group
	// ---
	initRender(): void;
	updateRender(deltaTime: number): void;
	disposeRender(): void;
}

export class RenderingComponent extends Component<IRenderableEntity> {
	constructor(entity: IRenderableEntity) {
		super(entity);
	}
}
