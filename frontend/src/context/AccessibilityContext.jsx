import { createContext, useContext, useState } from 'react'

const A11yCtx = createContext(null)

export function AccessibilityProvider({ children }) {
  const [highContrast, setHighContrast] = useState(false)
  const [largeFont, setLargeFont] = useState(false)
  const [volume, setVolume] = useState(1)
  const [screenLowered, setScreenLowered] = useState(false)

  return (
    <A11yCtx.Provider value={{
      highContrast, setHighContrast, largeFont, setLargeFont, volume, setVolume,
      screenLowered, setScreenLowered,
    }}>
      {children}
    </A11yCtx.Provider>
  )
}

export const useA11y = () => useContext(A11yCtx)
