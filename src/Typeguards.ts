/* eslint-disable @typescript-eslint/no-explicit-any */

export function hasDisposeMethod(obj: any): obj is { dispose: () => void } {
	return (
		typeof obj === "object" &&
		obj !== null &&
		typeof (obj as any).dispose === "function"
	);
}
