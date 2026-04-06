interface TeachingLayoutInput {
  containerWidth: number
  containerHeight: number
  teachingPanelOpen: boolean
  teachingPanelWidth: number
}

const ALWAYS_STACK_BELOW = 720
const PREFER_STACK_BELOW = 960
const MIN_DESKTOP_SCENE_WIDTH = 560
const MIN_DESKTOP_SCENE_ASPECT = 0.9
const RESIZE_HANDLE_WIDTH = 8

export function shouldUseStackedTeachingLayout({
  containerWidth,
  containerHeight,
  teachingPanelOpen,
  teachingPanelWidth,
}: TeachingLayoutInput): boolean {
  if (containerWidth <= 0) return false
  if (containerWidth < ALWAYS_STACK_BELOW) return true
  if (!teachingPanelOpen) return false

  const sceneWidth = containerWidth - teachingPanelWidth - RESIZE_HANDLE_WIDTH
  const sceneAspect = containerHeight > 0 ? sceneWidth / containerHeight : Infinity

  return (
    containerWidth < PREFER_STACK_BELOW ||
    sceneWidth < MIN_DESKTOP_SCENE_WIDTH ||
    sceneAspect < MIN_DESKTOP_SCENE_ASPECT
  )
}
