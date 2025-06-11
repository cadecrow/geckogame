import { Entity, type EntityId } from "./Entity";
import type { Component, ComponentConstructor } from "./Component";
import { hasDisposeMethod } from "../../../_utils/Typeguards";
import { EventBus } from "../events/EventBus";

export class EntityManager {
	public readonly entities: Map<EntityId, Entity> = new Map();
	private readonly events: EventBus;

	constructor(events: EventBus) {
		this.events = events;
	}

	public dispose(): void {
		console.log("Destroying EntityManager");
		for (const entity of this.entities.values()) {
			this.disposeEntity(entity);
		}
		this.entities.clear();
	}

	// ---

	public addEntity(entity: Entity): void {
		if (this.entities.has(entity.id)) {
			console.warn(`Entity with ID ${entity.id} already exists. Replacing.`);
		}
		this.entities.set(entity.id, entity);
		this.events.emit("entity_added_to_manager", {
			entity,
		});
	}

	public getEntity(id: EntityId): Entity | undefined {
		return this.entities.get(id);
	}

	public removeEntity(id: EntityId): boolean {
		const entity = this.entities.get(id);
		if (entity) {
			console.log(`EntityManager: Removing entity ${id}`);
			this.disposeEntity(entity);
			this.events.emit("entity_disposed", { entityId: id });
			return true;
		} else {
			console.warn(`EntityManager: Entity ${id} not found for removal`);
			return false;
		}
	}

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

	// ---
	// Implement so that disposal is triggered for all attached components and relevant systems.
	private disposeEntity(entity: Entity): void {
		if (hasDisposeMethod(entity)) {
			entity.dispose();
		} else {
			console.warn(`Entity ${entity.id} does not have a dispose method.`);
		}
		this.entities.delete(entity.id);
	}
}
