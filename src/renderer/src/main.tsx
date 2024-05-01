import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ScopedCssBaseline } from "@mui/material";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./index.css";
//import TilesApp from "../src/apps/Tiles";
import TilesGreeting from "../src/apps/app-components/TilesGreeting";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ScopedCssBaseline><TilesGreeting></TilesGreeting></ScopedCssBaseline>
  </React.StrictMode>
);
