import { createRoot } from 'react-dom/client'
import Home from './pages/home'
import './main.css'

const Main = () => {
  return (
    <Home />
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<Main />)