import { Link as LinkIcon } from "@mui/icons-material";
import { BoxProps, TextField } from "@mui/material";
import { InputAdornment } from "@mui/material";
import { forwardRef, useRef } from "react";

interface GreetingFunctions {
  submit?: (input: string) => unknown
}
interface GreetingProps extends BoxProps {
  className?: string,
  style?: React.CSSProperties,
  functions: GreetingFunctions
}

export const Main = forwardRef<HTMLDivElement, GreetingProps>(
  ({ className, style, functions }, ref) => {
    const input = useRef<string>("");

    function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      if (e.key !== "Enter") return;
      if (!functions.submit) console.log(`submitted: ${input.current}`);
      else functions.submit!(input.current);
    }

    return (
      <div
        className={(() => {
          return [
            "flex",
            "flex-col",
            "h-full",
            "w-full",
            "justify-center",
            "items-center",
            className
          ].join(" ");
        })()}
        style={style}
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
      </div>
    );
  }
);

export default Main;