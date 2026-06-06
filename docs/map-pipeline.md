# Shrouded Front Map Pipeline

## Goal

Maps are split into a visual background and gameplay data. The background should carry terrain mood only. Sector labels, unit markers, boundaries, selection state, reports, and legend panels are rendered by the app.

## Background Asset Rules

- No text, labels, numbers, legend, grid, UI panels, captions, or sector names in the image.
- No baked sector boundary dotted lines unless explicitly producing a boundary-only layer.
- Use the gameplay coordinate target `viewBox 0 0 1200 820`.
- Keep the style consistent: muted military palette, top-down tactical map, visible relief, forest masses, roads, rivers, and ridges.
- Store map backgrounds under `assets/maps/` for new maps.

## Map Data Rules

Every map object should include:

- `id`, `name`, `description`, `summary`
- `mission.title`, `mission.briefing`
- `startSectorId`
- `commAnchors`
- `viewBox`
- `background.href`
- `grid`
- `layers.rivers`, `layers.roads`, `layers.bridgeCrossingPoints`
- `sectors`

Every sector should include:

- `id`
- `code`
- `terrain`
- `terrainLabel`
- `role`
- `center`
- `labelPoint`
- `polygon`
- `neighbors`
- optional `elevation`, `features`, `landmarks`, `notes`, `hiddenEnemySummary`

## Sector Editing Checklist

- Keep `labelPoint` inside the sector polygon.
- Keep `neighbors` valid and preferably bidirectional.
- Update `startSectorId` and `commAnchors` if `D5` or `D3` changes.
- Move any hidden enemy or friendly setup data when splitting or merging sectors.
- After changes, verify that all neighbor IDs exist and the app can start a simulation for the map.

## Prompt Template

```text
Create a Shrouded Front tactical map background.

Output must be usable as a game background asset.

Hard rules:
- No text of any kind.
- No letters, numbers, labels, legends, captions, map title, grid coordinates, or UI panels.
- No sector names.
- No baked sector boundary dotted lines.
- Terrain, rivers, roads, forests, plains, ridges, and villages/facilities are allowed.
- Target coordinate system: viewBox 0 0 1200 820.
- Style: muted military operations map, top-down tactical boardgame/satellite hybrid, realistic relief, readable terrain contrast.

Also provide separate data:
- sector polygons
- sector labelPoint and center
- river and road paths
- bridge/crossing points
- terrain and role per sector
```
