import type { EventBus } from "../events/EventBus";
import type {
	AnyComponent,
	AnyComponentConstructor,
	Component,
	ComponentConstructor,
} from "./Component";

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
	protected readonly events: EventBus;
	public readonly id: EntityId;
	private components: Map<AnyComponentConstructor, AnyComponent> = new Map();

	constructor(events: EventBus, id: EntityId) {
		this.events = events;
		this.id = id;
	}

	// --- Protected Methods ---

	protected addComponent<
		TComponent extends Component<TEntity>,
		TEntity extends Entity
	>(component: TComponent): TComponent {
		const ComponentClass = component.constructor as ComponentConstructor<
			TComponent,
			TEntity
		>;
		this.components.set(ComponentClass, component);
		return component;
	}

	protected removeComponent<
		TComponent extends Component<TEntity>,
		TEntity extends Entity
	>(component: TComponent): void {
		const ComponentClass = component.constructor as ComponentConstructor<
			TComponent,
			TEntity
		>;
		this.components.delete(ComponentClass);
	}

	// --- Public Methods ---

	public getComponent<
		TComponent extends Component<TEntity>,
		TEntity extends Entity
	>(
		componentClass: ComponentConstructor<TComponent, TEntity>
	): TComponent | undefined {
		return this.components.get(componentClass) as TComponent;
	}

	public hasComponent<
		TComponent extends Component<TEntity>,
		TEntity extends Entity
	>(componentClass: ComponentConstructor<TComponent, TEntity>): boolean {
		return this.components.has(componentClass);
	}
}
