import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import { drag, pointer, select, type D3DragEvent } from "d3";

interface Point {
  x: number;
  y: number;
}

interface SceneSize {
  width: number;
  height: number;
}

const OUTER_SUM = 18;
const MIN_B = 4;
const MAX_B = 14;

interface PythagoreanTheoremExplorerProps {
  showEquation?: boolean;
}

export function PythagoreanTheoremExplorer({
  showEquation = true,
}: PythagoreanTheoremExplorerProps): ReactElement {
  const [b, setB] = useState(10);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const leftHandleRef = useRef<SVGCircleElement | null>(null);
  const rightHandleRef = useRef<SVGCircleElement | null>(null);
  const [sceneSize, setSceneSize] = useState<SceneSize>({
    width: 1400,
    height: 900,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry.contentRect.width;
      const height = Math.max(560, Math.min(920, width * 0.72));

      setSceneSize({
        width,
        height,
      });
    });

    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  const scene = useMemo(() => {
    const width = Math.max(sceneSize.width, 900);
    const height = sceneSize.height;
    const headerHeight = 130;
    const padding = 48;
    const gap = Math.max(36, width * 0.04);
    const availableHeight = height - headerHeight - padding * 2;
    const outerSize = Math.min((width - padding * 2 - gap) / 2, availableHeight);
    const scale = outerSize / OUTER_SUM;
    const a = OUTER_SUM - b;
    const c2 = a ** 2 + b ** 2;

    const leftOrigin = {
      x: (width - outerSize * 2 - gap) / 2,
      y: headerHeight + (height - headerHeight - outerSize) / 2 - 16,
    };
    const rightOrigin = {
      x: leftOrigin.x + outerSize + gap,
      y: leftOrigin.y,
    };

    return {
      width,
      height,
      a,
      b,
      c2,
      scale,
      outerSize,
      leftOrigin,
      rightOrigin,
    };
  }, [b, sceneSize]);

  useEffect(() => {
    const svg = svgRef.current;
    const leftHandle = leftHandleRef.current;
    const rightHandle = rightHandleRef.current;

    if (!svg || !leftHandle || !rightHandle) {
      return;
    }

    const attachDrag = (handle: SVGCircleElement, originX: number) => {
      const behavior = drag<SVGCircleElement, unknown>().on(
        "drag",
        (event: D3DragEvent<SVGCircleElement, unknown, unknown>) => {
          const [cursorX] = pointer(event.sourceEvent, svg);
          const localX = clamp(
            cursorX - originX,
            MIN_B * scene.scale,
            MAX_B * scene.scale,
          );
          const nextB = clamp(Math.round(localX / scene.scale), MIN_B, MAX_B);
          setB(nextB);
        },
      );

      select(handle).call(behavior);
      return () => {
        select(handle).on(".drag", null);
      };
    };

    const detachLeft = attachDrag(leftHandle, scene.leftOrigin.x);
    const detachRight = attachDrag(rightHandle, scene.rightOrigin.x);

    return () => {
      detachLeft();
      detachRight();
    };
  }, [scene.leftOrigin.x, scene.rightOrigin.x, scene.scale]);

  const leftProof = useMemo(
    () => buildCentralSquareProof(scene.leftOrigin, scene.a, scene.b, scene.scale),
    [scene.leftOrigin, scene.a, scene.b, scene.scale],
  );

  const rightProof = useMemo(
    () => buildTwoSquaresProof(scene.rightOrigin, scene.a, scene.b, scene.scale),
    [scene.rightOrigin, scene.a, scene.b, scene.scale],
  );

  return (
    <section className="w-full">
      <div className="mx-auto flex max-w-[1500px] flex-col items-center">
        {showEquation ? (
          <>
            <div className="w-full overflow-x-auto overflow-y-hidden pt-2 text-center text-4xl text-slate-950 md:text-6xl">
              <BlockMath math="a^2 + b^2 = c^2" />
            </div>
            <div className="w-full overflow-x-auto overflow-y-hidden -mt-2 text-center text-2xl text-slate-500 md:text-3xl">
              <BlockMath math={`${scene.a ** 2} + ${scene.b ** 2} = ${scene.c2}`} />
            </div>
          </>
        ) : null}

        <div ref={hostRef} className={`${showEquation ? "mt-2" : ""} w-full`}>
          <svg
            ref={svgRef}
            width={scene.width}
            height={scene.height}
            viewBox={`0 0 ${scene.width} ${scene.height}`}
            className="block h-auto w-full"
          >
            <rect x={0} y={0} width={scene.width} height={scene.height} fill="#f8fbff" rx={40} />

            <g>
              {renderOuterSquare(leftProof.origin, scene.outerSize)}
              {leftProof.triangles.map((triangle, index) => (
                <polygon
                  key={`left-triangle-${index + 1}`}
                  points={toSvgPoints(triangle.points)}
                  fill="#f8fafc"
                  stroke="#1f2937"
                  strokeWidth={2.25}
                />
              ))}
              <polygon
                points={toSvgPoints(leftProof.centerSquare)}
                fill="#ffe3aa"
                stroke="#ffab61"
                strokeWidth={2.5}
              />
              <SvgText
                x={centerOfPolygon(leftProof.centerSquare).x}
                y={centerOfPolygon(leftProof.centerSquare).y}
                text="c^2"
                fill="#a9650a"
                size={40}
              />
            </g>

            <g>
              {renderOuterSquare(rightProof.origin, scene.outerSize)}
              {rightProof.triangles.map((triangle, index) => (
                <polygon
                  key={`right-triangle-${index + 1}`}
                  points={toSvgPoints(triangle.points)}
                  fill="#f8fafc"
                  stroke="#1f2937"
                  strokeWidth={2.25}
                />
              ))}
              <rect
                x={rightProof.squareB.x}
                y={rightProof.squareB.y}
                width={rightProof.squareB.size}
                height={rightProof.squareB.size}
                fill="#c9f1e7"
                stroke="#58b69b"
                strokeWidth={2.5}
              />
              <rect
                x={rightProof.squareA.x}
                y={rightProof.squareA.y}
                width={rightProof.squareA.size}
                height={rightProof.squareA.size}
                fill="#d7e0ff"
                stroke="#6585ff"
                strokeWidth={2.5}
              />
              <SvgText
                x={rightProof.squareB.x + rightProof.squareB.size / 2}
                y={rightProof.squareB.y + rightProof.squareB.size / 2}
                text="b^2"
                fill="#1b8068"
                size={38}
              />
              <SvgText
                x={rightProof.squareA.x + rightProof.squareA.size / 2}
                y={rightProof.squareA.y + rightProof.squareA.size / 2}
                text="a^2"
                fill="#3858da"
                size={38}
              />
            </g>

            <line
              x1={leftProof.origin.x + scene.b * scene.scale}
              y1={leftProof.origin.y - 18}
              x2={leftProof.origin.x + scene.b * scene.scale}
              y2={leftProof.origin.y + 18}
              stroke="#94a3b8"
              strokeWidth={2}
            />
            <line
              x1={rightProof.origin.x + scene.b * scene.scale}
              y1={rightProof.origin.y - 18}
              x2={rightProof.origin.x + scene.b * scene.scale}
              y2={rightProof.origin.y + 18}
              stroke="#94a3b8"
              strokeWidth={2}
            />

            <circle
              ref={leftHandleRef}
              cx={leftProof.origin.x + scene.b * scene.scale}
              cy={leftProof.origin.y}
              r={14}
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth={3}
              style={{ cursor: "ew-resize" }}
            />
            <circle
              ref={rightHandleRef}
              cx={rightProof.origin.x + scene.b * scene.scale}
              cy={rightProof.origin.y}
              r={14}
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth={3}
              style={{ cursor: "ew-resize" }}
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

interface TriangleShape {
  points: Point[];
}

interface SquareShape {
  x: number;
  y: number;
  size: number;
}

interface CentralSquareProof {
  origin: Point;
  triangles: TriangleShape[];
  centerSquare: Point[];
}

function buildCentralSquareProof(
  origin: Point,
  a: number,
  b: number,
  scale: number,
): CentralSquareProof {
  const s = (a + b) * scale;
  const bx = b * scale;
  const ax = a * scale;

  return {
    origin,
    triangles: [
      {
        points: [
          { x: origin.x, y: origin.y },
          { x: origin.x + bx, y: origin.y },
          { x: origin.x, y: origin.y + ax },
        ],
      },
      {
        points: [
          { x: origin.x + s, y: origin.y },
          { x: origin.x + s - ax, y: origin.y },
          { x: origin.x + s, y: origin.y + bx },
        ],
      },
      {
        points: [
          { x: origin.x + s, y: origin.y + s },
          { x: origin.x + s, y: origin.y + s - ax },
          { x: origin.x + s - bx, y: origin.y + s },
        ],
      },
      {
        points: [
          { x: origin.x, y: origin.y + s },
          { x: origin.x + ax, y: origin.y + s },
          { x: origin.x, y: origin.y + s - bx },
        ],
      },
    ],
    centerSquare: [
      { x: origin.x + bx, y: origin.y },
      { x: origin.x + s, y: origin.y + bx },
      { x: origin.x + s - bx, y: origin.y + s },
      { x: origin.x, y: origin.y + s - bx },
    ],
  };
}

interface TwoSquaresProof {
  origin: Point;
  triangles: TriangleShape[];
  squareA: SquareShape;
  squareB: SquareShape;
}

function buildTwoSquaresProof(
  origin: Point,
  a: number,
  b: number,
  scale: number,
): TwoSquaresProof {
  const s = (a + b) * scale;
  const ax = a * scale;
  const bx = b * scale;

  return {
    origin,
    triangles: [
      {
        points: [
          { x: origin.x + bx, y: origin.y },
          { x: origin.x + s, y: origin.y },
          { x: origin.x + s, y: origin.y + bx },
        ],
      },
      {
        points: [
          { x: origin.x + bx, y: origin.y },
          { x: origin.x + bx, y: origin.y + bx },
          { x: origin.x + s, y: origin.y + bx },
        ],
      },
      {
        points: [
          { x: origin.x, y: origin.y + bx },
          { x: origin.x, y: origin.y + s },
          { x: origin.x + bx, y: origin.y + bx },
        ],
      },
      {
        points: [
          { x: origin.x + bx, y: origin.y + bx },
          { x: origin.x, y: origin.y + s },
          { x: origin.x + bx, y: origin.y + s },
        ],
      },
    ],
    squareB: {
      x: origin.x,
      y: origin.y,
      size: bx,
    },
    squareA: {
      x: origin.x + bx,
      y: origin.y + bx,
      size: ax,
    },
  };
}

function renderOuterSquare(origin: Point, size: number): ReactElement {
  return (
    <rect
      x={origin.x}
      y={origin.y}
      width={size}
      height={size}
      fill="transparent"
      stroke="#cbd5e1"
      strokeWidth={2}
      rx={12}
    />
  );
}

interface SvgTextProps {
  x: number;
  y: number;
  text: string;
  fill: string;
  size: number;
}

function SvgText({ x, y, text, fill, size }: SvgTextProps): ReactElement {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={size}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ userSelect: "none" }}
    >
      {text}
    </text>
  );
}

function toSvgPoints(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function centerOfPolygon(points: Point[]): Point {
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
