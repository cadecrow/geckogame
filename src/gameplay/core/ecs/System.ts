import type { Entity, EntityId } from "./Entity";

export abstract class System {
	protected readonly entities: Map<EntityId, Entity>;

	constructor(entities: Map<EntityId, Entity>) {
		this.entities = entities;
	}
	// Optional: common methods that derived systems can override
	// init?(): void;
	// update?(deltaTime: number): void;
	// dispose?(): void;
}
