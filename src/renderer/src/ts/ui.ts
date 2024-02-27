export function showSplitMenu(event: React.MouseEvent): void {
  event.preventDefault();
  // @ts-expect-error electron exposed interface
  window.electron.showSplitMenu();
}