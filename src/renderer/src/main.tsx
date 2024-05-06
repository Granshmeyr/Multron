import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ScopedCssBaseline, ThemeProvider } from "@mui/material";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import * as Themes from "../common/themes";
import Overlay from "./apps/Overlay";
import TilesApp from "./apps/Tiles";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ScopedCssBaseline>
        <TilesApp />
      </ScopedCssBaseline>
    )
  },
  {
    path: "/overlay",
    element: <Overlay />
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={Themes.dark}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);
