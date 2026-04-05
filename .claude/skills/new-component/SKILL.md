---
name: new-component
description: Scaffold a new React component with TypeScript types and test file
user-invocable: true
allowed-tools: Write, Read, Edit, Bash, Glob
---

Create a new React component for the Sciencebouk project.

**Usage**: `/new-component ComponentName`

## Steps

1. Create `frontend/src/components/$ARGUMENTS.tsx` with:
   - Named export of a functional component
   - TypeScript `${ARGUMENTS}Props` interface
   - Tailwind styling using project tokens (ink, mist, ocean, aqua, sunrise, ember)
   - Proper React imports

2. Create `frontend/src/components/$ARGUMENTS.test.tsx` with:
   - Import from the component
   - Basic render test
   - Props test
   - Use `@testing-library/react` patterns

3. If this is an equation scene component:
   - Add the case to the switch in `EquationVisualization.tsx`
   - Include D3/SVG setup with `useMemo` for geometry
   - Accept equation metadata props
   - Add KaTeX formula display

4. Report what was created and any manual steps needed.
