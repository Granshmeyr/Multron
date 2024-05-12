import Dialog from "@mui/material/Dialog";
import { useState } from "react";

export default function Main() {
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formJson = Object.fromEntries((formData).entries());
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ component: "form", onSubmit: onSubmit }}
    >
    </Dialog>
  );
}