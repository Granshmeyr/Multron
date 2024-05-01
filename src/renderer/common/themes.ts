import { createTheme } from "@mui/material";

export const dark = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#272526ff"
    },
    primary: {
      main: "#ffffff"
    },
    text: {
      primary: "#ffffff",
    }
  }
});