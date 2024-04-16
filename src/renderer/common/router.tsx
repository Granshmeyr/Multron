import { createBrowserRouter } from "react-router-dom";
import * as Apps from "../src/components/Apps";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Apps.Tiles></Apps.Tiles>,
  },
  {
    path: "/settings",
    element: <Apps.Settings></Apps.Settings>
  }
]);