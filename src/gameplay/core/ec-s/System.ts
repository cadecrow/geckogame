import type { EntityManager } from "./EntityManager";

export abstract class System {
	protected readonly entityManager: EntityManager;

	constructor(entityManager: EntityManager) {
		this.entityManager = entityManager;
	}
}
