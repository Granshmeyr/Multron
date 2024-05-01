import LinkIcon from "@mui/icons-material/Link";
import { Box, BoxProps, TextField } from "@mui/material";
import InputAdornment from "@mui/material/InputAdornment";
import { ReactElement, forwardRef, useRef } from "react";
import * as ich from "../../../../common/ipcChannels";

interface CustomBoxProps extends BoxProps {
  nodeId?: string
}

export const Main = forwardRef<HTMLDivElement, CustomBoxProps>(
  ({ nodeId }, ref) => {
    const input = useRef<string>("");

    function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
      if (e.key === "Enter") {
        window.electronAPI.send(ich.setViewUrl, nodeId, input.current);
      }
    }

    const element: ReactElement = (
      <Box
        className="
            flex
            flex-col
            h-full
            w-full
            justify-center
            items-center"
        ref={ref}
      >
        <TextField
          className="w-8/12"
          id="filled-basic"
          label="Set URL"
          variant="filled"
          onChange={(e) => { input.current = e.target.value; }}
          onKeyDown={(e) => { onKeyDown(e); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkIcon></LinkIcon>
              </InputAdornment>
            ),
          }}
        >
        </TextField>
      </Box>
    );

    return element;
  }
);

export default Main;