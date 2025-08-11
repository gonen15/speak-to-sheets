import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import "@/styles/theme.css"
import { ensureAuth } from "@/lib/authBootstrap";

ensureAuth().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
