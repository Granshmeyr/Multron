---
tags:
  - tile
---
## Program operations

For specific operations I'll just use a menu bar, preferably a custom one

## IPC functions

**setGeometry()**
- `key`
- geometry: `Geometry`

Called when Tile is created or resized. Called on every child Tile as well.

**setURL()**
- `key`
- url: `string`

Called when user changes a Tile's set URL.

## BrowserView

**Edit mode**

Entering edit mode in the program will  shrink every Tile inwards from their border (therefore shrinking the BrowserView because setGeometry() would be called).
After this, handlebars / other GUI will appear in the border margin created.