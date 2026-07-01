import { createContext, useContext, useState } from 'react'

const A11yCtx = createContext(null)

export function AccessibilityProvider({ children }) {
  const [highContrast, setHighContrast] = useState(false)
  const [largeFont, setLargeFont] = useState(false)
  const [speechRate, setSpeechRate] = useState(0.9)

  return (
    <A11yCtx.Provider value={{ highContrast, setHighContrast, largeFont, setLargeFont, speechRate, setSpeechRate }}>
      {children}
    </A11yCtx.Provider>
  )
}

export const useA11y = () => useContext(A11yCtx)
