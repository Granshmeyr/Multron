import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ScopedCssBaseline, ThemeProvider } from "@mui/material";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./index.css";
import TilesApp from "../src/apps/Tiles";
//import TilesGreeting from "../src/apps/app-components/TilesGreeting";
import * as Themes from "../common/themes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={Themes.dark}>
      <ScopedCssBaseline>
        <TilesApp></TilesApp>
      </ScopedCssBaseline>
    </ThemeProvider>
  </React.StrictMode>
);
