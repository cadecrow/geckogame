import type { Entity } from "./Entity";

export type ComponentConstructor<
	T extends Component<TEntity>,
	TEntity extends Entity
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
> = new (...args: any[]) => T;

export abstract class Component<TEntity extends Entity> {
	public readonly entity: TEntity;

	constructor(entity: TEntity) {
		this.entity = entity;
	}
	// Optional: common lifecycle methods that derived components can override
	// init?(): void;
	// update?(deltaTime: number): void;
	// dispose?(): void;
}
