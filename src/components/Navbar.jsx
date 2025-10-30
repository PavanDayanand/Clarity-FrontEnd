import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = ["Home", "About", "Services", "Portfolio", "Contact"];

  return (
    <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-md z-50 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
        {/* Logo */}
        <div className="text-white text-2xl font-bold tracking-tight">
          <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">
            Clarity
          </span>
        </div>

        {/* Desktop Menu */}
        <ul className="hidden md:flex gap-8">
          {menuItems.map((item) => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase()}`}
                className="text-gray-300 hover:text-cyan-400 transition duration-300 text-sm font-medium"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button className="hidden md:block px-6 py-3 bg-linear-to-r from-cyan-400 to-blue-500 text-black font-semibold rounded-full hover:shadow-lg hover:shadow-cyan-500/50 transition duration-300 transform hover:scale-105">
          Get Started
        </button>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white focus:outline-none"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-black border-t border-gray-800">
          <ul className="flex flex-col gap-4 px-6 py-4">
            {menuItems.map((item) => (
              <li key={item}>
                <a
                  href={`#${item.toLowerCase()}`}
                  className="text-gray-300 hover:text-cyan-400 transition duration-300 text-sm font-medium block"
                  onClick={() => setIsOpen(false)}
                >
                  {item}
                </a>
              </li>
            ))}
            <button className="w-full mt-4 px-4 py-2 bg-linear-to-r from-cyan-400 to-blue-500 text-black font-semibold rounded-full">
              Get Started
            </button>
          </ul>
        </div>
      )}
    </nav>
  );
}
