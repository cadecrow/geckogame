import type { Entity } from "../entity/Entity";

export class Component {
	private readonly entity: Entity;

	constructor(entity: Entity) {
		this.entity = entity;
	}
}
