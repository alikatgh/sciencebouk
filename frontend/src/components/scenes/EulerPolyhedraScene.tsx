import type { ReactElement } from "react"
import { useEffect, useRef, useState } from "react"
import { drag, type D3DragEvent } from "d3-drag"
import { select, type Selection } from "d3-selection"
import { TeachableEquation } from "../teaching/TeachableEquation"
import { useLessonCopy } from "../teaching/lessonContent"
import type { Variable, LessonStep } from "../teaching/types"
import { VAR_COLORS } from "../teaching/types"
import { useContainerSize } from "../../hooks/useContainerSize"

const F = "Manrope, sans-serif"

type Vec3 = [number, number, number]

interface PlatonicSolid {
  name: string
  vertices: Vec3[]
  edges: [number, number][]
  faces: number[][]
  V: number
  E: number
  F: number
}

const PHI = (1 + Math.sqrt(5)) / 2

const solids: PlatonicSolid[] = [
  {
    name: "Tetrahedron",
    V: 4, E: 6, F: 4,
    vertices: [
      [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1],
    ],
    edges: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],
    faces: [[0,1,2],[0,1,3],[0,2,3],[1,2,3]],
  },
  {
    name: "Cube",
    V: 8, E: 12, F: 6,
    vertices: [
      [-1,-1,-1],[ 1,-1,-1],[ 1, 1,-1],[-1, 1,-1],
      [-1,-1, 1],[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1],
    ],
    edges: [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],
    ],
    faces: [
      [0,1,2,3],[4,5,6,7],
      [0,1,5,4],[2,3,7,6],
      [0,3,7,4],[1,2,6,5],
    ],
  },
  {
    name: "Octahedron",
    V: 6, E: 12, F: 8,
    vertices: [
      [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],
    ],
    edges: [
      [0,2],[0,3],[0,4],[0,5],
      [1,2],[1,3],[1,4],[1,5],
      [2,4],[2,5],[3,4],[3,5],
    ],
    faces: [
      [0,2,4],[0,4,3],[0,3,5],[0,5,2],
      [1,2,4],[1,4,3],[1,3,5],[1,5,2],
    ],
  },
  {
    name: "Dodecahedron",
    V: 20, E: 30, F: 12,
    vertices: (() => {
      const p = PHI
      const ip = 1 / PHI
      return [
        [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],
        [-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
        [0,ip,p],[0,ip,-p],[0,-ip,p],[0,-ip,-p],
        [ip,p,0],[ip,-p,0],[-ip,p,0],[-ip,-p,0],
        [p,0,ip],[p,0,-ip],[-p,0,ip],[-p,0,-ip],
      ] as Vec3[]
    })(),
    edges: (() => {
      const p = PHI
      const ip = 1 / PHI
      const verts: Vec3[] = [
        [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],
        [-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
        [0,ip,p],[0,ip,-p],[0,-ip,p],[0,-ip,-p],
        [ip,p,0],[ip,-p,0],[-ip,p,0],[-ip,-p,0],
        [p,0,ip],[p,0,-ip],[-p,0,ip],[-p,0,-ip],
      ]
      const edges: [number, number][] = []
      const threshold = 2 / PHI + 0.01
      for (let i = 0; i < verts.length; i++) {
        for (let j = i + 1; j < verts.length; j++) {
          const dx = verts[i][0] - verts[j][0]
          const dy = verts[i][1] - verts[j][1]
          const dz = verts[i][2] - verts[j][2]
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
          if (dist < threshold) edges.push([i, j])
        }
      }
      return edges
    })(),
    faces: [
      [0,8,10,2,16],[0,16,17,1,12],[0,12,14,4,8],
      [1,9,11,3,17],[5,9,1,12,14],
      [2,10,6,15,13],[3,11,7,15,13],
      [4,8,10,6,18],[4,18,19,5,14],[5,19,7,11,9],
      [6,15,7,19,18],
      [2,16,17,3,13],
    ],
  },
  {
    name: "Icosahedron",
    V: 12, E: 30, F: 20,
    vertices: (() => {
      const p = PHI
      return [
        [0,1,p],[0,1,-p],[0,-1,p],[0,-1,-p],
        [1,p,0],[1,-p,0],[-1,p,0],[-1,-p,0],
        [p,0,1],[p,0,-1],[-p,0,1],[-p,0,-1],
      ] as Vec3[]
    })(),
    edges: (() => {
      const p = PHI
      const verts: Vec3[] = [
        [0,1,p],[0,1,-p],[0,-1,p],[0,-1,-p],
        [1,p,0],[1,-p,0],[-1,p,0],[-1,-p,0],
        [p,0,1],[p,0,-1],[-p,0,1],[-p,0,-1],
      ]
      const edges: [number, number][] = []
      const threshold = 2.02
      for (let i = 0; i < verts.length; i++) {
        for (let j = i + 1; j < verts.length; j++) {
          const dx = verts[i][0] - verts[j][0]
          const dy = verts[i][1] - verts[j][1]
          const dz = verts[i][2] - verts[j][2]
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
          if (dist < threshold) edges.push([i, j])
        }
      }
      return edges
    })(),
    faces: (() => {
      const p = PHI
      const verts: Vec3[] = [
        [0,1,p],[0,1,-p],[0,-1,p],[0,-1,-p],
        [1,p,0],[1,-p,0],[-1,p,0],[-1,-p,0],
        [p,0,1],[p,0,-1],[-p,0,1],[-p,0,-1],
      ]
      const edges: [number, number][] = []
      const threshold = 2.02
      for (let i = 0; i < verts.length; i++) {
        for (let j = i + 1; j < verts.length; j++) {
          const dx = verts[i][0] - verts[j][0]
          const dy = verts[i][1] - verts[j][1]
          const dz = verts[i][2] - verts[j][2]
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
          if (dist < threshold) edges.push([i, j])
        }
      }
      const adj = new Map<number, Set<number>>()
      for (const [a, b] of edges) {
        if (!adj.has(a)) adj.set(a, new Set())
        if (!adj.has(b)) adj.set(b, new Set())
        adj.get(a)!.add(b)
        adj.get(b)!.add(a)
      }
      const faces: number[][] = []
      for (const [a, b] of edges) {
        const common = [...adj.get(a)!].filter(n => adj.get(b)!.has(n))
        for (const c of common) {
          const tri = [a, b, c].sort((x, y) => x - y)
          if (!faces.some(f => f[0] === tri[0] && f[1] === tri[1] && f[2] === tri[2])) {
            faces.push(tri)
          }
        }
      }
      return faces
    })(),
  },
]

function shortSolidName(name: string): string {
  switch (name) {
    case "Tetrahedron":
      return "Tetra"
    case "Octahedron":
      return "Octa"
    case "Dodecahedron":
      return "Dodeca"
    case "Icosahedron":
      return "Icosa"
    default:
      return name
  }
}

function tinySolidName(name: string): string {
  switch (name) {
    case "Tetrahedron":
      return "Tet"
    case "Cube":
      return "Cube"
    case "Octahedron":
      return "Oct"
    case "Dodecahedron":
      return "Dod"
    case "Icosahedron":
      return "Ico"
    default:
      return shortSolidName(name)
  }
}

function rotateY(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]
}

function rotateX(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]
}

function project(v: Vec3, cx: number, cy: number, scale: number): [number, number] {
  const perspective = 5 / (5 + v[2])
  return [cx + v[0] * scale * perspective, cy + v[1] * scale * perspective]
}

const FACE_COLORS = ["#dbeafe", "#e0f2fe", "#cffafe", "#d1fae5", "#fef3c7", "#fce7f3",
  "#ede9fe", "#f1f5f9", "#e8d5b7", "#d4e8d0", "#f0d0d0", "#c8daf0"]

const teachingVariables: Variable[] = [
  { name: 'V', symbol: 'V', latex: 'V', value: 8, min: 4, max: 20, step: 1, color: VAR_COLORS.primary, constant: true, description: 'Vertices (corners)' },
  { name: 'E', symbol: 'E', latex: 'E', value: 12, min: 6, max: 30, step: 1, color: VAR_COLORS.secondary, constant: true, description: 'Edges' },
  { name: 'F', symbol: 'F', latex: 'F', value: 6, min: 4, max: 20, step: 1, color: VAR_COLORS.tertiary, constant: true, description: 'Faces' },
]

function buildLessons(lessonCopy: Record<string, Pick<LessonStep, "instruction" | "hint" | "insight">>): LessonStep[] {
  return [
  {
    id: 'cube',
    instruction: lessonCopy.cube.instruction,
    hint: lessonCopy.cube.hint,
    highlightElements: ['V', 'E', 'F'],
    unlockedVariables: [],
    successCondition: { type: 'time_elapsed', duration: 8000 },
    celebration: 'subtle',
    insight: lessonCopy.cube.insight,
  },
  {
    id: 'try-others',
    instruction: lessonCopy["try-others"].instruction,
    hint: lessonCopy["try-others"].hint,
    highlightElements: ['V', 'E', 'F'],
    unlockedVariables: [],
    successCondition: { type: 'variable_changed', target: 'V' },
    celebration: 'subtle',
    insight: lessonCopy["try-others"].insight,
  },
  {
    id: 'icosahedron',
    instruction: lessonCopy.icosahedron.instruction,
    hint: lessonCopy.icosahedron.hint,
    highlightElements: ['V', 'E', 'F'],
    unlockedVariables: [],
    successCondition: { type: 'value_reached', target: 'V', value: 12, tolerance: 0.5 },
    celebration: 'big',
    insight: lessonCopy.icosahedron.insight,
  },
  ]
}

export function EulerPolyhedraScene(): ReactElement {
  const lessonCopy = useLessonCopy("euler-polyhedra")
  const teachingLessons = buildLessons(lessonCopy)
  return (
    <TeachableEquation
      hook="Count the corners, edges, and faces of any 3D shape you can imagine. Corners minus edges plus faces always equals 2. Always."
      hookAction="Tap different shapes and try to break the rule."
      formula="{V} - {E} + {F} = 2"
      variables={teachingVariables}
      lessonSteps={teachingLessons}
      buildLiveFormula={(v) => {
        return `{\\color{#3b82f6}${v.V}} - {\\color{#f59e0b}${v.E}} + {\\color{#10b981}${v.F}} = {\\color{#ef4444}${v.V - v.E + v.F}}`
      }}
      buildResultLine={(v) => {
        return `${v.V} - ${v.E} + ${v.F} = 2 \\;\\checkmark`
      }}
      describeResult={(v) => {
        const result = v.V - v.E + v.F
        if (result === 2) return "Euler's formula holds -- V - E + F = 2"
        return `V - E + F = ${result} (should be 2)`
      }}
      presets={[
        { label: "Tetrahedron", values: { V: 4, E: 6, F: 4 } },
        { label: "Cube", values: { V: 8, E: 12, F: 6 } },
        { label: "Icosahedron", values: { V: 12, E: 30, F: 20 } },
      ]}
    >
      {({ setVar }) => (
        <D3EulerVisual onUpdateVars={setVar} />
      )}
    </TeachableEquation>
  )
}

interface EulerVisualProps {
  onUpdateVars: (name: string, value: number) => void
}

function D3EulerVisual({ onUpdateVars }: EulerVisualProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: W, height: H } = useContainerSize(containerRef)
  const svgSelRef = useRef<Selection<SVGSVGElement, unknown, null, undefined> | null>(null)
  const gRef = useRef<Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const onUpdateVarsRef = useRef(onUpdateVars)
  onUpdateVarsRef.current = onUpdateVars

  const selectedIdxRef = useRef(1) // start with cube
  const [selectedIdx, setSelectedIdx] = useState(1)
  const angleRef = useRef(0)
  const angleXRef = useRef(0.3)
  const autoRotateRef = useRef(true)
  const rafRef = useRef(0)
  const wRef = useRef(W)
  const hRef = useRef(H)
  // Shared running flag in a ref so cleanup can stop a stale animation frame
  // even if it fires after the effect has already returned its cleanup function.
  const runningRef = useRef(false)

  // Setup -- rebuilds on resize
  useEffect(() => {
    const container = containerRef.current
    if (!container || W < 100 || H < 100) return
    const compact = W < 480 || H < 420
    const ultraCompact = W < 390 || H < 360
    wRef.current = W
    hRef.current = H
    select(container).select("svg").remove()

    const svg = select(container)
      .append("svg")
      .attr("width", W)
      .attr("height", H)
      .style("display", "block")
      .attr("role", "img")
      .attr("aria-label", "Euler polyhedra formula -- interactive 3D wireframes")

    svg.append("rect").attr("width", W).attr("height", H).attr("rx", 16).attr("fill", "#fafcff")

    svgSelRef.current = svg

    const g = svg.append("g")
    gRef.current = g

    // Shape selector buttons (these are D3 elements, not React)
    const btnW = ultraCompact ? Math.min(92, Math.floor(W * 0.135)) : compact ? Math.min(116, Math.floor(W * 0.17)) : Math.min(160, Math.floor(W * 0.22))
    const btnH = ultraCompact ? 28 : compact ? 32 : 36
    for (let i = 0; i < solids.length; i++) {
      const bx = W * 0.04
      const by = H * 0.07 + i * (compact ? H * 0.085 : H * 0.1)
      const btnG = svg.append("g").style("cursor", "pointer")
      btnG.append("rect")
        .attr("class", `btn-bg-${i}`)
        .attr("x", bx).attr("y", by).attr("width", btnW).attr("height", btnH)
        .attr("rx", 10)
      btnG.append("text")
        .attr("class", `btn-txt-${i}`)
        .attr("x", bx + btnW / 2).attr("y", by + (compact ? 21 : 24)).attr("text-anchor", "middle")
        .attr("font-size", ultraCompact ? 11 : compact ? 13 : 15).attr("font-family", F)
        .text(ultraCompact ? tinySolidName(solids[i].name) : compact ? shortSolidName(solids[i].name) : solids[i].name)
      btnG.on("click", () => {
        selectedIdxRef.current = i
        setSelectedIdx(i)
      })
    }

    // Wireframe group for faces, edges, vertices
    g.append("g").attr("class", "faces-group")
    g.append("g").attr("class", "edges-group")
    g.append("g").attr("class", "verts-group")

    // Drag-to-rotate: invisible hit area over the wireframe region
    const hitArea = svg.append("rect")
      .attr("x", W * 0.35).attr("y", H * 0.05)
      .attr("width", W * 0.55).attr("height", H * 0.85)
      .attr("fill", "transparent")
      .style("cursor", "grab")

    const rotateDrag = drag<SVGRectElement, unknown>()
      .on("start", function () {
        select(this).style("cursor", "grabbing")
        autoRotateRef.current = false
      })
      .on("drag", (event: D3DragEvent<SVGRectElement, unknown, unknown>) => {
        angleRef.current += event.dx * 0.01
        angleXRef.current += event.dy * 0.01
        renderWireframe()
      })
      .on("end", function () {
        select(this).style("cursor", "grab")
        autoRotateRef.current = true
      })

    hitArea.call(rotateDrag)

    // V, E, F info panel
    const ipX = W * 0.04
    const ipY = compact ? H * 0.62 : H * 0.6
    const ipW = ultraCompact ? W * 0.18 : compact ? W * 0.16 : W * 0.18
    const ipH = compact ? H * 0.29 : H * 0.34
    g.append("rect").attr("class", "info-bg").attr("x", ipX).attr("y", ipY).attr("width", ipW)
      .attr("height", ipH).attr("rx", 12).attr("fill", "white").attr("fill-opacity", 0.9)
      .attr("stroke", "#e2e8f0").attr("stroke-width", 1.5)

    g.append("text").attr("class", "v-label").attr("x", ipX + 20).attr("y", ipY + 30)
      .attr("font-size", ultraCompact ? 15 : compact ? 17 : 20).attr("font-family", F).attr("font-weight", 700).attr("fill", VAR_COLORS.primary)
    g.append("text").attr("class", "e-label").attr("x", ipX + 20).attr("y", ipY + 58)
      .attr("font-size", ultraCompact ? 15 : compact ? 17 : 20).attr("font-family", F).attr("font-weight", 700).attr("fill", VAR_COLORS.secondary)
    g.append("text").attr("class", "f-label").attr("x", ipX + 20).attr("y", ipY + 86)
      .attr("font-size", ultraCompact ? 15 : compact ? 17 : 20).attr("font-family", F).attr("font-weight", 700).attr("fill", VAR_COLORS.tertiary)

    g.append("line").attr("class", "info-divider").attr("x1", ipX + 10).attr("y1", ipY + 100).attr("x2", ipX + ipW - 10).attr("y2", ipY + 100)
      .attr("stroke", "#e2e8f0").attr("stroke-width", 1)
    g.append("text").attr("class", "euler-result").attr("x", ipX + ipW / 2).attr("y", ipY + 126).attr("text-anchor", "middle")
      .attr("font-size", ultraCompact ? 14 : compact ? 16 : 20).attr("font-family", F).attr("font-weight", 800).attr("fill", "#0f172a")
    g.append("text").attr("class", "euler-formula-label").attr("x", ipX + ipW / 2).attr("y", ipY + 146).attr("text-anchor", "middle")
      .attr("font-size", ultraCompact ? 10 : compact ? 11 : 13).attr("font-family", F).attr("font-weight", 600).attr("fill", "#64748b")
      .text(ultraCompact ? "= 2" : compact ? "V-E+F=2" : "V - E + F = 2")

    // Shape name
    g.append("text").attr("class", "shape-name").attr("x", W * 0.6).attr("y", H - 36).attr("text-anchor", "middle")
      .attr("font-size", ultraCompact ? 16 : compact ? 18 : 20).attr("font-family", "Newsreader, serif").attr("font-weight", 700).attr("fill", "#1e293b")

    // Drag hint
    g.append("text").attr("x", W * 0.6).attr("y", H - 12).attr("text-anchor", "middle")
      .attr("font-size", 13).attr("font-family", F).attr("fill", "#94a3b8").attr("opacity", 0.6)
      .text(ultraCompact ? "Rotate" : compact ? "Drag to rotate" : "Drag the shape to rotate it in 3D")

    // Stop any previously running animation loop before starting a new one.
    // runningRef is shared across renders, so a stale rAF callback checks it
    // and exits even if it fires in the brief window before cancelAnimationFrame
    // takes effect (possible when the browser coalesces multiple rAF handles).
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)

    // Animation loop
    runningRef.current = true
    const animate = () => {
      if (!runningRef.current) return
      if (autoRotateRef.current) {
        angleRef.current += 0.008
      }
      renderWireframe()
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      select(container).select("svg").remove()
    }
  }, [W, H])

  // Update button highlights + V/E/F when selectedIdx changes
  useEffect(() => {
    const svg = svgSelRef.current
    if (!svg) return

    const solid = solids[selectedIdx]
    onUpdateVarsRef.current('V', solid.V)
    onUpdateVarsRef.current('E', solid.E)
    onUpdateVarsRef.current('F', solid.F)

    for (let i = 0; i < solids.length; i++) {
      const isSelected = i === selectedIdx
      svg.select(`.btn-bg-${i}`)
        .attr("fill", isSelected ? "#1e40af" : "#f1f5f9")
        .attr("stroke", isSelected ? "#1e40af" : "#cbd5e1")
        .attr("stroke-width", 2)
      svg.select(`.btn-txt-${i}`)
        .attr("font-weight", isSelected ? 700 : 500)
        .attr("fill", isSelected ? "#ffffff" : "#475569")
    }
  }, [selectedIdx])

  function renderWireframe() {
    const g = gRef.current
    if (!g) return

    const idx = selectedIdxRef.current
    const solid = solids[idx]
    const angle = angleRef.current
    const W = wRef.current
    const H = hRef.current
    const compact = W < 480 || H < 420
    const ultraCompact = W < 390 || H < 360
    const cx = W * 0.6
    const cy = H * 0.45
    const baseScale = Math.min(W, H) * 0.22
    const scale = idx === 0 ? baseScale : idx === 3 ? baseScale * 0.75 : idx === 4 ? baseScale * 0.7 : baseScale * 0.9

    const rotated = solid.vertices.map(v => {
      let r = rotateY(v, angle)
      r = rotateX(r, angleXRef.current)
      return r
    })

    const projected = rotated.map(v => project(v, cx, cy, scale))

    // Sort faces by depth
    const sortedFaces = [...solid.faces]
      .filter(f => f.length >= 3)
      .map((face, i) => {
        let depthSum = 0
        for (const vi of face) depthSum += rotated[vi][2]
        return { face, depth: depthSum / face.length, idx: i }
      })
      .sort((a, b) => a.depth - b.depth)

    // Faces
    const faceSel = g.select(".faces-group").selectAll<SVGPolygonElement, typeof sortedFaces[0]>("polygon")
      .data(sortedFaces, d => `${d.idx}`)
    faceSel.exit().remove()
    faceSel.enter().append("polygon").merge(faceSel)
      .attr("points", d => d.face.map(vi => `${projected[vi][0]},${projected[vi][1]}`).join(" "))
      .attr("fill", d => FACE_COLORS[d.idx % FACE_COLORS.length])
      .attr("fill-opacity", 0.5)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1)

    // Edges
    const edgeSel = g.select(".edges-group").selectAll<SVGLineElement, [number, number]>("line")
      .data(solid.edges)
    edgeSel.exit().remove()
    edgeSel.enter().append("line").merge(edgeSel)
      .attr("x1", d => projected[d[0]][0])
      .attr("y1", d => projected[d[0]][1])
      .attr("x2", d => projected[d[1]][0])
      .attr("y2", d => projected[d[1]][1])
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round")

    // Vertices
    const vertSel = g.select(".verts-group").selectAll<SVGCircleElement, [number, number]>("circle")
      .data(projected)
    vertSel.exit().remove()
    vertSel.enter().append("circle").merge(vertSel)
      .attr("cx", d => d[0])
      .attr("cy", d => d[1])
      .attr("r", ultraCompact ? 3 : 4)
      .attr("fill", "#1e40af")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)

    // Info
    g.select(".v-label").text(ultraCompact ? `V${solid.V}` : `V = ${solid.V}`)
    g.select(".e-label").text(ultraCompact ? `E${solid.E}` : `E = ${solid.E}`)
    g.select(".f-label").text(ultraCompact ? `F${solid.F}` : `F = ${solid.F}`)
    g.select(".euler-result").text(ultraCompact ? `${solid.V}-${solid.E}+${solid.F}` : compact ? `${solid.V}-${solid.E}+${solid.F}=2` : `${solid.V} - ${solid.E} + ${solid.F} = 2`)
    g.select(".shape-name").text(ultraCompact ? tinySolidName(solid.name) : compact ? shortSolidName(solid.name) : solid.name)
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
    />
  )
}
