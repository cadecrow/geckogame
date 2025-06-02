import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";

export function getTrimeshBodyAndColliders(model: THREE.Object3D): {
	rbDesc: RAPIER.RigidBodyDesc;
	collidersDesc: RAPIER.ColliderDesc[];
} {
	// Get the model's position to apply to the rigid body
	const modelPosition = model.position;

	// Create a rigid body with the same position as the model
	const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
		modelPosition.x,
		modelPosition.y,
		modelPosition.z
	);

	const collidersDesc: RAPIER.ColliderDesc[] = [];

	model.traverse((child) => {
		if (child instanceof THREE.Mesh && child.geometry) {
			const mesh = child as THREE.Mesh;
			const geometry = mesh.geometry;
			
			// Ensure geometry is up to date
			geometry.computeBoundingBox();
			
			const worldMatrix = new THREE.Matrix4();
			mesh.updateMatrixWorld(true);
			worldMatrix.copy(mesh.matrixWorld);
			
			const positionAttr = geometry.getAttribute("position");
			if (!positionAttr || positionAttr.count < 3) {
				console.warn("Skipping mesh with insufficient vertices");
				return;
			}

			const indices: number[] = [];
			if (geometry.index) {
				const indexAttr = geometry.index;
				const indexCount = indexAttr.count;
				for (let i = 0; i < indexCount; i++) {
					indices.push(indexAttr.getX(i));
				}
			} else {
				// If no indices, create sequential indices
				for (let i = 0; i < positionAttr.count; i++) {
					indices.push(i);
				}
			}

			// Validate that we have a valid number of indices for triangles
			if (indices.length < 3 || indices.length % 3 !== 0) {
				console.warn("Skipping mesh with invalid triangle indices");
				return;
			}

			const vertices: number[] = [];
			const tempVec = new THREE.Vector3();
			for (let i = 0; i < positionAttr.count; i++) {
				tempVec.fromBufferAttribute(positionAttr, i);
				tempVec.applyMatrix4(worldMatrix);
				
				// Validate vertex coordinates are finite
				if (!isFinite(tempVec.x) || !isFinite(tempVec.y) || !isFinite(tempVec.z)) {
					console.warn("Skipping mesh with invalid vertex coordinates");
					return;
				}
				
				vertices.push(tempVec.x, tempVec.y, tempVec.z);
			}

			// Validate that we have valid data before creating the collider
			if (vertices.length === 0 || indices.length === 0) {
				console.warn("Skipping mesh with no valid geometry data");
				return;
			}

			try {
				const colliderDesc = RAPIER.ColliderDesc.trimesh(
					new Float32Array(vertices),
					new Uint32Array(indices)
				);

				collidersDesc.push(colliderDesc);

				console.log(
					`Created trimesh collider with ${vertices.length / 3} vertices and ${
						indices.length / 3
					} triangles`
				);
			} catch (error) {
				console.error("Failed to create trimesh collider:", error);
				// Fallback to a simple box collider if trimesh fails
				const boundingBox = geometry.boundingBox;
				if (boundingBox) {
					const size = boundingBox.getSize(new THREE.Vector3());
					const boxCollider = RAPIER.ColliderDesc.cuboid(
						size.x / 2,
						size.y / 2, 
						size.z / 2
					);
					collidersDesc.push(boxCollider);
					console.log("Created fallback box collider");
				}
			}
		}
	});

	// If no colliders were created, add a default box collider
	if (collidersDesc.length === 0) {
		console.warn("No valid mesh found, creating default box collider");
		const defaultCollider = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
		collidersDesc.push(defaultCollider);
	}

	return { rbDesc, collidersDesc };
}
