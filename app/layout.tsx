import "./globals.css";
import { Toaster } from "react-hot-toast";
import { SettingsProvider } from "./context/SettingsContext";

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><SettingsProvider><Toaster position="top-right"/>{children}</SettingsProvider></body></html>;
}
