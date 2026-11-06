import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import ICAL from "ical.js";
import {
  Check,
  ChevronDown,
  ClipboardList,
  History as HistoryIcon,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Trophy,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import type {
  BoardComposition,
  BoardOption,
  Difficulty,
  HistoryEntry,
  Lecture,
  Suggestion,
  View,
} from "./types/app";
import { DEFAULT_COMPOSITION, createBoard, getCompletedLines } from "./lib/board";
import { getLectureTiming, getPlayableWindow } from "./lib/lectures";
import { Alert } from "./components/Alert";
import { CountdownCard } from "./components/CountdownCard";
import { SidebarItem } from "./components/SidebarItem";
import { AdminView } from "./pages/AdminPage";
import { AuthView } from "./pages/AuthPage";
import { HistoryView } from "./pages/HistoryPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ProfileView } from "./pages/ProfilePage";
import { SuggestionsView } from "./pages/SuggestionsPage";

function App() {
  const [view, setView] = useState<View>("board");
  const [options, setOptions] = useState<BoardOption[]>([]);
  const [board, setBoard] = useState<BoardOption[]>([]);
  const [marked, setMarked] = useState<number[]>([]);
  const [newOption, setNewOption] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("deblingo-theme") === "dark",
  );
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nextLecture, setNextLecture] = useState<Lecture | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [clock, setClock] = useState(() => new Date());
  const [adminMode, setAdminMode] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [authResolved, setAuthResolved] = useState(false);
  const [historyReadyFor, setHistoryReadyFor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newSuggestion, setNewSuggestion] = useState("");
  const [composition, setComposition] =
    useState<BoardComposition>(DEFAULT_COMPOSITION);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const skipHistorySave = useRef(false);
  const historyInteraction = useRef(false);

  useEffect(() => {
    if (!showProfile) return;

    const closeOnOutsideInteraction = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfile(false);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setShowProfile(false);
    };

    document.addEventListener("mousedown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showProfile]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [{ data: userData }, { data, error: optionsError }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("board_options")
            .select("id, label, difficulty")
            .order("created_at"),
        ]);
      if (!active) return;
      if (optionsError) setError(optionsError.message);
      setUser(userData.user);
      if (userData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, is_admin")
          .eq("id", userData.user.id)
          .maybeSingle();
        setIsAdmin(profile?.is_admin === true);
        setUsername(
          profile?.username ?? userData.user.email?.split("@")[0] ?? "User",
        );
      }

      if (data) {
        setOptions(data);
        setBoard(createBoard(data, composition));
      }
      const { data: lectures } = await supabase
        .from("lectures")
        .select("id, source_uid, title, starts_at, ends_at")
        .order("starts_at")
        .limit(100);
      setLectures(lectures ?? []);
      const { data: boardSettings, error: settingsError } = await supabase
        .from("board_settings")
        .select("free_count, common_count, rare_count")
        .eq("id", 1)
        .maybeSingle();
      if (settingsError) {
        setError(settingsError.message);
      } else if (boardSettings) {
        setComposition({
          free: boardSettings.free_count,
          common: boardSettings.common_count,
          rare: boardSettings.rare_count,
        });
      }
      setAuthResolved(true);
      setLoading(false);
    };
    load();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setIsAdmin(false);
          setUsername("");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, is_admin")
          .eq("id", session.user.id)
          .maybeSingle();
        setIsAdmin(profile?.is_admin === true);
        setUsername(
          profile?.username ?? session.user.email?.split("@")[0] ?? "User",
        );
      },
    );
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authResolved) return;

    const historyOwner = user?.id ?? "guest";
    setHistoryReadyFor(null);
    const loadHistory = async () => {
      if (user) {
        const { data, error: historyError } = await supabase
          .from("lecture_history")
          .select(
            "id, source_uid, title, starts_at, ends_at, board, marked_ids, score, completed_lines",
          )
          .order("starts_at", { ascending: false });
        if (historyError) {
          setError(historyError.message);
          return;
        }
        setHistory((data ?? []) as HistoryEntry[]);
        setHistoryReadyFor(historyOwner);
        return;
      }

      const savedHistory = localStorage.getItem("deblingo-history");
      if (!savedHistory) {
        setHistory([]);
        setHistoryReadyFor(historyOwner);
        return;
      }
      try {
        setHistory(JSON.parse(savedHistory) as HistoryEntry[]);
        setHistoryReadyFor(historyOwner);
      } catch {
        setError("Saved local history could not be read.");
      }
    };

    void loadHistory();
  }, [authResolved, user]);

  useEffect(() => {
    if (!authResolved || !user) {
      setSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      const { data, error: suggestionsError } = await supabase
        .from("board_suggestions")
        .select("id, label, status, created_at, suggested_by")
        .order("created_at", { ascending: false });
      if (suggestionsError) {
        setError(suggestionsError.message);
        return;
      }
      setSuggestions((data ?? []) as Suggestion[]);
    };

    void loadSuggestions();
  }, [authResolved, user, isAdmin]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const sortedLectures = [...lectures].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  const activeLecture =
    sortedLectures.find((lecture) => {
      const { start, end } = getPlayableWindow(lecture);
      return end && start <= clock && end > clock;
    }) ?? null;
  const upcomingLecture =
    sortedLectures.find(
      (lecture) => getPlayableWindow(lecture).start > clock,
    ) ?? null;
  const boardAvailable = Boolean(activeLecture) || (isAdmin && adminMode);

  useEffect(() => {
    setNextLecture(activeLecture ?? upcomingLecture);
    if (!boardAvailable || !options.length) {
      if (!boardAvailable) {
        setBoard([]);
        setMarked([]);
      }
      return;
    }
    const storageKey = activeLecture
      ? `deblingo-board-${activeLecture.source_uid}`
      : "deblingo-board-admin";
    const savedBoard = localStorage.getItem(storageKey);
    if (savedBoard) {
      setBoard(JSON.parse(savedBoard));
    } else {
      const generatedBoard = createBoard(options, composition);
      localStorage.setItem(storageKey, JSON.stringify(generatedBoard));
      setBoard(generatedBoard);
    }
    setMarked([]);
  }, [activeLecture, upcomingLecture, boardAvailable, options, composition]);

  useEffect(() => {
    if (!activeLecture || !board.length) return;
    const historyOwner = user?.id ?? "guest";
    if (historyReadyFor !== historyOwner) return;
    const savedEntry = history.find(
      (entry) => entry.source_uid === activeLecture.source_uid,
    );
    setMarked(
      savedEntry
        ? savedEntry.marked_ids.filter((id) =>
            board.some((option) => option.id === id),
          )
        : [],
    );
  }, [activeLecture, board, history, historyReadyFor, user]);

  useEffect(() => {
    if (skipHistorySave.current) {
      skipHistorySave.current = false;
      return;
    }
    if (adminMode) return;
    if (!activeLecture || !board.length) return;
    const historyOwner = user?.id ?? "guest";
    if (historyReadyFor !== historyOwner) return;
    if (!historyInteraction.current) return;
    historyInteraction.current = false;

    const entry: HistoryEntry = {
      source_uid: activeLecture.source_uid,
      title: activeLecture.title,
      starts_at: activeLecture.starts_at,
      ends_at: activeLecture.ends_at,
      board,
      marked_ids: marked,
      score: marked.length,
      completed_lines: marked.length
        ? getCompletedLines(board, marked)
        : 0,
    };

    if (user) {
      void supabase
        .from("lecture_history")
        .upsert(
          {
            user_id: user.id,
            ...entry,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,source_uid" },
        )
        .select(
          "id, source_uid, title, starts_at, ends_at, board, marked_ids, score, completed_lines",
        )
        .single()
        .then(({ data, error: historyError }) => {
          if (historyError) {
            setError(historyError.message);
            return;
          }
          if (data) {
            setHistory((current) => [
              ...(current.filter(
                (item) => item.source_uid !== entry.source_uid,
              ) as HistoryEntry[]),
              data as HistoryEntry,
            ]);
          }
        });
      return;
    }

    setHistory((current) => {
      const next = [
        entry,
        ...current.filter((item) => item.source_uid !== entry.source_uid),
      ];
      localStorage.setItem("deblingo-history", JSON.stringify(next));
      return next;
    });
  }, [activeLecture, adminMode, board, historyReadyFor, marked, user]);

  const addOption = async () => {
    const label = newOption.trim();
    if (!label) return;
    const { data, error: insertError } = await supabase
      .from("board_options")
      .insert({ label, created_by: user?.id })
      .select("id, label, difficulty")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data) setOptions((current) => [...current, data]);
    setNewOption("");
  };

  const addSuggestion = async () => {
    const label = newSuggestion.trim();
    if (!label || !user) return;
    const { data, error: suggestionError } = await supabase
      .from("board_suggestions")
      .insert({ label, suggested_by: user.id })
      .select("id, label, status, created_at, suggested_by")
      .single();
    if (suggestionError) {
      setError(suggestionError.message);
      return;
    }
    if (data) setSuggestions((current) => [data as Suggestion, ...current]);
    setNewSuggestion("");
  };

  const updateDifficulty = async (id: number, difficulty: Difficulty) => {
    const { error: updateError } = await supabase
      .from("board_options")
      .update({ difficulty })
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setOptions((current) =>
      current.map((option) =>
        option.id === id ? { ...option, difficulty } : option,
      ),
    );
  };

  const updateComposition = async (next: BoardComposition) => {
    if (
      Object.values(next).some((value) => !Number.isInteger(value) || value < 0)
    ) {
      setError("Each difficulty count must be a whole number of zero or more.");
      return;
    }
    if (Object.values(next).reduce((total, value) => total + value, 0) !== 25) {
      setError("Difficulty counts must add up to exactly 25.");
      return;
    }
    const { error: settingsError } = await supabase
      .from("board_settings")
      .update({
        free_count: next.free,
        common_count: next.common,
        rare_count: next.rare,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (settingsError) {
      setError(settingsError.message);
      return;
    }
    setComposition(next);
  };

  const reviewSuggestion = async (
    suggestion: Suggestion,
    status: "accepted" | "rejected",
  ) => {
    if (!user || !isAdmin) return;
    if (status === "accepted") {
      const { data: option, error: optionError } = await supabase
        .from("board_options")
        .insert({
          label: suggestion.label,
          created_by: user.id,
          difficulty: "common",
        })
        .select("id, label, difficulty")
        .single();
      if (optionError) {
        setError(optionError.message);
        return;
      }
      if (option) setOptions((current) => [...current, option]);
    }

    const { data, error: reviewError } = await supabase
      .from("board_suggestions")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", suggestion.id)
      .select("id, label, status, created_at, suggested_by")
      .single();
    if (reviewError) {
      setError(reviewError.message);
      return;
    }
    if (data) {
      setSuggestions((current) =>
        current.map((item) =>
          item.id === suggestion.id ? (data as Suggestion) : item,
        ),
      );
    }

  };

  const uploadLectures = async (file: File) => {
    try {
      const calendar = new ICAL.Component(ICAL.parse(await file.text()));
      const lectures = calendar
        .getAllSubcomponents("vevent")
        .map((component) => {
          const event = new ICAL.Event(component);
          return {
            source_uid: event.uid,
            title: event.summary,
            starts_at: event.startDate.toJSDate().toISOString(),
            ends_at: event.endDate?.toJSDate().toISOString() ?? null,
            uploaded_by: user?.id,
          };
        })
        .filter((lecture) => {
          const title = lecture.title.toLowerCase();
          return title.includes("discrete") && title.includes("lecture");
        });
      if (!lectures.length) {
        setError(
          "No future events containing both “discrete” and “lecture” were found.",
        );
        return;
      }
      const { error: clearError } = await supabase
        .from("lectures")
        .delete()
        .neq("id", 0);
      if (clearError) throw clearError;
      const { data, error: insertError } = await supabase
        .from("lectures")
        .insert(lectures)
        .select("id, source_uid, title, starts_at, ends_at")
        .order("starts_at");
      if (insertError) throw insertError;
      setLectures(data ?? []);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to parse the ICS file.",
      );
    }
  };

  const deleteOption = async (id: number) => {
    const { error: deleteError } = await supabase
      .from("board_options")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setOptions((current) => current.filter((option) => option.id !== id));
    setBoard((current) => current.filter((option) => option.id !== id));
    setMarked((current) => current.filter((markedId) => markedId !== id));
  };

  const toggleMark = (id: number) => {
    if (!boardAvailable) return;
    if (!adminMode) historyInteraction.current = true;
    setMarked((current) =>
      current.includes(id)
        ? current.filter((markedId) => markedId !== id)
        : [...current, id],
    );
  };

  useEffect(() => {
    localStorage.setItem("deblingo-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const refreshLecture = async () => {
      const { data: lectures } = await supabase
        .from("lectures")
        .select("id, source_uid, title, starts_at, ends_at")
        .order("starts_at")
        .limit(100);
      const now = new Date();
      const current = lectures?.find((lecture) => {
        const timing = getLectureTiming(lecture);
        return timing.end && timing.start <= now && timing.end > now;
      });
      const next = lectures?.find(
        (lecture) => getLectureTiming(lecture).start > now,
      );
      setNextLecture(current ?? next ?? null);
    };
    const interval = window.setInterval(refreshLecture, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-[#f7f8fb] text-sm font-semibold text-[#748096] ${darkMode ? "dark-theme" : ""}`}
      >
        Loading your board…
      </div>
    );
  return (
    <div
      className={`min-h-screen bg-[#f7f8fb] text-[#182230] ${darkMode ? "dark-theme" : ""}`}
    >
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-[#e7eaf0] bg-white lg:flex">
        <div className="flex h-[88px] items-center gap-3 border-b border-[#e7eaf0] px-7">
          <img id="logo" src="/src/assets/icon.png" />
          <div>
            <p className="text-[17px] font-bold tracking-[-0.03em]">deblingo</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 py-7">
          <SidebarItem
            icon={<LayoutDashboard size={17} />}
            label="Board"
            active={view === "board"}
            onClick={() => setView("board")}
          />
          <SidebarItem
            icon={<HistoryIcon size={17} />}
            label="History"
            active={view === "history"}
            onClick={() => setView("history")}
          />
          <SidebarItem
            icon={<Trophy size={17} />}
            label="Leaderboard"
            active={view === "leaderboard"}
            onClick={() => setView("leaderboard")}
          />
          {user && !isAdmin && (
            <SidebarItem
              icon={<Plus size={17} />}
              label="Suggest options"
              active={view === "admin"}
              onClick={() => setView("admin")}
            />
          )}
          {isAdmin && (
            <SidebarItem
              icon={<ClipboardList size={17} />}
              label="Manage options"
              active={view === "admin"}
              onClick={() => setView("admin")}
            />
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-[#e7eaf0] px-6 py-5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${user ? "bg-[#f5b69d] text-[#7b3e31]" : "bg-[#eef2ff] text-[#2144d3]"}`}
          >
            {user ? username.slice(0, 2).toUpperCase() : "G"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold">
              {user ? username : "Playing as guest"}
            </p>
            <p className="text-[10px] text-[#98a2b3]">
              {user ? (isAdmin ? "Admin" : "Member") : "No login needed"}
            </p>
          </div>
          {user && (
            <button
              aria-label="Log out"
              onClick={() => supabase.auth.signOut()}
              className="text-[#a8b0bf]"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[252px]">
        <header className="flex h-[88px] items-center justify-between border-b border-[#e7eaf0] bg-white px-6 sm:px-10">
          <div>
            <h1 className="mt-1 text-[22px] font-bold tracking-[-0.04em]">
              {view === "board"
                ? ""
                : view === "history"
                  ? "Lecture history"
                  : view === "leaderboard"
                    ? "Leaderboard"
                    : view === "profile"
                      ? "Profile"
                      : isAdmin
                        ? "Manage board options"
                        : "Suggest board options"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {nextLecture && !adminMode && (
              <CountdownCard event={nextLecture} now={clock} compact />
            )}
            {isAdmin && view === "board" && (
              <button
                onClick={() => {
                  setAdminMode((current) => {
                    if (current) skipHistorySave.current = true;
                    return !current;
                  });
                  historyInteraction.current = false;
                  setMarked([]);
                }}
                className={`rounded-xl px-3 py-2 text-[11px] font-bold transition ${adminMode ? "bg-[#32c184] text-white" : "border border-[#e3e7ed] text-[#647086] hover:border-[#2144d3] hover:text-[#2144d3]"}`}
              >
                {adminMode ? "Exit admin mode" : "Admin mode"}
              </button>
            )}
            <button
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              onClick={() => setDarkMode((current) => !current)}
              className="rounded-xl border border-[#e3e7ed] p-2 text-[#647086] transition hover:text-[#2144d3]"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user ? (
              <div ref={profileMenuRef} className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2 rounded-xl border border-[#e3e7ed] p-1.5 pr-2.5"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5b69d] text-[10px] font-bold text-[#7b3e31]">
                    {username.slice(0, 2).toUpperCase()}
                  </span>
                  <ChevronDown size={14} className="text-[#8993a5]" />
                </button>
                {showProfile && (
                  <div className="absolute right-0 top-12 z-30 w-40 rounded-xl border border-[#e7eaf0] bg-white p-2 text-xs shadow-xl">
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        setView("profile");
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#f5f7fb]"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#f5f7fb]"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                aria-label="Guest mode. Click to sign in or create an account"
                onClick={() => setView("admin")}
                className="flex items-center gap-2 rounded-xl bg-[#2144d3] px-3.5 py-2.5 text-[12px] font-bold text-white shadow-[0_6px_16px_rgba(33,68,211,0.18)] transition hover:bg-[#1738bd]"
              >
                <LogIn size={14} />
                Sign in
              </button>
            )}
          </div>
        </header>

        {error && <Alert message={error} onDismiss={() => setError("")} />}
        {view === "board" ? (
          <section
            className={`mx-auto max-w-[1120px] px-5 sm:px-10 lg:px-14 ${
              !boardAvailable && nextLecture ? "" : "py-8"
            }`}
          >
            {!boardAvailable && nextLecture && (
              <CountdownCard event={nextLecture} now={clock} emptyState />
            )}
            {boardAvailable && (
              <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                  <h2 className="text-[32px] font-extrabold tracking-[-0.055em] text-[#15202e] sm:text-[40px]">
                    <br />
                    <span className="text-[#2144d3]">deblingo.</span>
                  </h2>
                  <p className="mt-3 max-w-[440px] text-[13px] leading-6 text-[#748096]">
                    Mark a square whenever you spot it. Get five in a row to
                    call <em className="italic">deblingo</em>!
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-[#e3e7ed] bg-white px-4 py-2.5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ba4b5]">
                      Marked
                    </p>
                    <p className="mt-0.5 text-lg font-extrabold text-[#2144d3]">
                      {marked.length}
                      <span className="text-sm font-semibold text-[#a8b1c0]">
                        {" "}
                        / 25
                      </span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#e3e7ed] bg-white px-4 py-2.5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ba4b5]">
                      Lines
                    </p>
                    <p className="mt-0.5 text-lg font-extrabold text-[#2144d3]">
                      {getCompletedLines(board, marked)}
                      <span className="text-sm font-semibold text-[#a8b1c0]">
                        {" "}
                        / 12
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
            {boardAvailable && (
              <div className="rounded-[22px] border border-[#e6e9ef] bg-white p-3 shadow-[0_15px_40px_rgba(38,51,77,0.06)] sm:p-5">
                <div className="mb-4 flex items-center justify-between px-1 sm:px-2">
                  <button
                    onClick={() => {
                      historyInteraction.current = true;
                      setMarked([]);
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#8994a6] hover:text-[#2144d3]"
                  >
                    <RotateCcw size={13} /> Clear marks
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {board.map((option, index) => {
                    const isMarked = marked.includes(option.id);
                    return (
                      <button
                        key={`${option.id}-${index}`}
                        onClick={() => toggleMark(option.id)}
                        className={`group relative flex min-h-[92px] flex-col items-center justify-center rounded-[13px] border p-2 text-center transition sm:min-h-[119px] sm:p-4 ${isMarked ? "border-[#2144d3] bg-[#2144d3] text-white shadow-[0_7px_15px_rgba(33,68,211,0.2)]" : "border-[#e5e9ef] bg-[#fbfcfd] text-[#354154] hover:-translate-y-0.5 hover:border-[#aebcf4] hover:bg-[#f5f7ff]"}`}
                      >
                        <span className="text-[10px] font-bold leading-[1.35] sm:text-[12px]">
                          {option.label}
                        </span>
                        {isMarked && (
                          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                            <Check size={10} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {!boardAvailable && !nextLecture && (
              <div className="rounded-2xl border border-[#e4e8ef] bg-white p-10 text-center text-sm text-[#748096]">
                No lecture is currently available.
              </div>
            )}
          </section>
        ) : view === "history" ? (
          <HistoryView history={history} />
        ) : view === "leaderboard" ? (
          <LeaderboardPage isAdmin={isAdmin} onError={setError} />
        ) : view === "profile" && user ? (
          <ProfileView
            user={user}
            username={username}
            onUsernameChanged={setUsername}
            onBack={() => setView("board")}
          />
        ) : isAdmin ? (
          <AdminView
            options={options}
            newOption={newOption}
            setNewOption={setNewOption}
            addOption={addOption}
            deleteOption={deleteOption}
            uploadLectures={uploadLectures}
            suggestions={suggestions}
            reviewSuggestion={reviewSuggestion}
            composition={composition}
            updateComposition={updateComposition}
            updateDifficulty={updateDifficulty}
          />
        ) : user ? (
          <SuggestionsView
            suggestions={suggestions}
            newSuggestion={newSuggestion}
            setNewSuggestion={setNewSuggestion}
            addSuggestion={addSuggestion}
          />
        ) : (
          <AuthView onSignedIn={setUser} />
        )}
      </main>
    </div>
  );
}

export default App;
