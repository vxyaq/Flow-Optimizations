import { useEffect, useState, useCallback, memo } from "react"
import { LoaderCircle } from "lucide-react"
import { toast } from "react-toastify"
import { invoke } from "@/lib/electron"
import Card from "@/components/ui/Card"
import Toggle from "@/components/ui/Toggle"
import RootDiv from "@/components/rootdiv"
import cs2Background from "../assets/cs2-background.webp"
import fortniteBackground from "../assets/fortnite-background.webp"
import apexLegendsBackground from "../assets/apex-legends-background.webp"
import battlefield2042Background from "../assets/battlefield-2042-background.webp"
import codWarzoneBackground from "../assets/cod-warzone-background.webp"
import cyberpunk2077Background from "../assets/cyberpunk-2077-background.webp"
import darkSouls3Background from "../assets/dark-souls-3-background.webp"
import destiny2Background from "../assets/destiny-2-background.webp"
import dota2Background from "../assets/dota-2-background.webp"
import eldenRingBackground from "../assets/elden-ring-background.webp"
import escapeFromTarkovBackground from "../assets/escape-from-tarkov-background.webp"
import fifa24Background from "../assets/fifa-24-background.webp"
import forzaHorizon5Background from "../assets/forza-horizon-5-background.webp"
import gtaVBackground from "../assets/gta-v-background.webp"
import hellLetLooseBackground from "../assets/hell-let-loose-background.webp"
import huntShowdownBackground from "../assets/hunt-showdown-background.webp"
import minecraftBackground from "../assets/minecraft-background.webp"
import nba2k24Background from "../assets/nba-2k24-background.webp"
import overwatch2Background from "../assets/overwatch-2-background.webp"
import palworldBackground from "../assets/palworld-background.webp"
import pubgBackground from "../assets/pubg-background.webp"
import rainbowSixSiegeBackground from "../assets/rainbow-six-siege-background.webp"
import redDeadRedemption2Background from "../assets/red-dead-redemption-2-background.webp"
import rocketLeagueBackground from "../assets/rocket-league-background.webp"
import rustBackground from "../assets/rust-background.webp"
import satisfactoryBackground from "../assets/satisfactory-background.webp"
import spiderManRemasteredBackground from "../assets/spider-man-remastered-background.webp"
import valorantBackground from "../assets/valorant-background.webp"
import warframeBackground from "../assets/warframe-background.webp"
import witcher3Background from "../assets/witcher-3-background.webp"

const BACKGROUNDS: Record<string, string> = {
  "cs2-background.webp": cs2Background,
  "fortnite-background.webp": fortniteBackground,
  "apex-legends-background.webp": apexLegendsBackground,
  "battlefield-2042-background.webp": battlefield2042Background,
  "cod-warzone-background.webp": codWarzoneBackground,
  "cyberpunk-2077-background.webp": cyberpunk2077Background,
  "dark-souls-3-background.webp": darkSouls3Background,
  "destiny-2-background.webp": destiny2Background,
  "dota-2-background.webp": dota2Background,
  "elden-ring-background.webp": eldenRingBackground,
  "escape-from-tarkov-background.webp": escapeFromTarkovBackground,
  "fifa-24-background.webp": fifa24Background,
  "forza-horizon-5-background.webp": forzaHorizon5Background,
  "gta-v-background.webp": gtaVBackground,
  "hell-let-loose-background.webp": hellLetLooseBackground,
  "hunt-showdown-background.webp": huntShowdownBackground,
  "minecraft-background.webp": minecraftBackground,
  "nba-2k24-background.webp": nba2k24Background,
  "overwatch-2-background.webp": overwatch2Background,
  "palworld-background.webp": palworldBackground,
  "pubg-background.webp": pubgBackground,
  "rainbow-six-siege-background.webp": rainbowSixSiegeBackground,
  "red-dead-redemption-2-background.webp": redDeadRedemption2Background,
  "rocket-league-background.webp": rocketLeagueBackground,
  "rust-background.webp": rustBackground,
  "satisfactory-background.webp": satisfactoryBackground,
  "spider-man-remastered-background.webp": spiderManRemasteredBackground,
  "valorant-background.webp": valorantBackground,
  "warframe-background.webp": warframeBackground,
  "witcher-3-background.webp": witcher3Background,
}

const OPTIMIZE_TIMEOUT_MS = 90000

interface GameCardProps {
  game: GameEntry
  isInstalled: boolean
  isApplied: boolean
  isBusy: boolean
  onToggle: (game: GameEntry, apply: boolean) => void
}

const GameCard = memo(function GameCard({
  game,
  isInstalled,
  isApplied,
  isBusy,
  onToggle,
}: GameCardProps) {
  const bg = game.background?.startsWith("http")
    ? game.background
    : BACKGROUNDS[game.background]
  return (
    <Card
      className="group relative h-52 overflow-hidden border border-flow-border bg-flow-accent p-0 [content-visibility:auto] [contain-intrinsic-size:auto_208px]"
      style={{ borderRadius: "13px" }}
    >
      {bg && (
        <img
          src={bg}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-black/10" />
      <div className="relative flex h-full flex-col p-4">
        <h2 className="text-sm font-semibold leading-tight text-white">{game.title}</h2>
        <div className="pointer-events-none absolute inset-0 flex items-center bg-black/75 p-4 text-xs leading-relaxed text-white/85 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {game.description}
        </div>
        {isInstalled && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2.5 rounded-xl border border-white/15 bg-black/60 px-3 py-1.5">
            {isBusy && <LoaderCircle size={14} className="animate-spin text-white/80" />}
            <Toggle
              checked={isApplied}
              disabled={isBusy}
              onChange={(checked) => onToggle(game, checked)}
            />
          </div>
        )}
      </div>
    </Card>
  )
})

type GameEntry = {
  id: string
  title: string
  background: string
  description: string
  notRunningMarker: string
  notRunningText: string
  missingMarker: string
  missingText: string
  successText: string
  psunapply: string
}

export default function Games(): React.ReactElement {
  const [games, setGames] = useState<GameEntry[]>([])
  const [installed, setInstalled] = useState<Record<string, boolean | null>>({})
  const [applied, setApplied] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("flow:gameOptimized")
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      invoke({ channel: "games:fetch" }),
      invoke({ channel: "games:detect" }),
    ]).then(([fetched, detected]) => {
      if (fetched.status === "fulfilled" && Array.isArray(fetched.value)) {
        setGames([...fetched.value].sort((a, b) => a.title.localeCompare(b.title)))
      }
      if (detected.status === "fulfilled" && Array.isArray(detected.value)) {
        const map: Record<string, boolean> = {}
        for (const g of detected.value) map[g.id] = !!g.installed
        setInstalled(map)
      }
      setLoading(false)
    })
  }, [])

  const persistApplied = useCallback((id: string, value: boolean) => {
    setApplied((prev) => {
      const next = { ...prev, [id]: value }
      try {
        localStorage.setItem("flow:gameOptimized", JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const runGameScript = useCallback(
    async (game: GameEntry, apply: boolean) => {
      if (!apply && !game.psunapply) {
        toast.info(`${game.title} can't be reverted automatically.`)
        return
      }
      setBusy((prev) => ({ ...prev, [game.id]: true }))
      try {
        const result = await Promise.race([
          invoke({
            channel: apply ? "game:apply" : "game:unapply",
            payload: game.id,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error("Optimization timed out. Try again.")),
              OPTIMIZE_TIMEOUT_MS,
            )
          }),
        ])

        if (!result?.success) {
          throw new Error(result?.error || "Failed to apply the optimization.")
        }

        if (apply && game.notRunningMarker && result.output?.includes(game.notRunningMarker)) {
          toast.info(game.notRunningText || "Launch the game and click the button again.")
          return
        }

        if (apply && game.missingMarker && result.output?.includes(game.missingMarker)) {
          toast.success(game.missingText || game.successText)
        } else {
          toast.success(apply ? game.successText : `${game.title} optimization reverted.`)
        }
        persistApplied(game.id, apply)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
      } finally {
        setBusy((prev) => ({ ...prev, [game.id]: false }))
      }
    },
    [persistApplied],
  )

  if (loading) {
    return (
      <RootDiv>
        <div className="flex min-h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-flow-border border-t-flow-primary" />
        </div>
      </RootDiv>
    )
  }

  return (
    <RootDiv>
      <div className="w-full">
        {games.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-sm font-medium mb-2 text-flow-text">No games yet</h3>
            <p className="text-flow-text-secondary">Request a game in Settings.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              isInstalled={installed[game.id] === true}
              isApplied={!!applied[game.id]}
              isBusy={!!busy[game.id]}
              onToggle={runGameScript}
            />
          ))}
        </div>
      </div>
    </RootDiv>
  )
}
