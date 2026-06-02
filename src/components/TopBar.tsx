import { Link } from "@tanstack/react-router";

const AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDF_e5gnOMD_Ba9jGZk4mS8tVLJS1K0KI_EesjS4jL0Y0mzSsQolEyIQPyo96JKK21V9GmyUqWE9gmwsqwnTVmsT2WXNobif5Og1mx4KmEm3cnonS3E7RnvmR4N_wuFzhJLNaCXUQJDcTs5vvDPfGX3sSi6nX1wT-NPcGGoJmoIL-G5FS14fC_i_tskfM9i26dG6a4J_NOPyIYVPIcjh7nM5r6-cRZMPr_nSRoTwr27pdaSh2iWE9AczNWY16hkQzruTVSLCjOT-c39";

export function TopBar() {
  return (
    <header className="bg-surface/90 backdrop-blur shadow-sm flex justify-between items-center px-5 py-2 w-full fixed top-0 left-0 z-50">
      <Link to="/profile" className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-primary-container overflow-hidden border-2 border-primary">
          <img src={AVATAR} alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <span className="text-2xl font-bold text-primary tracking-tight">XO Live</span>
      </Link>
      <div className="bg-surface-container-high px-4 py-2 rounded-full flex items-center gap-1 shadow-sm">
        <span className="text-sm font-semibold tracking-wider text-primary">1,250</span>
        <span className="text-lg">🪙</span>
      </div>
    </header>
  );
}
