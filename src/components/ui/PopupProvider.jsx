import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

const PopupContext = createContext(null);

const variantStyles = {
  info: {
    badge: "border border-cyan-300/35 bg-cyan-500/20 text-cyan-100",
    gradient: "from-[#103565]/60 via-[#071427]/90 to-[#030914]/95",
    glows: [
      "bg-[radial-gradient(circle,rgba(59,130,246,0.5),transparent_68%)]",
      "bg-[radial-gradient(circle,rgba(14,165,233,0.35),transparent_72%)]",
      "bg-[radial-gradient(circle,rgba(96,165,250,0.28),transparent_70%)]",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-4 w-4"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7h.01" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  success: {
    badge: "border border-emerald-300/35 bg-emerald-500/20 text-emerald-100",
    gradient: "from-[#0f3c46]/65 via-[#062736]/90 to-[#020d18]/95",
    glows: [
      "bg-[radial-gradient(circle,rgba(45,212,191,0.45),transparent_68%)]",
      "bg-[radial-gradient(circle,rgba(34,197,94,0.3),transparent_72%)]",
      "bg-[radial-gradient(circle,rgba(56,189,248,0.24),transparent_70%)]",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m6 12 3.5 3.5L18 7"
        />
      </svg>
    ),
  },
  warning: {
    badge: "border border-sky-300/35 bg-sky-500/25 text-sky-100",
    gradient: "from-[#1a3c6b]/65 via-[#0a1f3b]/92 to-[#040b18]/96",
    glows: [
      "bg-[radial-gradient(circle,rgba(96,165,250,0.45),transparent_68%)]",
      "bg-[radial-gradient(circle,rgba(59,130,246,0.32),transparent_72%)]",
      "bg-[radial-gradient(circle,rgba(125,211,252,0.26),transparent_70%)]",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-4 w-4"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15h.01" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4.5 19h15l-7.5-14Z"
        />
      </svg>
    ),
  },
  danger: {
    badge: "border border-indigo-300/35 bg-indigo-500/25 text-indigo-100",
    gradient: "from-[#2a3f7e]/65 via-[#121e40]/92 to-[#050915]/96",
    glows: [
      "bg-[radial-gradient(circle,rgba(129,140,248,0.42),transparent_68%)]",
      "bg-[radial-gradient(circle,rgba(99,102,241,0.36),transparent_72%)]",
      "bg-[radial-gradient(circle,rgba(165,180,252,0.26),transparent_70%)]",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m15 9-6 6m0-6 6 6"
        />
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
};

const createId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export function PopupProvider({ children }) {
  const [popups, setPopups] = useState([]);
  const timersRef = useRef({});

  const dismissPopup = useCallback((id) => {
    setPopups((current) => current.filter((popup) => popup.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const showPopup = useCallback(
    ({
      title,
      message,
      variant = "info",
      actionLabel,
      onAction,
      duration = 4200,
    }) => {
      if (!title && !message) {
        return null;
      }

      const id = createId();
      setPopups((current) => [
        ...current,
        {
          id,
          title,
          message,
          variant,
          actionLabel,
          onAction,
        },
      ]);

      if (duration !== null) {
        timersRef.current[id] = window.setTimeout(() => {
          dismissPopup(id);
        }, duration);
      }

      return id;
    },
    [dismissPopup]
  );

  const contextValue = useMemo(
    () => ({
      showPopup,
      dismissPopup,
    }),
    [showPopup, dismissPopup]
  );

  const target = typeof document !== "undefined" ? document.body : null;

  return (
    <PopupContext.Provider value={contextValue}>
      {children}
      {target
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex flex-col items-center gap-3 px-4 sm:px-6">
              <AnimatePresence initial={false}>
                {popups.map((popup) => {
                  const {
                    id,
                    title,
                    message,
                    variant = "info",
                    actionLabel,
                    onAction,
                  } = popup;
                  const config = variantStyles[variant] ?? variantStyles.info;
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: -28, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -24, scale: 0.95 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-auto relative w-[min(27rem,100%)] overflow-hidden rounded-[999px] border border-white/12 bg-white/5 p-px shadow-[0_30px_90px_-40px_rgba(23,105,255,0.62)] backdrop-blur-3xl"
                    >
                      <div className="relative rounded-[999px] bg-[linear-gradient(140deg,rgba(2,9,20,0.94),rgba(7,22,46,0.9))] px-6 py-4 sm:px-7 sm:py-4">
                        <div className="pointer-events-none absolute inset-0 opacity-70">
                          <div
                            className={`absolute inset-0 bg-linear-to-r ${config.gradient} opacity-35`}
                          />
                          <span
                            className={`absolute -left-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full mix-blend-screen ${config.glows[0]}`}
                          />
                          <span
                            className={`absolute -right-12 top-0 h-24 w-24 rounded-full mix-blend-screen ${config.glows[1]}`}
                          />
                          <span
                            className={`absolute left-1/2 bottom-[-38px] h-24 w-24 -translate-x-1/2 rounded-full mix-blend-screen ${config.glows[2]}`}
                          />
                          <span className="absolute inset-0 rounded-[inherit] border border-white/10" />
                        </div>
                        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-full shadow-[0_12px_32px_-18px_rgba(30,108,255,0.8)] ${config.badge}`}
                            >
                              {config.icon}
                            </span>
                            <div className="flex-1 text-left">
                              {title ? (
                                <p className="text-sm font-semibold leading-tight text-white">
                                  {title}
                                </p>
                              ) : null}
                              {message ? (
                                <p className="mt-1 text-sm text-white/75">
                                  {message}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            {actionLabel && typeof onAction === "function" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onAction();
                                  dismissPopup(id);
                                }}
                                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                              >
                                {actionLabel}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => dismissPopup(id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
                              aria-label="Dismiss notification"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                className="h-3.5 w-3.5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m8 8 8 8m0-8-8 8"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>,
            target
          )
        : null}
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error("usePopup must be used within a PopupProvider");
  }
  return context;
}
