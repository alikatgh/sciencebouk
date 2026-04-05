---
name: new-equation
description: Add a new equation with visualization scene to the atlas
user-invocable: true
allowed-tools: Write, Read, Edit, Glob, Grep
---

Add a new equation to the Sciencebouk equation atlas.

**Usage**: `/new-equation "Equation Name" by Author (Year)`
Or just `/new-equation` for interactive mode using $ARGUMENTS.

## Steps

1. **Add equation entry** to `frontend/src/data/equations.ts`:
   - Next available ID
   - Title, formula (LaTeX), author, year, category

2. **Create scene component** at `frontend/src/components/{EquationName}Scene.tsx`:
   - SVG visualization that illustrates the equation's key concept
   - Interactive elements where the math benefits from exploration
   - D3 scales and geometry computed in `useMemo`
   - KaTeX formula display matching the entry
   - Responsive via container dimensions

3. **Register the scene** in `frontend/src/components/EquationVisualization.tsx`:
   - Add import
   - Add case to the switch statement

4. **Update backend** if needed:
   - Add to `equationAtlas` array in `backend/courses/views.py`

5. **Verify**:
   - Run TypeScript check: `cd frontend && npx tsc --noEmit`
   - Equation appears in sidebar
   - Visualization renders correctly
