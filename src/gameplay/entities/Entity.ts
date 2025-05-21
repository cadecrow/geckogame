import * as THREE from "three";
import type { RenderType } from "../rendering/RenderingManager";
import type { PhysicsType } from "../physics/PhysicsManager";

// entities take care of loading their models and storing properties related to themselves which other systems need.
// physics and rendering systems are responsible for updating the entity
// entities do not directly have access to controls or the scene graph or physics
// entities are meant to load up their information so the renderer and physics system can use them

// handling updates to things like animation, rotation, scale, velocity, etc. is the responsibility of the physics and rendering systems

export type EntityAnimationMap = Map<string, THREE.AnimationAction>;

export type EntityId = "player" | "starship" | "landing_plane";

export interface EntityProperties {
	id: EntityId;
	renderType: RenderType;
	physicsType: PhysicsType;
}

export const ENTITY_REGISTRY: Record<EntityId, EntityProperties> = {
	player: {
		id: "player",
		renderType: "kinematic",
		physicsType: "dynamic",
	},
	starship: {
		id: "starship",
		renderType: "static",
		physicsType: "static",
	},
	landing_plane: {
		id: "landing_plane",
		renderType: "static",
		physicsType: "static",
	},
} as const;

export class Entity {
	public id: EntityId;
	public renderType: RenderType;
	public physicsType: PhysicsType;

	constructor(id: EntityId) {
		this.id = id;
		this.renderType = ENTITY_REGISTRY[id].renderType;
		this.physicsType = ENTITY_REGISTRY[id].physicsType;
	}
}
