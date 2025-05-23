import type { EventSystem } from "../events/EventSystem";
import type { Component, ComponentConstructor } from "./Component";

// entities take care of loading their models and storing properties related to themselves which other systems need.
// physics and rendering systems are responsible for updating the entity
// entities do not directly have access to controls or the scene graph or physics
// entities are meant to load up their information so the renderer and physics system can use them

// handling updates to things like animation, rotation, scale, velocity, etc. is the responsibility of the physics and rendering systems
// entities can store properties to be consumed and altered by the physics and rendering systems
// the physics and rendering systems may alter things like position in the entity properties

// Registered Entities
export type EntityId =
	| "player"
	| "starship"
	| "landing_plane"
	| "loading_screen";

export class Entity {
	protected readonly events: EventSystem;
	public readonly id: EntityId;
	private components: Map<ComponentConstructor<Component>, Component> =
		new Map();

	constructor(events: EventSystem, id: EntityId) {
		this.events = events;
		this.id = id;
	}

	protected addComponent<T extends Component>(component: T): T {
		const ComponentClass = component.constructor as ComponentConstructor<T>;
		this.components.set(ComponentClass, component);
		return component;
	}

	protected removeComponent<T extends Component>(component: T): void {
		const ComponentClass = component.constructor as ComponentConstructor<T>;
		this.components.delete(ComponentClass);
	}

	public getComponent<T extends Component>(
		componentClass: ComponentConstructor<T>
	): T | undefined {
		return this.components.get(componentClass) as T;
	}
}
