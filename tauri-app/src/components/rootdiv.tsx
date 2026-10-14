import { useEffect, useState, memo } from "react"

interface RootDivProps {
  children: React.ReactNode
  [key: string]: any
}

type AnimationMode = "up" | "left" | "off"

const getStoredAnimation = (): AnimationMode => {
  if (typeof window === "undefined") {
    return "up"
  }

  const stored = window.localStorage.getItem("pageAnimation")
  return stored === "left" || stored === "off" ? stored : "up"
}

const getInitialStyle = (mode: AnimationMode) => ({
  opacity: mode === "off" ? 1 : 0,
  transform:
    mode === "left"
      ? "translateX(90px)"
      : mode === "off"
      ? "none"
      : "translateY(90px)",
  transition:
    mode === "off"
      ? "none"
      : "opacity 0.4s cubic-bezier(0.075,0.82,0.165,1), transform 0.4s cubic-bezier(0.075,0.82,0.165,1)",
  willChange: mode === "off" ? "auto" : "opacity, transform",
})

function RootDiv({ children, ...props }: RootDivProps): React.ReactElement {
  const [style, setStyle] = useState(() => getInitialStyle(getStoredAnimation()))

  useEffect(() => {
    const animationMode = getStoredAnimation()

    if (animationMode === "off") {
      setStyle({
        opacity: 1,
        transform: "none",
        transition: "none",
        willChange: "auto",
      })
      return
    }

    const timeout = setTimeout(() => {
      setStyle((prev) => ({
        ...prev,
        opacity: 1,
        transform: animationMode === "left" ? "translateX(0)" : "translateY(0)",
      }))
    }, 16) // Changed from 10 to 16ms (1 frame)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div
      style={{
        ...style,
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        contain: "layout style paint", // CSS containment for better performance
      }}
      {...props}
      className="overflow-x-hidden"
    >
      {children}
    </div>
  )
}

export default memo(RootDiv)
