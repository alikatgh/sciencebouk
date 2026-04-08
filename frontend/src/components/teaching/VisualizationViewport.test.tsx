import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { VisualizationViewport } from "./VisualizationViewport"

describe("VisualizationViewport", () => {
  it("zooms the visualization frame in and out", () => {
    render(
      <div style={{ width: 420, height: 320 }}>
        <VisualizationViewport>
          <div className="h-full w-full">Scene</div>
        </VisualizationViewport>
      </div>,
    )

    const frame = screen.getByTestId("visualization-zoom-frame")
    const stage = screen.getByTestId("visualization-zoom-stage")
    const zoomIn = screen.getByRole("button", { name: "Zoom in visualization" })
    const zoomOut = screen.getByRole("button", { name: "Zoom out visualization" })
    const reset = screen.getByRole("button", { name: "Reset visualization zoom" })

    expect(frame).toHaveAttribute("data-zoom-scale", "100")
    expect(zoomOut).not.toBeDisabled()
    expect(reset).toBeDisabled()

    fireEvent.click(zoomIn)
    expect(frame).toHaveAttribute("data-zoom-scale", "105")
    expect(frame).toHaveStyle({ width: "105%", height: "105%" })
    expect(stage).toHaveStyle({ width: "95.23809523809523%", height: "95.23809523809523%", transform: "scale(1.05)" })
    expect(zoomOut).not.toBeDisabled()
    expect(reset).not.toBeDisabled()

    fireEvent.click(zoomOut)
    expect(frame).toHaveAttribute("data-zoom-scale", "100")

    fireEvent.click(zoomOut)
    expect(frame).toHaveAttribute("data-zoom-scale", "95")
    expect(stage).toHaveStyle({ width: "100%", height: "100%", transform: "scale(0.95)" })

    fireEvent.click(zoomOut)
    expect(frame).toHaveAttribute("data-zoom-scale", "90")
    expect(stage).toHaveStyle({ width: "100%", height: "100%", transform: "scale(0.9)" })

    fireEvent.click(zoomIn)
    fireEvent.click(reset)
    expect(frame).toHaveAttribute("data-zoom-scale", "100")
  })

  it("supports smooth modifier-wheel zooming", () => {
    render(
      <div style={{ width: 420, height: 320 }}>
        <VisualizationViewport>
          <div className="h-full w-full">Scene</div>
        </VisualizationViewport>
      </div>,
    )

    const frame = screen.getByTestId("visualization-zoom-frame")
    const scrollArea = frame.parentElement as HTMLElement

    fireEvent.wheel(scrollArea, { deltaY: -100, ctrlKey: true })
    expect(Number(frame.getAttribute("data-zoom-scale"))).toBeGreaterThan(100)

    fireEvent.wheel(scrollArea, { deltaY: 100, ctrlKey: true })
    expect(Number(frame.getAttribute("data-zoom-scale"))).toBeLessThanOrEqual(100)
  })

  it("enters and exits focused mobile visualization mode", () => {
    render(
      <div style={{ width: 420, height: 320 }}>
        <VisualizationViewport mobileOptimized>
          <div className="h-full w-full">Scene</div>
        </VisualizationViewport>
      </div>,
    )

    const viewport = screen.getByTestId("visualization-viewport")
    const fullscreenToggle = screen.getByRole("button", { name: "Enter focused visualization mode" })

    expect(viewport).toHaveAttribute("data-fullscreen", "false")

    fireEvent.click(fullscreenToggle)
    expect(viewport).toHaveAttribute("data-fullscreen", "true")
    expect(screen.getByRole("button", { name: "Exit focused visualization mode" })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: "Escape" })
    expect(viewport).toHaveAttribute("data-fullscreen", "false")
  })
})
