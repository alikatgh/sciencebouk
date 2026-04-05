import type { ReactElement, ReactNode } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BlockMath } from "react-katex";
import {
  ArrowRight,
  CheckCircle2,
  Equal,
  Minus,
  PartyPopper,
  Scale,
  Split,
} from "lucide-react";

type LessonStep = "start" | "afterSubtract" | "solved";
type ActionId = "subtract-4" | "divide-2";
type FeedbackTone = "info" | "warning" | "success";
type TokenTone = "variable" | "unit";

interface PanToken {
  id: string;
  label: string;
  tone: TokenTone;
}

interface LessonState {
  id: LessonStep;
  equation: string;
  prompt: string;
  leftTokens: PanToken[];
  rightTokens: PanToken[];
  primaryAction: ActionId;
  tilt: number;
}

interface FeedbackState {
  message: string;
  tone: FeedbackTone;
}

interface InteractiveEquationProps {
  onContinue?: () => void;
}

const lessonStates: Record<LessonStep, LessonState> = {
  start: {
    id: "start",
    equation: "2x + 4 = 10",
    prompt: "Start by removing the same constant from both sides.",
    leftTokens: [
      { id: "x-1", label: "x", tone: "variable" },
      { id: "x-2", label: "x", tone: "variable" },
      { id: "u-1", label: "1", tone: "unit" },
      { id: "u-2", label: "1", tone: "unit" },
      { id: "u-3", label: "1", tone: "unit" },
      { id: "u-4", label: "1", tone: "unit" },
    ],
    rightTokens: Array.from({ length: 10 }, (_, index) => ({
      id: `r-${index + 1}`,
      label: "1",
      tone: "unit",
    })),
    primaryAction: "subtract-4",
    tilt: -3,
  },
  afterSubtract: {
    id: "afterSubtract",
    equation: "2x = 6",
    prompt: "Nice. Now split both sides into 2 equal groups.",
    leftTokens: [
      { id: "sx-1", label: "x", tone: "variable" },
      { id: "sx-2", label: "x", tone: "variable" },
    ],
    rightTokens: Array.from({ length: 6 }, (_, index) => ({
      id: `sr-${index + 1}`,
      label: "1",
      tone: "unit",
    })),
    primaryAction: "divide-2",
    tilt: 2,
  },
  solved: {
    id: "solved",
    equation: "x = 3",
    prompt: "You isolated the variable. That means the equation is solved.",
    leftTokens: [{ id: "fx", label: "x", tone: "variable" }],
    rightTokens: Array.from({ length: 3 }, (_, index) => ({
      id: `fr-${index + 1}`,
      label: "1",
      tone: "unit",
    })),
    primaryAction: "divide-2",
    tilt: 0,
  },
};

const feedbackPalette: Record<
  FeedbackTone,
  { container: string }
> = {
  info: {
    container: "border-ocean/20 bg-ocean/[0.08] text-ocean",
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-700",
  },
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

const tokenStyles: Record<TokenTone, string> = {
  variable:
    "border-transparent bg-gradient-to-br from-ocean to-[#5f87ff] text-white shadow-lg shadow-ocean/25",
  unit: "border-slate-200 bg-white text-slate-600",
};

export function InteractiveEquation({
  onContinue,
}: InteractiveEquationProps): ReactElement {
  const [step, setStep] = useState<LessonStep>("start");
  const [feedback, setFeedback] = useState<FeedbackState>({
    message: "Think of every move as something you do equally to both sides.",
    tone: "info",
  });

  const activeState = useMemo(() => lessonStates[step], [step]);

  const isSolved = step === "solved";

  const handleAction = (action: ActionId): void => {
    if (step === "start" && action === "subtract-4") {
      setStep("afterSubtract");
      setFeedback({
        message: "Exactly. Subtracting 4 from both sides keeps the scale fair.",
        tone: "success",
      });
      return;
    }

    if (step === "afterSubtract" && action === "divide-2") {
      setStep("solved");
      setFeedback({
        message: "Beautiful. Each side is now one clean group, so x = 3.",
        tone: "success",
      });
      return;
    }

    const warningMessage =
      step === "start"
        ? "Not yet. First remove the constant so the variable side becomes simpler."
        : "Close. You already removed the constant, so now split both sides evenly by 2.";

    setFeedback({
      message: warningMessage,
      tone: "warning",
    });
  };

  const currentFeedbackStyles = feedbackPalette[feedback.tone];

  return (
    <motion.section
      className="glass-panel relative overflow-hidden p-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-aqua/15 via-transparent to-transparent" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ocean/70">
              Interactive lesson
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">Balancing Equations</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Solve <span className="font-semibold text-ink">2x + 4 = 10</span> by
              keeping both sides in sync. One careful action at a time.
            </p>
          </div>

          <div className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-500">
            Step{" "}
            <span className="font-semibold text-ink">
              {step === "start" ? "1" : step === "afterSubtract" ? "2" : "3"}
            </span>{" "}
            of 3
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-950 px-6 py-5 text-white">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
            Current equation
          </p>
          <div className="mt-3 text-3xl font-semibold">
            <BlockMath math={activeState.equation} />
          </div>
          <p className="mt-2 max-w-xl text-sm text-slate-300">{activeState.prompt}</p>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6">
          {isSolved ? (
            <div className="pointer-events-none absolute inset-x-12 top-4 flex justify-between">
              {Array.from({ length: 10 }, (_, index) => (
                <motion.span
                  key={`confetti-${index + 1}`}
                  className="h-3 w-2 rounded-full"
                  style={{
                    backgroundColor: [
                      "#2f6bff",
                      "#5ed4c8",
                      "#ffd166",
                      "#34d399",
                    ][index % 4],
                  }}
                  initial={{ y: -10, rotate: 0, opacity: 0 }}
                  animate={{
                    y: [0, 28, 58],
                    rotate: [0, 90, 180],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.2,
                    delay: index * 0.04,
                    repeat: Infinity,
                    repeatDelay: 1.3,
                  }}
                />
              ))}
            </div>
          ) : null}

          <div className="mb-6 flex items-center justify-center gap-3 text-slate-400">
            <Scale className="h-5 w-5" />
            <span className="text-sm font-medium">
              Every move must happen on both sides.
            </span>
          </div>

          <div className="relative mx-auto max-w-3xl">
            <motion.div
              className="absolute left-1/2 top-8 h-3 w-3 -translate-x-1/2 rounded-full bg-slate-400"
              animate={{ scale: isSolved ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.7, repeat: isSolved ? Infinity : 0 }}
            />
            <motion.div
              className="mx-auto h-3 w-full max-w-2xl rounded-full bg-slate-300"
              animate={{ rotate: activeState.tilt }}
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
              style={{ transformOrigin: "center center" }}
            />

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <Pan
                title="Left side"
                tokens={activeState.leftTokens}
                emphasis={activeState.id !== "solved"}
              />

              <motion.div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/80"
                animate={{ scale: isSolved ? [1, 1.06, 1] : 1 }}
                transition={{ duration: 0.8, repeat: isSolved ? Infinity : 0 }}
              >
                <Equal className="h-6 w-6 text-ocean" />
              </motion.div>

              <Pan
                title="Right side"
                tokens={activeState.rightTokens}
                emphasis={activeState.id === "solved"}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ActionButton
            icon={<Minus className="h-4 w-4" />}
            label="Subtract 4 from both sides"
            hint="Remove the constant term first."
            disabled={isSolved}
            highlighted={activeState.primaryAction === "subtract-4" && !isSolved}
            onClick={() => handleAction("subtract-4")}
          />
          <ActionButton
            icon={<Split className="h-4 w-4" />}
            label="Divide both sides by 2"
            hint="Use this after you isolate 2x."
            disabled={isSolved}
            highlighted={activeState.primaryAction === "divide-2" && !isSolved}
            onClick={() => handleAction("divide-2")}
          />
        </div>

        <motion.div
          key={feedback.message}
          className={`mt-5 rounded-3xl border px-4 py-4 text-sm ${currentFeedbackStyles.container}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {feedback.message}
        </motion.div>

        <AnimatePresence>
          {isSolved ? (
            <motion.div
              className="mt-6 flex flex-col gap-4 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 md:flex-row md:items-center md:justify-between"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900">
                    Success. You found the value of x.
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    This is the core algebra habit: simplify, keep both sides
                    balanced, then isolate the variable.
                  </p>
                </div>
              </div>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                onClick={onContinue}
                type="button"
              >
                <PartyPopper className="h-4 w-4" />
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

interface PanProps {
  title: string;
  tokens: PanToken[];
  emphasis: boolean;
}

function Pan({ title, tokens, emphasis }: PanProps): ReactElement {
  return (
    <motion.div
      layout
      className={`rounded-[28px] border p-5 ${
        emphasis
          ? "border-ocean/20 bg-ocean/5 shadow-lg shadow-ocean/5"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <div className="mt-4 flex min-h-28 flex-wrap items-center gap-3">
        <AnimatePresence mode="popLayout">
          {tokens.map((token) => (
            <motion.div
              key={token.id}
              layout
              className={`flex h-12 min-w-12 items-center justify-center rounded-2xl border px-3 text-sm font-semibold ${tokenStyles[token.tone]}`}
              initial={{ opacity: 0, scale: 0.7, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -10 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
            >
              {token.label}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface ActionButtonProps {
  icon: ReactNode;
  label: string;
  hint: string;
  disabled: boolean;
  highlighted: boolean;
  onClick: () => void;
}

function ActionButton({
  icon,
  label,
  hint,
  disabled,
  highlighted,
  onClick,
}: ActionButtonProps): ReactElement {
  return (
    <motion.button
      className={`rounded-[28px] border px-5 py-4 text-left transition ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
          : highlighted
            ? "border-ocean/30 bg-ocean/[0.07] text-ink shadow-lg shadow-ocean/10"
            : "border-slate-200 bg-white text-ink hover:border-ocean/25 hover:bg-ocean/5"
      }`}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      type="button"
      disabled={disabled}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            disabled ? "bg-white/70 text-slate-400" : "bg-white text-ocean"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-slate-500">{hint}</p>
        </div>
      </div>
    </motion.button>
  );
}
