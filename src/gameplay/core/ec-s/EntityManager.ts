import { Entity, type EntityId } from "./Entity";
import type { Component, ComponentConstructor } from "./Component";

export class EntityManager {
	public readonly entities: Map<EntityId, Entity> = new Map();

	public addEntity(entity: Entity): void {
		if (this.entities.has(entity.id)) {
			console.warn(`Entity with ID ${entity.id} already exists. Replacing.`);
		}
		this.entities.set(entity.id, entity);
	}

	public getEntity(id: EntityId): Entity | undefined {
		return this.entities.get(id);
	}

	/*
  // Implement so that disposal is triggered for all attached components and relevant systems.
  disposeEntity(entity: Entity): void {
		this.entities.delete(entity.id);
	}
  */

	public getEntitiesHavingComponent<
		TComponent extends Component<TEntity>,
		TEntity extends Entity
	>(ComponentClass: ComponentConstructor<TComponent, TEntity>): TEntity[] {
		const result: TEntity[] = [];
		for (const entity of this.entities.values()) {
			if (entity.hasComponent(ComponentClass)) {
				result.push(entity as TEntity);
			}
		}
		return result;
	}
}
