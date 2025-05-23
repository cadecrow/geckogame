import type { Entity } from "./Entity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentConstructor<T extends Component> = new (...args: any[]) => T;

export abstract class Component {
	public readonly entity: Entity;

	constructor(entity: Entity) {
		this.entity = entity;
	}
	// Optional: common lifecycle methods that derived components can override
	// init?(): void;
	// update?(deltaTime: number): void;
	// dispose?(): void;
}
