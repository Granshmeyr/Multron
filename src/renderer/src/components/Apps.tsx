import { ReactElement } from "react";
import ScopedCssBaseline from "@mui/material/ScopedCssBaseline";
import TilesApp from "./Tiles";
import SettingsApp from "./Settings";

export function Tiles(): ReactElement {
  return (
    <ScopedCssBaseline>
      <TilesApp></TilesApp>
    </ScopedCssBaseline>
  );
}
export function Settings(): ReactElement {
  return (
    <ScopedCssBaseline>d
      <SettingsApp></SettingsApp>
    </ScopedCssBaseline>
  );
}