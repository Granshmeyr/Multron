import { TextField } from "@mui/material";
import { ReactElement, ReactNode } from "react";

export default function Main(): ReactElement {
  function root(child: ReactElement): ReactElement {
    return <div className="h-screen w-full">{child}</div>;
  }

  const element: ReactElement = (
    root(
      <div className="flex-col h-full w-full justify-center items-center">
        <div
          className="bg-primary flex h-full w-full justify-center items-center"
        >
          <TextField
            id="filled-basic"
            label="filled"
            variant="filled"
          >
          </TextField>
        </div>
      </div>
    )
  );

  return element;
}