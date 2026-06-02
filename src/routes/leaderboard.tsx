import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "XO Live — Leaderboard" },
      { name: "description", content: "Global rankings of the top XO Live players." },
    ],
  }),
  component: Leaderboard,
});

const PODIUM = [
  {
    rank: 2,
    name: "Sarah",
    wins: 842,
    color: "bg-secondary",
    border: "border-outline-variant",
    height: "h-24",
    pt: "pt-6",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAeUaCYJPrJmSwaX9pYev4pNBEbzKdFHfOeGPOHYbLk5yxuSBSOQmVeY6rMF1em3qigphMtj7RX9LkW7lDpA0Aj3L2uivu7c2nz8ATVzMS9C8s_WRfmWb3UY_CiFbRrgUREcD6aZBZ74ZILi8x5HdQCJzchf-F6PHRcpUMChGhs0cEw0T_8-VT_2d5CwBFHgZYFtsLuMPXqTet7UGyjqZ1Lo-KZzPiIXDtSYXt-v89Wp61nLIf0qCkPM53D39AWIxi2dws4VetigUvg",
    badgeBg: "bg-outline-variant",
    size: "w-16 h-16 md:w-20 md:h-20",
  },
  {
    rank: 1,
    name: "Alex_Pro",
    wins: 1124,
    color: "bg-primary",
    border: "border-primary",
    height: "h-32",
    pt: "pt-10",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD5lCz7Nr1w7UPiQS_yxiwC3LRyXCY24M0YmbsE288O1xkKjcUGkl6Dnd8o52PBfSFIkqE8EUFtMMCPnStQhOqJD_CsizH4uzFSWDeUWjnqcihmkcA8Z-e1OCpSaeHn-SQzyVDRjesKdoq5FbjFup1TDO4tqtBVnosP_A0FCJboltsDylML2kcjWplPaw5iBBERh8s0zt6n9LkRcjEDJEh81nza6peB0H9uFgV3mBSBWJ-lEvo5cRl2y6jeR1KqWOal8JbpqjijTQXx",
    badgeBg: "bg-primary",
    size: "w-20 h-20 md:w-24 md:h-24",
    crown: true,
  },
  {
    rank: 3,
    name: "Mikel_O",
    wins: 756,
    color: "bg-tertiary",
    border: "border-[#CD7F32]",
    height: "h-20",
    pt: "pt-3",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCJ_dQfRxYlxf76KphJszrCS07whzHuxKL6lVf1v4AID9qae4HccjOG8JNubV1opuIgByV0VdWtOBadfuTEFMeXSIataCv1r7ZuOGH6kzElhrQFdCpR3k3P1y7XPlIF6RKOgfGhBNsbBGIiNhT1qn_pAY9Tisz94wFK4JiUJT82yybsoe2nyWRCf-mRxryCa0KoDXPanKI2UpJVVxqaV2NIDtd0tGTpdRP2ruqYDV50l4Nl_AOTJQS70vB_17q7Q48Zdb4dXwFln4Dd",
    badgeBg: "bg-[#CD7F32]",
    size: "w-16 h-16 md:w-20 md:h-20",
  },
];

const PLAYERS = [
  {
    rank: 4,
    name: "CloudNinja",
    level: 42,
    wins: 682,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDvCtI2uFpPbhGDPAcJRWDFCUnccXTH-XPidgf7El-Rvfx8iYvQBxpuLp8tgSM5JzgsKgoPfU9yQXoumKVkW29x4JqUEnyFfooLeBAT_L2eMCnn6O1WgyWzzX_yywEubKkgSBsldfEh7VD6GGm1azcVgptgSTpSFwXOEBNOFGQfvQmQCjIt3bW5-5T0cKxAn_Zfpn1YkrvCRivKS26xwK0qmC9aEye7CKzJvvbPico4kwf6bKxqH8ToQWeDPsi_IqgeMMvj8jKvHDx9",
  },
  {
    rank: 5,
    name: "XoKing",
    level: 39,
    wins: 591,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAWknsGh2si_YyMoPW0FprIcMlPDQdHSmyBnMxFjPVMau_wObs6roeSWuHpFOgEXH7wLwl7XUVAKLX2oVgosA3Kt6YlZCxDb6_FpnFID9gFDgCoFyXjM_nHVzX5K8Kz1D3u8JrxyE6b-g6T-p41twvAy320Xv1ZBeu5m8shsig1d7MaRVMbek9P0wmZlVcSU7r6T1wExWKXDPJbP3SL2eRw28IYUmH1-snXIhgTYP_TVgrIzeQ1immh7F1-VhAgekQrc_gNnp2WiNSe",
  },
];

const ME = {
  rank: 124,
  name: "Felix (You)",
  level: 18,
  wins: 122,
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBjoCRlykUk38LWbsyLcV1kFlDfLczmIol_6Tatf4ZD6mpPQaZimgg9UeooN4H2WC7Znh0sMQnYYhZWiLzc4IJmAMiVMpRjbuNASi4rS-8-eVxqd7MkrNIaFWefaHXyqy0Vbc-0x72-ackXPQtAEGAUcs3_FZD9i7bKiI1QvV_V5T3yAzwSbVyJYCfI46fEV_yKahw7aKHApV2SVuZSVzjw6_oyIWOHT9Nu0dWj-l9t295P96nA-Cl7xZ6NzHso-UzfI7V-wK7-kTnP",
};

const NEXT = {
  rank: 125,
  name: "Evey_Play",
  level: 21,
  wins: 119,
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBbgt_a9Zofw7QZWoCHUfQ8RNG0CHzs93qhT7OKPpC9t3GTSjYcIWgHP03-vtsSYwAvmy2JtLjoLibyY79fOQ-cwZxMhcdKbUakSYc0jWa8x5t30QYWKdilveedtl0itnpFppjmDFqB7pR8Rt0DxefO0hHVOMY4RaVHg93gMnND-DetSQ3vwI0fRhU_BX8yoeGO2CQj4XGJ9a7cGTeOfXzWsOM0wkRYU4jWQc6EusQI3nxW9H1vujabR3HClXZwaxf4zYwOkblNbGHo",
};

function Row({ p }: { p: typeof PLAYERS[number] }) {
  return (
    <div className="group flex items-center bg-white px-6 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
      <div className="w-12 flex justify-center">
        <span className="text-2xl font-bold text-primary-fixed-dim">{p.rank}</span>
      </div>
      <div className="flex-grow flex items-center pl-6 gap-6">
        <div className="w-12 h-12 rounded-full bg-surface-container-high overflow-hidden border-2 border-surface-container-high">
          <img src={p.avatar} alt="" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-lg font-semibold text-on-surface">{p.name}</p>
          <p className="text-xs text-outline">Level {p.level}</p>
        </div>
      </div>
      <div className="w-20 text-right">
        <span className="text-2xl font-bold text-secondary">{p.wins}</span>
      </div>
    </div>
  );
}

function Leaderboard() {
  const [query, setQuery] = useState("");
  const all = [...PLAYERS, NEXT];
  const filtered = all.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Shell>
      <div className="space-y-6">
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends or rankings..."
            className="w-full pl-14 pr-6 py-4 bg-surface-container border-none rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition text-base placeholder:text-outline shadow-sm"
          />
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-3 mb-6 md:gap-10 pt-6">
          {PODIUM.map((p) => (
            <div key={p.rank} className="flex flex-col items-center w-1/3 max-w-[140px]">
              <div className="relative mb-2">
                {p.crown && (
                  <Icon
                    name="workspace_premium"
                    filled
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-primary text-[32px]"
                  />
                )}
                <div
                  className={`${p.size} rounded-full border-4 ${p.border} p-1 bg-white overflow-hidden shadow-lg`}
                >
                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover rounded-full" />
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 ${p.badgeBg} text-white ${p.rank === 1 ? "w-8 h-8 text-sm border-2 border-white" : "w-6 h-6 text-xs"} rounded-full flex items-center justify-center font-bold`}
                >
                  {p.rank}
                </div>
              </div>
              <div
                className={`${p.color} text-white rounded-t-2xl w-full ${p.pt} pb-2 px-1 text-center shadow-lg ${p.height}`}
              >
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-2xl font-bold">{p.wins}</p>
                <p className="text-[10px] uppercase opacity-80 tracking-widest">Wins</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rankings */}
        <div className="space-y-2">
          <div className="flex items-center px-6 py-2 text-outline text-xs uppercase tracking-widest font-semibold">
            <span className="w-12 text-center">Rank</span>
            <span className="flex-grow pl-6">Player</span>
            <span className="w-20 text-right">Wins</span>
          </div>

          {filtered.slice(0, query ? filtered.length : 2).map((p) => (
            <Row key={p.rank} p={p} />
          ))}

          {!query && (
            <div className="group flex items-center bg-primary-container px-6 py-4 rounded-2xl shadow-md border-2 border-primary scale-[1.02] mt-6">
              <div className="w-12 flex justify-center">
                <span className="text-2xl font-bold text-on-primary-container">{ME.rank}</span>
              </div>
              <div className="flex-grow flex items-center pl-6 gap-6">
                <div className="w-12 h-12 rounded-full bg-white overflow-hidden border-2 border-primary">
                  <img src={ME.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-lg font-bold text-on-primary-container">{ME.name}</p>
                  <p className="text-xs text-on-primary-container opacity-80">Level {ME.level}</p>
                </div>
              </div>
              <div className="w-20 text-right">
                <span className="text-2xl font-bold text-on-primary-container">{ME.wins}</span>
              </div>
            </div>
          )}

          {!query && <Row p={NEXT} />}
        </div>
      </div>
    </Shell>
  );
}
