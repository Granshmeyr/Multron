import LinkIcon from "@mui/icons-material/Link";
import { Box, BoxProps, TextField } from "@mui/material";
import InputAdornment from "@mui/material/InputAdornment";
import { forwardRef, useRef } from "react";

interface CustomBoxProps extends BoxProps {
  fn?: (input: string) => unknown
}

export const Main = forwardRef<HTMLDivElement, CustomBoxProps>(
  ({ fn }, ref) => {
    const input = useRef<string>("");

    function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      if (e.key !== "Enter") return;
      switch (fn === undefined) {
      case true: console.log(`submitted: ${input.current}`); break;
      default: fn!(input.current); break;
      }
    }

    return (
      <Box
        className={(() => {
          return [
            "flex",
            "flex-col",
            "h-full",
            "w-full",
            "justify-center",
            "items-center"
          ].join(" ");
        })()}
        ref={ref}
      >
        <TextField
          className="w-8/12"
          label="Set URL"
          variant="filled"
          onChange={(e) => { input.current = e.target.value; }}
          onKeyDown={(e) => { onKeyDown(e); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkIcon />
              </InputAdornment>
            ),
          }}
        >
        </TextField>
      </Box>
    );
  }
);

export default Main;