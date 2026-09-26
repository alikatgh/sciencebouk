import { useEffect, useState } from "react"

export const PHONE_LAYOUT_QUERY = "(max-width: 639px), (max-width: 1023px) and (max-height: 500px)"

export function usePhoneLayout(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && (
    window.innerWidth < 640 || (window.innerWidth < 1024 && window.innerHeight <= 500)
  ))
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const media = window.matchMedia(PHONE_LAYOUT_QUERY)
    const update = () => setPhone(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  return phone
}
