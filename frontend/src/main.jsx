import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

// Set backend API base URL directly to port 8000 to prevent Vite proxy ERR_CONNECTION_REFUSED
axios.defaults.baseURL = 'http://127.0.0.1:8000'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
