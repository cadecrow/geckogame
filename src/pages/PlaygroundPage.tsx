import GeckoLoader from "@/src/_components/LoadingSpinner/GeckoLoader";

export default function PlaygroundPage() {
	return (
		<div
			style={{
				alignContent: "center",
				alignItems: "center",
				justifyItems: "center",
				textAlign: "center",
				height: "100vh",
				width: "100vw",
			}}
		>
			<GeckoLoader />
		</div>
	);
}
