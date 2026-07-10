import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DeviceModeProvider } from './context/DeviceModeContext'
import { ParentGateProvider } from './context/ParentGateContext'
import { AppRoutes } from './routes/router'

export function AppRoot() {
  return (
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <DeviceModeProvider>
            <ParentGateProvider>
              <AppRoutes />
            </ParentGateProvider>
          </DeviceModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  )
}
