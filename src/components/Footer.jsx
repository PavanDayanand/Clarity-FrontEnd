const TEAM = [
  {
    name: "Pavan D",
    linkedin: "https://www.linkedin.com/in/pavan-d-856231259/",
    github: "https://github.com/PavanDayanand",
    portfolio: "https://pavan-d.netlify.app/",
  },
  {
    name: "Harsha K L",
    linkedin: "https://www.linkedin.com/in/harsha-k-l-9394b9259/",
    github: "https://github.com/harshakl03",
    portfolio: "https://harshakl-portfolio.netlify.app/",
  },
  {
    name: "Eshwar R",
    linkedin: "https://www.linkedin.com/in/eshwar-r-20985131b/",
    github: "https://github.com/Eshwar3026",
  },
  {
    name: "Mohammed Amaan",
    linkedin: "https://www.linkedin.com/in/mohammed-amaan-611309309/",
    github: "https://github.com/MdAmaan026",
  },
];

const LinkRow = ({ label, href }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="text-sm font-medium text-white/80 transition hover:text-white"
  >
    {label}
  </a>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-24 text-white">
      <div className="mx-auto w-full max-w-8xl bg-white/3 px-10 py-14 backdrop-blur-xl sm:px-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-6">
            <span className="text-[13vw] font-black leading-none tracking-tight text-white sm:text-[10rem] lg:text-[12rem]">
              CLARITY
            </span>
            <div className="grid grid-cols-2 gap-y-6 gap-x-10 text-sm uppercase tracking-[0.28em] text-white/60 sm:grid-cols-4">
              <span>Contact</span>
              <span>Follow</span>
              <span>Language</span>
              <span>Team</span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-6 lg:w-1/3">
            <span className="text-4xl font-serif text-white sm:text-5xl">
              Created for life
            </span>
            <p className="text-white/70 text-sm leading-relaxed">
              Precision healthcare experiences crafted with intent, maintained
              with empathy, and improved with every patient story.
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 border-t border-white/12 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((member) => (
            <div key={member.name} className="flex flex-col gap-3">
              <span className="text-lg font-semibold text-white">
                {member.name}
              </span>
              <div className="flex flex-col gap-1 text-white/70">
                <LinkRow label="LinkedIn" href={member.linkedin} />
                <LinkRow label="GitHub" href={member.github} />
                <LinkRow label="Portfolio" href={member.portfolio} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/12 pt-8 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <span>Made with care by the Clarity team</span>
          <span>Privacy Policy</span>
          <span>© {currentYear} Clarity</span>
        </div>
      </div>
    </footer>
  );
}
