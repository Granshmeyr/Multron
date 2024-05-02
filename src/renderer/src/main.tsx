import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ScopedCssBaseline, ThemeProvider } from "@mui/material";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./index.css";
import * as Themes from "../common/themes";
//import TilesApp from "./apps/Tiles";
//import TilesGreeting from "./apps/app-components/TilesGreeting";
import PieWrapper from "./apps/app-components/PieWrapper";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={Themes.dark}>
      <ScopedCssBaseline>
        <PieWrapper
          buttons={{
            middle: { icon: "error", opacity: 0.5 }
          }}
        >
          <div className="flex h-screen w-screen bg-pink-500"></div>
        </PieWrapper>
      </ScopedCssBaseline>
    </ThemeProvider>
  </React.StrictMode>
);
