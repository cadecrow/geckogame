import type { EntityManager } from "./EntityManager";

export abstract class System {
	protected readonly entityManager: EntityManager;

	constructor(entityManager: EntityManager) {
		this.entityManager = entityManager;
	}
	// Optional: common methods that derived systems can override
	// init?(): void;
	// update?(deltaTime: number): void;
	// dispose?(): void;
}
