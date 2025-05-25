import type { Entity } from "./Entity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponentConstructor = ComponentConstructor<Component<any>, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = Component<any>;

export type ComponentConstructor<
	TComponent extends Component<TEntity>,
	TEntity extends Entity
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
> = new (...args: any[]) => TComponent;

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
