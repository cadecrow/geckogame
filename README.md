# GeckoGame

## Hybrid EC & ECS Engine (EC/S) with Event Bus
The engine for this game lives in between an Entity-Component (EC) Architecture and an Entity-Component-System (ECS) Architecture. EC is a bit OOP like, and ECS is Data-Oriented.

Creating a hybrid EC/ECS (EC/S) Architecture that can later be morphed into ECS is a good practice for creating a game that can grow over time. The EC like architecture is good to prevent premature optimization and abstraction while the game is small. Then, when the game expands, its easier to refactor over time if a pure ECS Architecture is necessary to manage the scope and complexity of a larger game. The initial hybrid EC/ECS modules can be progressively refactored into a pure ECS architecture over iterations while new modules with pure ECS implementations are added, rather than requiring a full refactor of the EC system into ECS before new pure ECS modules can be implemented.

### EC Architecture

### ECS Architecture
Entities = A collection of components that represent some entity.
Components = Arrays of data representing some component.
Systems = Perform logic and updates on entities based on the components that are present.

Note: Entities and Components only store data. They are not meant to store logic.

### Hybrid System (EC/S)
Systems and Components require Entities to implement certain primitive methods that will be executed by the systems.
The common primitive methods are:
- initComponent() => void
- updateComponent(deltaTime) => void
- destroyComponent() => void

Entities will implement their custom logic for these primitives. For example, an entity may be stationary but have a body and colliders, so it needs to be included in the Physics System. StationaryEntity will have a physics component, but it does not need to implement any logic in updatePhysics(deltaTime), so it can immediately return. Now, a dynamic entity, like a Ball within a scene, will need a body and colliders, but it will also need to include logic to update it's physics on every frame. The exact logic will be left to be implemented within the primitive updatePhysics(deltaTime) method in BallEntity. The Physics System will trigger execution of the primitive method updatePhysics() for the BallEntity and all other entities.

As more and more entities are added to the game, patterns within their attached components and custom implementations of the primitive methods will begin to emerge. As these patterns emerge, it will begin to make sense to abstract specific methods into the systems for handling of entities with specific components and combinations of components. Systems can evolve over iterations where they are still executing primitives for older entities alongside execution of the specific methods for newly added entities with specific components and no primitive methods.