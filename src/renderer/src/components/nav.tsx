import { invoke } from "@/lib/electron"
import { broom } from "@lucide/lab"
import { clsx } from "clsx"
import {
  ChevronDown,
  CircleHelp,
  DatabaseBackup,
  Gamepad2,
  Icon,
  LayoutDashboard,
  RotateCw,
  SlidersHorizontal,
  Wrench,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import useRestartStore from "../store/restartState"
import Button from "./ui/button"
import Modal from "./ui/modal"

const tabIcons = {
  home: <LayoutDashboard size={20} />,
  backup: <DatabaseBackup size={20} />,
  tweaks: <Wrench size={20} />,
  clean: <Icon iconNode={broom} size={20} />,
  games: <Gamepad2 size={20} />,
  vpn: <Icon iconNode={broom} size={20} />,
  help: <CircleHelp size={20} />,
  settings: <SlidersHorizontal size={20} />,
}

const tabs = {
  home: { label: "Home", path: "/" },
  backup: { label: "Backup", path: "/backup" },
  tweaks: { label: "Tweaks", path: "/tweaks" },
  clean: { label: "Cleanup", path: "/clean" },
  games: { label: "Games", path: "/games" },
  vpn: { label: "VPN", path: "/vpn" },
  help: { label: "Get Help", path: "/help" },
  account: { label: "Account", path: "/account" },
  settings: { label: "Settings", path: "/settings" },
}

function Nav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { needsRestart } = useRestartStore()
  const [isPro, setIsPro] = useState(false)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [accountPlan, setAccountPlan] = useState<string>("free")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(true)
  const [showRestartModal, setShowRestartModal] = useState(false)

  useEffect(() => {
    const loadPlan = () => {
      invoke({ channel: "auth:get-session" })
        .then((account) => {
          setIsPro(account?.plan === "pro")
          setAccountName(account?.displayName ?? null)
          setAccountPlan(account?.plan ?? "free")
          setAvatarUrl(account?.avatarUrl ?? null)
        })
        .catch(() => {
          setIsPro(false)
          setAccountName(null)
        })
    }
    loadPlan()
    window.addEventListener("auth:changed", loadPlan)
    return () => window.removeEventListener("auth:changed", loadPlan)
  }, [])

  const getActiveTab = () => {
    const path = location.pathname
    if (path === "/") return "home"
    const match = Object.entries(tabs).find(([, { path: p }]) => p === path)
    return match ? match[0] : ""
  }

  const activeTab = getActiveTab()

  const itemClass = (active: boolean) =>
    clsx(
      "flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors",
      active
        ? "bg-flow-accent text-flow-text"
        : "text-flow-text-secondary hover:bg-flow-accent/50 hover:text-flow-text",
    )

  return (
    <nav className="text-flow-text fixed left-2 top-2 bottom-2 z-40 flex w-56 flex-col rounded-2xl border border-flow-border bg-flow-card/70 px-3 py-4 no-scrollbar overflow-y-auto">
      {/* Primary items */}
      <div className="flex flex-col gap-1">
        <button type="button" onClick={() => navigate(tabs.home.path)} className={itemClass(activeTab === "home")}>
          <span className="flex items-center justify-center">{tabIcons.home}</span>
          {tabs.home.label}
        </button>
        <button type="button" onClick={() => navigate(tabs.backup.path)} className={itemClass(activeTab === "backup")}>
          <span className="flex items-center justify-center">{tabIcons.backup}</span>
          {tabs.backup.label}
        </button>
        <button type="button" onClick={() => navigate(tabs.tweaks.path)} className={itemClass(activeTab === "tweaks")}>
          <span className="flex items-center justify-center">{tabIcons.tweaks}</span>
          {tabs.tweaks.label}
        </button>
        <button type="button" onClick={() => navigate(tabs.clean.path)} className={itemClass(activeTab === "clean")}>
          <span className="flex items-center justify-center">{tabIcons.clean}</span>
          {tabs.clean.label}
        </button>
      </div>

      {/* More section — Pro only: Games, VPN, Get Help */}
      {isPro && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-[15px] font-medium text-flow-text-secondary transition-colors hover:text-flow-text"
          >
            More
            <ChevronDown size={16} className={clsx("transition-transform duration-300", moreOpen && "rotate-180")} />
          </button>
          {moreOpen && (
            <div className="mt-1 flex flex-col gap-1">
              <button type="button" onClick={() => navigate(tabs.games.path)} className={itemClass(activeTab === "games")}>
                <span className="flex items-center justify-center">{tabIcons.games}</span>
                {tabs.games.label}
              </button>
              <button type="button" onClick={() => navigate(tabs.vpn.path)} className={itemClass(activeTab === "vpn")}>
                <span className="flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h.01" />
                    <path d="M2 8.82a15 15 0 0 1 20 0" />
                    <path d="M5 12.859a10 10 0 0 1 14 0" />
                    <path d="M8.5 16.429a5 5 0 0 1 7 0" />
                  </svg>
                </span>
                {tabs.vpn.label}
              </button>
              <button type="button" onClick={() => navigate(tabs.help.path)} className={itemClass(activeTab === "help")}>
                <span className="flex items-center justify-center">{tabIcons.help}</span>
                {tabs.help.label}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {needsRestart && (
        <button
          className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-flow-border-secondary bg-flow-accent px-3 py-2 text-sm text-red-500 transition-colors hover:bg-flow-border-secondary"
          onClick={() => setShowRestartModal(true)}
          title="Restart Windows to apply some changes"
        >
          <RotateCw size={16} /> Restart Required
        </button>
      )}

      {/* Account */}
      <button
        type="button"
        onClick={() => navigate(tabs.account.path)}
        className="mb-1 flex w-full items-center gap-3 rounded-xl bg-flow-accent/40 p-2.5 text-left transition-colors hover:bg-flow-accent"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flow-primary/15 text-sm font-bold text-flow-primary">
            {(accountName ?? "K").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{accountName ?? "Account"}</div>
          <div className="text-xs capitalize text-flow-text-secondary">
            {accountPlan === "pro" ? "Pro" : "Free"}
          </div>
        </div>
      </button>

      {/* Settings — bottom */}
      <button type="button" onClick={() => navigate(tabs.settings.path)} className={itemClass(activeTab === "settings")}>
        <span className="flex items-center justify-center">{tabIcons.settings}</span>
        {tabs.settings.label}
      </button>

      <Modal open={showRestartModal} onOpenChange={setShowRestartModal}>
        <div className="bg-flow-card p-4 rounded-2xl border border-flow-border text-flow-text w-[90vw] max-w-md">
          <h2 className="text-lg font-semibold">Confirm Restart</h2>
          <p>Are you sure you want to restart your computer now?</p>
          <div className="flex gap-2 justify-end">
            <Button onClick={() => setShowRestartModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowRestartModal(false)
                invoke({ channel: "restart" })
              }}
              variant="danger"
            >
              Restart
            </Button>
          </div>
        </div>
      </Modal>
    </nav>
  )
}

export default Nav
