import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XO Live — Home" },
      { name: "description", content: "Create or join a live tic-tac-toe room and challenge friends." },
    ],
  }),
  component: Home,
});

const MATCHES = [
  {
    opponent: "Luna",
    result: "Lost",
    time: "10m ago",
    won: false,
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBgp8POThvUT3sB4I23_UeGaNPXB0tkuAZVIKK_BRNL3UiCiIN8DDLQ_ZXcWLMtcDT0FtaVUcINHrdXrTl87U0uORnxXaEjYLnWcayam6x1zJKj6E0A0M8kU1P9IfpBeQC4ViJmdzsRDsdVKGPpqqxgOB-WfXVJqOkk5OoGb4fWKfpY78lZnNQc1s8nL69tV0FjvjDbGPru-m97TmnCCh9W5xv9NIxZAQcXpyZMFrG1AHkXwKEI-t-P6SLXH7RifE4O1MlcOJn2nU56",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBYKca0vJxEe_lSy-wTde_i5jWq5Bn8gIQXHdP_aW0b6jRVSiNTm4SBuXcRwsOyh-2ueAj1jAHw0bOBiMUQjymzQjPFhnsb0qaAudCQU6YNtyM7Zd3JdVRHVFwy40kZFJDopt39DIDRkQ7IeLIjoBiVqAE3VQg5HQ2j1RRfLCZEGpzbSQNMGQrjsFVOBWDTvffnZA80G0htGLwsPGAjl7n82PpmGBP7QryUZcHtIXKOHhFM4RJFeTX9Yw6g5JKaJP6doa59kIvc5SZs",
    ],
  },
  {
    opponent: "Kai",
    result: "Won",
    time: "2h ago",
    won: true,
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBAG9BF0LQI6fayopAk_Lv9wW3C_uD7kL2RdxGpm-H2tyOpeKTP3ew_14B0mL8_9UaP0BdIEVUgLMAChqByb7IEMz_7DI1xqjgaCJRvhcS6Qsxjn6L5jbehGpl_W4fdY7oevg-SBqkVX9X2obIEhB610lHrYEPzlQNhA-GGFGzTU9VjbsqYsuxrh3iM4cEcAXdKexAKvCVRo9G8tzJTkDaD9oxzepO1gJ_qga4mKMQTVRbGLFMl3qbfxIc_bzytEoEsM4hrnpfVaLdO",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDBZW6rxgU8byfjXmsxB-f0gu-_1eQ4hT36dBKQCY67jIKPN5AqOz5Vk4QXmW-4SxaDZgYan7MpTz5VxSvOURSR6QPj-7mkUd7vVU8e1aOHoT-88MgOS7iXs0B6VM5vIdZOj5fik3ux1WHshdCgm7mSUpHA-KaBekfElIUdcRAV-TTyHve2Nt8dO7CT511fFsGYz6ZhO1DqfK_bAPP7YLbbI9egcUM8a0BI5KKf4LC5tVGfrsFNIiTv1Gabi_qTwgrPQUvkgcCkcxda",
    ],
  },
];

function Home() {
  return (
    <Shell>
      <div className="space-y-10">
        <section>
          <h1 className="text-3xl font-bold text-on-surface">Hello, Qlax 👋</h1>
          <p className="text-base font-medium text-on-surface-variant mt-1">
            Ready to dominate the board today?
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/create-room"
            className="bubbly relative overflow-hidden h-48 rounded-2xl bg-primary text-on-primary p-6 flex flex-col justify-end shadow-[0_8px_0_0_#394086] text-left group"
          >
            <div className="absolute -top-4 -right-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <Icon name="add_circle" filled className="text-[120px]" />
            </div>
            <div className="relative z-10">
              <Icon name="add_box" filled className="text-4xl mb-2 block" />
              <h2 className="text-2xl font-semibold">Create Room</h2>
              <p className="text-xs font-bold tracking-widest opacity-80 uppercase mt-1">
                Start a new match with friends
              </p>
            </div>
          </Link>

          <Link
            to="/join-room"
            className="bubbly relative overflow-hidden h-48 rounded-2xl bg-secondary text-on-secondary p-6 flex flex-col justify-end shadow-[0_8px_0_0_#26288c] text-left group"
          >
            <div className="absolute -top-4 -right-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <Icon name="group" filled className="text-[120px]" />
            </div>
            <div className="relative z-10">
              <Icon name="login" filled className="text-4xl mb-2 block" />
              <h2 className="text-2xl font-semibold">Join Room</h2>
              <p className="text-xs font-bold tracking-widest opacity-80 uppercase mt-1">
                Enter a code to play with others
              </p>
            </div>
          </Link>
        </section>

        <section>
          <Link
            to="/game"
            search={{ quick: true } as never}
            className="w-full bubbly bg-tertiary-container text-on-tertiary-container py-6 rounded-2xl flex items-center justify-center gap-3 shadow-[0_6px_0_0_#56589b] text-2xl font-semibold"
          >
            <Icon name="bolt" filled />
            Quick Play
          </Link>
        </section>

        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest">
              Recent Matches
            </h3>
            <button className="text-primary text-sm font-semibold hover:underline">View All</button>
          </div>
          <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-1">
            {MATCHES.map((m) => (
              <div
                key={m.opponent}
                className="min-w-[280px] bg-surface-container rounded-2xl p-3 flex items-center gap-3 border border-outline-variant hover:border-primary transition-colors cursor-pointer group"
              >
                <div className="flex -space-x-3">
                  {m.avatars.map((a, i) => (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-full border-2 border-surface overflow-hidden bg-primary-container"
                    >
                      <img src={a} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-semibold">vs {m.opponent}</p>
                  <p className={`text-xs font-bold ${m.won ? "text-primary" : "text-error"}`}>
                    {m.result} • {m.time}
                  </p>
                </div>
                <div className="bg-surface p-2 rounded-full group-hover:bg-primary-container transition-colors">
                  <Icon name="chevron_right" className="text-primary" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col items-center text-center">
            <span className="text-5xl font-bold text-primary tracking-tight">24</span>
            <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mt-1">
              Matches Won
            </span>
          </div>
          <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col items-center text-center">
            <span className="text-5xl font-bold text-secondary tracking-tight">1.2k</span>
            <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant mt-1">
              Global Rank
            </span>
          </div>
        </section>
      </div>
    </Shell>
  );
}
