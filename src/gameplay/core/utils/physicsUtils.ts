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
			const worldMatrix = new THREE.Matrix4();
			mesh.updateMatrixWorld(true);
			worldMatrix.copy(mesh.matrixWorld);
			const positionAttr = geometry.getAttribute("position");
			if (!positionAttr) return;
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
			const vertices: number[] = [];
			const tempVec = new THREE.Vector3();
			for (let i = 0; i < positionAttr.count; i++) {
				tempVec.fromBufferAttribute(positionAttr, i);
				tempVec.applyMatrix4(worldMatrix);
				vertices.push(tempVec.x, tempVec.y, tempVec.z);
			}
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
		}
	});

	return { rbDesc, collidersDesc };
}
