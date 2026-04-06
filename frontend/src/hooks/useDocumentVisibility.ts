import { useEffect, useState } from "react"

export function useDocumentVisibility(): boolean {
  const [visible, setVisible] = useState(() => {
    if (typeof document === "undefined") return true
    return document.visibilityState !== "hidden"
  })

  useEffect(() => {
    if (typeof document === "undefined") return

    const handleVisibilityChange = () => {
      setVisible(document.visibilityState !== "hidden")
    }

    handleVisibilityChange()
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  return visible
}
