import { describe, expect, it } from "vitest"
import { getEquationConfig, mergeLocalizedEquation } from "./equationConfig"
import type { EquationEntry } from "./equations"

describe("equationConfig", () => {
  it("preserves time-elapsed lesson durations from the source data", () => {
    const calculus = getEquationConfig(3)
    const exploreStep = calculus?.lessonSteps.find((step) => step.id === "explore")

    expect(exploreStep?.successCondition.type).toBe("time_elapsed")
    expect(exploreStep?.successCondition.duration).toBe(15000)
  })

  it("does not invent highlight elements from unlocked variable names", () => {
    const gravity = getEquationConfig(4)
    const touchStep = gravity?.lessonSteps.find((step) => step.id === "touch")

    expect(touchStep?.highlightElements).toEqual([])
  })

  it("falls back to english equation copy when no locale override exists", () => {
    expect(getEquationConfig(1, "de")).toEqual(getEquationConfig(1, "en"))
  })

  it("merges translatable scene copy without losing structured source data", () => {
    const baseEquation: EquationEntry = {
      id: 99,
      title: "Base",
      formula: "x = y",
      author: "Euler",
      year: "1736",
      category: "Testing",
      hook: "Base hook",
      hookAction: "Base action",
      variables: [
        {
          name: "x",
          symbol: "x",
          description: "Original description",
          min: 0,
          max: 10,
          step: 1,
          default: 1,
          unit: null,
          color: "primary",
        },
      ],
      presets: [
        { label: "Preset A", values: { x: 1 } },
      ],
      lessons: [
        {
          id: "touch",
          instruction: "Original instruction",
          unlocked: ["x"],
          successType: "variable_changed",
          successTarget: "x",
          celebration: "subtle",
          insight: "Original insight",
        },
      ],
      glossary: [
        {
          words: ["triangle"],
          highlightClass: "tri",
          color: "#000000",
          tooltip: "Original tooltip",
        },
      ],
    }

    const localizedEquation = mergeLocalizedEquation(baseEquation, {
      hook: "Translated hook",
      variables: [
        { name: "x", description: "Translated description" },
      ],
      presets: [
        { label: "Preset translated" },
      ],
      lessons: [
        { id: "touch", instruction: "Translated instruction" },
      ],
      glossary: [
        { highlightClass: "tri", tooltip: "Translated tooltip", words: ["dreieck"] },
      ],
    })

    expect(localizedEquation.hook).toBe("Translated hook")
    expect(localizedEquation.variables[0]?.description).toBe("Translated description")
    expect(localizedEquation.variables[0]?.min).toBe(0)
    expect(localizedEquation.presets[0]).toEqual({ label: "Preset translated", values: { x: 1 } })
    expect(localizedEquation.lessons[0]?.instruction).toBe("Translated instruction")
    expect(localizedEquation.lessons[0]?.unlocked).toEqual(["x"])
    expect(localizedEquation.glossary?.[0]?.tooltip).toBe("Translated tooltip")
    expect(localizedEquation.glossary?.[0]?.words).toEqual(["dreieck"])
  })
})
