import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { featurePages } from "../data/featurePages.js";

const iconBackgrounds = {
  predict: "from-cyan-400/35 via-sky-500/20 to-sky-400/10",
  gradcam: "from-violet-400/35 via-indigo-500/20 to-indigo-400/10",
  report: "from-emerald-400/35 via-teal-500/20 to-cyan-400/10",
  data: "from-sky-400/35 via-blue-500/20 to-indigo-400/10",
};

const renderFeatureIcon = (key, className = "h-5 w-5 text-white") => {
  switch (key) {
    case "predict":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={className}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.5 8.5 3.5-3.5 3.5 3.5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 14.5h12a2.5 2.5 0 0 1 0 5H6a2.5 2.5 0 0 1 0-5Z"
          />
        </svg>
      );
    case "gradcam":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={className}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 10.5c1.1-3 3.5-5 6.5-5s6 2.4 6 6.1S17 18 12.5 18c-2.9 0-5-1.7-6-4"
          />
          <circle cx="15" cy="11.5" r="1.8" fill="currentColor" opacity="0.4" />
          <circle
            cx="10.5"
            cy="12.5"
            r="2.2"
            fill="currentColor"
            opacity="0.7"
          />
        </svg>
      );
    case "report":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={className}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 4.5h7.5L19 9v10.5a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V6A1.5 1.5 0 0 1 7 4.5Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.5 4.5V9H19"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15.5h3.5" />
        </svg>
      );
    case "data":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={className}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.75 18V8.5c0-.83.67-1.5 1.5-1.5H8"
          />
          <path
            fill="currentColor"
            fillOpacity="0.55"
            d="M9.25 6.5h2.5c.55 0 1 .45 1 1v9c0 .55-.45 1-1 1h-2.5c-.55 0-1-.45-1-1v-9c0-.55.45-1 1-1Z"
          />
          <path
            fill="currentColor"
            fillOpacity="0.4"
            d="M14.25 9h2.5c.55 0 1 .45 1 1v6.5c0 .55-.45 1-1 1h-2.5c-.55 0-1-.45-1-1V10c0-.55.45-1 1-1Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.75 18h14.5"
          />
        </svg>
      );
    default:
      return null;
  }
};

export default function PrimaryNav({
  onNavigate,
  homePath = "/",
  aboutPath = "/#about",
  dataPath = "/data",
  maxWidthClass = "max-w-6xl",
}) {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hoverTimer = useRef(null);

  const navigateTo = (path) => {
    if (typeof onNavigate === "function") {
      onNavigate(path);
      return;
    }
    window.location.assign(path);
  };

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const closeMenus = () => {
    clearHoverTimer();
    setFeaturesOpen(false);
    setMobileOpen(false);
  };

  const handleNavigate = (event, path) => {
    if (event && typeof event.preventDefault === "function" && onNavigate) {
      event.preventDefault();
    }
    navigateTo(path);
    closeMenus();
  };

  const openFeatures = () => {
    clearHoverTimer();
    setFeaturesOpen(true);
  };

  const scheduleCloseFeatures = () => {
    clearHoverTimer();
    // Give users a slightly longer grace window so the dropdown feels smoother.
    hoverTimer.current = setTimeout(() => {
      setFeaturesOpen(false);
      hoverTimer.current = null;
    }, 520);
  };

  useEffect(() => () => clearHoverTimer(), []);

  return (
    <div className="relative">
      <motion.nav
        layout
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          ease: [0.18, 0.95, 0.3, 1],
          layout: { duration: 0.28, ease: [0.2, 0.85, 0.3, 1] },
        }}
        className={`relative mx-auto flex w-full ${maxWidthClass} flex-col gap-4 overflow-hidden rounded-[40px] border border-white/14 bg-[#0c152b]/75 px-7 py-5 text-sm text-white/80 shadow-[0_28px_70px_-32px_rgba(8,28,70,0.9)] backdrop-blur-[28px] backdrop-saturate-185`}
        onMouseLeave={scheduleCloseFeatures}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span className="absolute inset-0 bg-linear-to-br from-white/6 via-white/3 to-transparent" />
          <span className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent opacity-40" />
          <span className="absolute inset-x-10 bottom-2 h-24 rounded-4xl border border-white/6 bg-white/10 blur-3xl opacity-25" />
          <span className="absolute -right-12 top-4 h-40 w-40 rounded-full bg-cyan-400/12 blur-3xl" />
          <span className="absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-blue-500/8 blur-3xl" />
        </div>
        <div className="flex w-full items-center gap-4">
          <a
            href={homePath}
            onClick={(event) => handleNavigate(event, homePath)}
            className="flex cursor-pointer items-center gap-3"
          >
            <div className="flex items-center justify-center rounded-full bg-linear-to-br from-[#0d375a] via-[#0b2342] to-[#061327] px-4 py-2 text-[0.85rem] font-semibold uppercase tracking-[0.35em] text-white">
              CLI
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight text-white">
                Clarity
              </span>
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/55">
                Imaging
              </span>
            </div>
          </a>

          <div className="hidden flex-1 items-center justify-center gap-2 md:flex">
            <a
              href={homePath}
              onClick={(event) => handleNavigate(event, homePath)}
              className="cursor-pointer rounded-full px-6 py-2 text-base font-semibold text-white/75 transition-colors hover:text-white"
            >
              Home
            </a>

            <div className="relative flex items-center">
              <motion.button
                type="button"
                onFocus={openFeatures}
                onClick={() => setFeaturesOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={featuresOpen}
                className={`flex cursor-pointer items-center gap-2 rounded-full px-6 py-2 text-base font-semibold transition-colors ${
                  featuresOpen ? "text-white" : "text-white/80 hover:text-white"
                }`}
              >
                Features
                <motion.svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  animate={{ rotate: featuresOpen ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.9, 0.3, 1] }}
                >
                  <path
                    fill="currentColor"
                    d="M12 15.5 5.5 9l1.4-1.4L12 12.7l5.1-5.1L18.5 9Z"
                  />
                </motion.svg>
              </motion.button>
            </div>

            <a
              href={dataPath}
              onClick={(event) => handleNavigate(event, dataPath)}
              className="cursor-pointer rounded-full px-6 py-2 text-base font-semibold text-white/75 transition-colors hover:text-white"
            >
              Data
            </a>

            <a
              href={aboutPath}
              onClick={(event) => handleNavigate(event, aboutPath)}
              className="cursor-pointer rounded-full px-6 py-2 text-base font-semibold text-white/75 transition-colors hover:text-white"
            >
              About
            </a>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileOpen((prev) => !prev);
              setFeaturesOpen(false);
            }}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-white md:hidden"
            aria-label="Toggle navigation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 7h16M4 12h16M4 17h16"
              />
            </svg>
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {featuresOpen && (
            <motion.div
              key="feature-drawer"
              layout
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.98 }}
              transition={{
                duration: 0.5,
                ease: [0.3, 0.9, 0.35, 1],
                layout: { duration: 0.5, ease: [0.25, 0.9, 0.35, 1] },
              }}
              className="hidden w-full grid-cols-1 gap-4 rounded-[28px] border border-white/10 bg-[#07132f]/92 p-5 shadow-[0_30px_60px_-32px_rgba(10,35,80,0.85)] backdrop-blur-[26px] md:grid md:grid-cols-3"
              onMouseEnter={openFeatures}
              onMouseLeave={scheduleCloseFeatures}
            >
              {featurePages.map((item, index) => {
                const iconKey = (item.icon ?? item.label).toLowerCase();
                const iconElement = renderFeatureIcon(iconKey);
                const gradient =
                  iconBackgrounds[iconKey] ??
                  "from-white/15 via-white/10 to-white/5";

                return (
                  <motion.button
                    key={item.label}
                    type="button"
                    onClick={(event) => handleNavigate(event, item.path)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.12 + index * 0.07,
                      duration: 0.4,
                      ease: [0.19, 1, 0.22, 1],
                    }}
                    className="flex cursor-pointer flex-col items-start gap-3 rounded-2xl border border-white/12 bg-linear-to-br from-white/12 via-white/6 to-white/4 px-5 py-5 text-left text-sm text-white/75 shadow-[0_20px_45px_-34px_rgba(5,16,40,0.9)] transition hover:border-cyan-200/35 hover:text-white"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br ${gradient}`}
                    >
                      {iconElement ?? (
                        <span className="text-sm font-semibold">
                          {item.label.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="text-base font-semibold text-white">
                      {item.label}
                    </span>
                    <span className="text-xs text-white/65">
                      {item.description}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.18, 0.93, 0.3, 1] }}
            className="mx-auto mt-3 w-full max-w-sm rounded-3xl border border-white/10 bg-[#081022]/95 p-6 text-center shadow-[0_18px_35px_-25px_rgba(14,70,170,0.8)] backdrop-blur-xl md:hidden"
          >
            <button
              type="button"
              onClick={(event) => handleNavigate(event, homePath)}
              className="w-full cursor-pointer rounded-full px-5 py-3 text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              Home
            </button>

            <div className="mt-4 space-y-3">
              {featurePages.map((item) => {
                const iconKey = (item.icon ?? item.label).toLowerCase();
                const iconElement = renderFeatureIcon(
                  iconKey,
                  "h-4 w-4 text-white"
                );
                const gradient =
                  iconBackgrounds[iconKey] ??
                  "from-white/15 via-white/10 to-white/5";

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={(event) => handleNavigate(event, item.path)}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-linear-to-br from-white/10 via-white/6 to-white/3 px-4 py-4 text-left text-sm text-white/75"
                  >
                    <span
                      className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br ${gradient}`}
                    >
                      {iconElement ?? (
                        <span className="text-xs font-semibold">
                          {item.label.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-base font-semibold text-white">
                        {item.label}
                      </span>
                      <span className="text-xs text-white/65">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={(event) => handleNavigate(event, dataPath)}
              className="mt-5 w-full cursor-pointer rounded-full px-5 py-3 text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              Data
            </button>

            <button
              type="button"
              onClick={(event) => handleNavigate(event, aboutPath)}
              className="mt-3 w-full cursor-pointer rounded-full px-5 py-3 text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              About
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
