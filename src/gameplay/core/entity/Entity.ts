import type { EventSystem } from "../events/EventSystem";
import type { AnimationComponent } from "../rendering/AnimationComponent";
import type { PhysicsComponent } from "../physics/PhysicsComponent";
import type { RenderingComponent } from "../rendering/RenderingComponent";

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
	public readonly events: EventSystem;
	public readonly id: EntityId;
	public readonly renderingComponent: RenderingComponent;
	public readonly physicsComponent?: PhysicsComponent;
	public readonly animationComponent?: AnimationComponent;

	constructor(
		events: EventSystem,
		id: EntityId,
		renderingComponent: RenderingComponent,
		physicsComponent?: PhysicsComponent,
		animationComponent?: AnimationComponent
	) {
		this.events = events;
		this.id = id;
		this.renderingComponent = renderingComponent;
		this.physicsComponent = physicsComponent;
		this.animationComponent = animationComponent;
	}
}
