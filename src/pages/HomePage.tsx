import GeckoLoader from "@/src/_components/LoadingSpinner/GeckoLoader";
import { Link } from "react-router";

export default function HomePage() {
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
			<Link to={"/gecko-game"}>
				<GeckoLoader />
			</Link>
		</div>
	);
}
