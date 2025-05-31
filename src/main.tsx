import React from "react";
import ReactDom from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router";

// import GeckoGamePage from "./pages/GeckoGamePage";
import PlaygroundPage from "./pages/PlaygroundPage";
import NotFoundPage from "./pages/NotFoundPage";

const router = createBrowserRouter([
	{
		path: "/",
		Component: PlaygroundPage,
	},
	{
		path: "/playground",
		Component: PlaygroundPage,
	},
	// {
	// 	path: "/gecko-game",
	// 	Component: GeckoGamePage,
	// },
	{
		path: "*",
		Component: NotFoundPage,
	},
]);

ReactDom.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
);
