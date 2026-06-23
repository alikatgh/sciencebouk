#!/usr/bin/env python3
"""Populate the empty ``"glossary": []`` lists in seed_subjects.py.

Built to catch the "complete lessons for all subjects" gap: the 64 subject
equations (ids 18-81) shipped with full hooks/variables/presets/lessons but 61
of them had an EMPTY glossary, so the data-driven ConfigurableEquationScene had
no tappable, colour-coded term highlights — the single biggest interactivity +
completeness gap vs. the Bayes/Ideal-Gas gold standard.

What it does: walks seed_subjects.py line-by-line, tracks the current entry's
``sort_order``, and replaces that entry's ``"glossary": [],`` line with an
authored glossary block (words → highlightClass → colour → tooltip). Idempotent:
only the empty ``[]`` form is replaced, so re-running is a no-op and the three
hand-written glossaries (ids 18/21/26) are left untouched.

What it does NOT catch: variable/preset/lesson correctness — only glossary
population. Run ``python manage.py seed_subjects`` afterwards to push the new
``glossary_data`` into the DB the API serves.

Usage (from repo root):  python3 scripts/add_subject_glossaries.py
"""

import json
import pathlib
import re
import sys

SEED = pathlib.Path("backend/courses/management/commands/seed_subjects.py")

# Variable-colour palette (mirrors frontend VAR_COLORS) so a highlighted term
# matches the colour of the slider it explains.
P = "#3b82f6"  # primary
S = "#f59e0b"  # secondary
T = "#10b981"  # tertiary
Q = "#a855f7"  # quaternary
R = "#ef4444"  # result / output

# id -> [(words, colour, tooltip), ...]. Words include a single-token fallback
# so the \b(...)\b linker highlights them inside the lesson copy.
GLOSSARY = {
    # ---- Computer Science ----
    19: [(["sorted"], P, "Binary search only works on pre-sorted data"),
         (["half", "halves"], S, "Each comparison throws away half of what's left"),
         (["logarithmic", "log"], T, "Doubling the list adds just one more step")],
    20: [(["subproblems", "subproblem"], P, "a — how many subproblems each split creates"),
         (["divides", "shrinks"], S, "b — the factor each subproblem shrinks by"),
         (["recurrence", "recursion"], T, "Cost of a problem written in terms of its smaller copies")],
    22: [(["learning rate", "rate"], P, "α — how far you step against the gradient"),
         (["gradient"], S, "Slope of the error surface; it points uphill"),
         (["minimum"], T, "The lowest-error point training is hunting for")],
    23: [(["logits", "logit", "scores"], P, "Raw, unnormalised class scores"),
         (["probabilities", "probability"], S, "Softmax turns scores into probabilities summing to 1"),
         (["exponential", "exponentiating"], T, "Exponentiating makes the largest score dominate")],
    24: [(["predicted", "prediction"], P, "q — the probability the model assigned"),
         (["loss"], S, "Penalty that grows as confident answers go wrong"),
         (["surprise"], T, "−log q: how surprised the model is by the truth")],
    25: [(["query", "key", "keys"], P, "Q·Kᵀ — how well a query matches each key"),
         (["scale", "scaling"], S, "Dividing by √dₖ keeps the scores from exploding"),
         (["weights", "softmax"], T, "Scores become weights that blend the values V")],
    # ---- Chemistry ----
    27: [(["temperature"], P, "T — raising it speeds the reaction"),
         (["activation energy", "barrier"], S, "Eₐ — the energy hill reactants must clear"),
         (["rate constant", "rate"], R, "k — how fast the reaction proceeds")],
    28: [(["acid strength", "pKa"], P, "pH at which half the acid is dissociated"),
         (["ratio"], S, "[A⁻]/[HA] — the base-to-acid balance"),
         (["buffer"], T, "Resists pH change near its pKa")],
    29: [(["standard potential", "potential"], P, "E⁰ — cell voltage at standard conditions"),
         (["electrons"], S, "n — electrons transferred per reaction"),
         (["reaction quotient", "quotient"], T, "Q — current ratio of products to reactants")],
    30: [(["absorptivity"], P, "ε — how strongly the species absorbs light"),
         (["path length", "path"], S, "l — distance light travels through the sample"),
         (["concentration"], T, "c — amount of absorbing species present")],
    31: [(["enthalpy"], P, "ΔH — heat released or absorbed"),
         (["temperature"], S, "T — couples to the entropy term"),
         (["entropy"], T, "ΔS — change in disorder"),
         (["spontaneous"], R, "ΔG < 0 means the reaction proceeds on its own")],
    32: [(["concentration"], P, "[A] — amount of reactant"),
         (["order"], S, "m — how sensitively rate depends on [A]"),
         (["rate constant", "rate"], T, "k — the intrinsic speed of the reaction")],
    33: [(["vaporization", "vaporisation"], P, "ΔH_vap — heat to turn liquid into gas"),
         (["temperature"], S, "T — where the phase boundary sits"),
         (["vapor pressure", "pressure"], R, "How vapour pressure climbs with temperature")],
    # ---- Physics ----
    34: [(["mass"], P, "m — resistance to being accelerated"),
         (["acceleration"], S, "a — the rate of change of velocity"),
         (["force"], R, "F = ma — the push that results")],
    35: [(["mass"], P, "m — heavier means more energy"),
         (["velocity", "speed"], S, "v — energy grows with its square"),
         (["kinetic energy", "energy"], R, "½mv² — the energy of motion")],
    36: [(["charge", "charges"], P, "q — like charges repel, opposite attract"),
         (["distance"], T, "r — force falls off as 1/r²"),
         (["force"], R, "The electrostatic push between charges")],
    37: [(["current"], P, "I — the flow of charge"),
         (["resistance"], S, "R — opposition to the current"),
         (["voltage"], R, "V = IR — the driving push")],
    38: [(["angle"], P, "θ — measured from the surface normal"),
         (["refractive index", "index"], S, "n — how much a medium slows light"),
         (["refraction", "bends"], T, "Light bends toward the slower medium")],
    39: [(["frequency", "pitch"], P, "f — the perceived pitch of the wave"),
         (["source"], S, "v_s — speed of the emitter"),
         (["shift"], T, "Approaching raises pitch, receding lowers it")],
    40: [(["temperature"], P, "T — radiated power scales as T⁴"),
         (["area"], S, "A — a larger surface radiates more"),
         (["radiated power", "power"], R, "Total energy a hot body emits")],
    41: [(["mass"], P, "m — heavier means a shorter wavelength"),
         (["velocity", "speed"], S, "v — faster means a shorter wavelength"),
         (["wavelength"], R, "λ = h/mv — matter behaving as a wave")],
    42: [(["position"], P, "Δx — uncertainty in location"),
         (["momentum"], S, "Δp — pinning one blurs the other"),
         (["uncertainty"], T, "Their product can't drop below ℏ/2")],
    43: [(["frequency"], P, "ν — the colour of the light"),
         (["quantum", "photon"], S, "Energy arrives in discrete packets"),
         (["energy"], R, "E = hν — the energy of one photon")],
    44: [(["charge"], P, "q — the moving particle's charge"),
         (["velocity"], S, "v — only moving charges feel the magnetic part"),
         (["magnetic field", "field"], T, "B — bends the path perpendicular to motion")],
    # ---- Biology ----
    45: [(["allele frequency", "allele"], P, "p — fraction of one allele in the pool"),
         (["genotype"], S, "p², 2pq, q² — the expected genotype shares"),
         (["equilibrium"], T, "Frequencies stay fixed without selection")],
    46: [(["population"], P, "N — the current number of individuals"),
         (["growth rate", "rate"], S, "r — the intrinsic reproduction rate"),
         (["carrying capacity", "capacity"], T, "K — the ceiling the environment allows")],
    47: [(["substrate"], P, "[S] — concentration feeding the enzyme"),
         (["affinity"], S, "K_m — the [S] giving half the maximum rate"),
         (["maximum rate"], T, "V_max — speed when the enzyme is saturated")],
    48: [(["GC content", "GC"], P, "Fraction of G–C base pairs"),
         (["bonds"], S, "G–C share three hydrogen bonds, A–T only two"),
         (["stability", "melting"], T, "More G–C makes a hotter-melting, stabler helix")],
    49: [(["potassium"], P, "[K⁺] — the dominant ion at rest"),
         (["sodium"], S, "[Na⁺] — drives the depolarising swing"),
         (["membrane potential", "potential"], R, "Resting voltage across the membrane")],
    50: [(["prey"], P, "x — the prey population"),
         (["predation"], S, "β — rate at which predators consume prey"),
         (["oscillation", "cycle"], T, "Predator and prey rise and fall out of phase")],
    # ---- Economics ----
    51: [(["principal"], P, "P — the starting amount"),
         (["rate"], S, "r — the interest rate per period"),
         (["compounding", "exponential"], T, "Interest earns interest over time")],
    52: [(["price"], P, "P — adjusts until the market clears"),
         (["equilibrium"], S, "Where quantity supplied meets quantity demanded"),
         (["shortage", "surplus"], T, "A mispriced market over- or under-supplies")],
    53: [(["consumption"], P, "C — household spending"),
         (["investment"], S, "I — business spending on capital"),
         (["government"], T, "G — public spending")],
    54: [(["nominal"], P, "The stated, before-inflation interest rate"),
         (["inflation"], S, "π — erodes purchasing power"),
         (["real rate", "real"], R, "Nominal rate minus inflation")],
    55: [(["beta"], P, "β — how much an asset swings with the market"),
         (["risk-free", "risk"], S, "R_f — the return that carries no risk"),
         (["market return", "market"], T, "R_m — return of the whole market")],
    56: [(["strategy"], P, "A plan no player wants to change alone"),
         (["payoff"], S, "The reward each outcome pays out"),
         (["equilibrium"], T, "Stable when unilateral defection doesn't help")],
    57: [(["capital"], P, "K — machines and tools"),
         (["labor", "labour"], S, "L — the workforce"),
         (["output"], R, "Production from combining capital and labour")],
    # ---- Statistics ----
    58: [(["spread", "deviation"], P, "σ — the typical distance from the mean"),
         (["variance"], S, "σ² — the average squared deviation"),
         (["mean"], T, "The centre the spread is measured from")],
    59: [(["slope"], P, "β₁ — change in y per unit of x"),
         (["intercept"], S, "β₀ — the value of y when x is zero"),
         (["best fit", "fit"], T, "The line minimising squared residuals")],
    60: [(["observed"], P, "O — the counts you actually measured"),
         (["expected"], S, "E — the counts the null hypothesis predicts"),
         (["goodness of fit", "fit"], T, "How far observed strays from expected")],
    61: [(["sample size", "sample"], P, "n — observations averaged together"),
         (["normal", "bell"], S, "Sample means approach a bell curve"),
         (["standard error"], T, "The spread of the mean shrinks as 1/√n")],
    62: [(["rate"], P, "λ — the average number of events per interval"),
         (["events", "count"], S, "k — how many actually occur"),
         (["rare"], T, "Models independent, rare events")],
    63: [(["transition"], P, "p — probability of switching state"),
         (["state"], S, "Where the system currently sits"),
         (["memoryless"], T, "The next step depends only on the present")],
    # ---- Engineering ----
    64: [(["stiffness", "spring constant"], P, "k — how stiff the spring is"),
         (["displacement", "stretch"], S, "x — distance from the rest position"),
         (["restoring force", "force"], R, "Pulls the spring back toward rest")],
    65: [(["modulus", "stiffness"], P, "E — the material's stiffness"),
         (["strain"], S, "ε — the fractional deformation"),
         (["stress"], R, "Internal force per unit area")],
    66: [(["velocity", "speed"], P, "v — faster flow means lower pressure"),
         (["height"], S, "h — elevation within the flow"),
         (["pressure"], R, "Trades off against speed and height")],
    67: [(["gain"], P, "K — the overall amplification"),
         (["pole"], S, "p — where the response blows up"),
         (["stability", "stable"], T, "Poles in the left half-plane stay stable")],
    68: [(["poles"], P, "P — unstable open-loop poles"),
         (["encirclements"], S, "N — times the plot circles the −1 point"),
         (["stability", "stable"], T, "Z = N + P must be zero for stability")],
    69: [(["velocity"], P, "v — the flow speed"),
         (["length"], S, "L — the characteristic size"),
         (["viscosity"], T, "µ — the fluid's resistance to flow"),
         (["turbulent", "turbulence"], R, "A high Reynolds number means chaotic flow")],
    # ---- Astronomy ----
    70: [(["semi-major axis", "orbit"], P, "a — the size of the orbit"),
         (["mass"], S, "M — the mass of the central body"),
         (["period"], R, "T — how long one orbit takes")],
    71: [(["distance"], P, "d — how far the galaxy is"),
         (["Hubble constant", "constant"], S, "H₀ — the expansion rate of the universe"),
         (["recession", "redshift"], R, "More distant galaxies recede faster")],
    72: [(["mass"], P, "M — the collapsed mass of the black hole"),
         (["event horizon", "horizon"], S, "The radius of no return"),
         (["escape"], T, "Below it, not even light escapes")],
    73: [(["radius"], P, "R — the size of the star"),
         (["temperature"], S, "T — surface temperature, raised to the 4th power"),
         (["luminosity"], R, "The total power the star radiates")],
    74: [(["life"], P, "f_l — fraction of worlds where life starts"),
         (["intelligence"], S, "f_i — fraction that become intelligent"),
         (["lifetime"], T, "L — how long a civilisation broadcasts")],
    75: [(["density"], P, "ρ — the matter and energy density"),
         (["curvature"], S, "k — the geometry of space"),
         (["expansion"], T, "Sets how fast the universe grows")],
    # ---- Linear Algebra ----
    76: [(["rows", "columns"], P, "Row i dotted with column j gives entry (i,j)"),
         (["dimension", "size"], S, "n — only matched inner dimensions can multiply"),
         (["dot product"], T, "Each output entry is one dot product")],
    77: [(["eigenvalue"], P, "λ — the factor a vector is scaled by"),
         (["eigenvector"], S, "A direction the matrix leaves unrotated"),
         (["scaling"], T, "Av = λv — pure stretch, no turn")],
    78: [(["determinant"], P, "ad − bc — the area-scaling factor"),
         (["area"], S, "How the matrix scales a unit area"),
         (["invertible", "singular"], T, "A zero determinant means non-invertible")],
    79: [(["singular values", "singular value"], P, "σ — the strength of each component"),
         (["rank"], S, "The number of non-zero singular values"),
         (["compression"], T, "Dropping small σ compresses the data")],
    80: [(["magnitude", "length"], P, "|a| — the length of a vector"),
         (["angle"], S, "θ — the angle between the two vectors"),
         (["projection"], T, "Measures how much one vector lies along another")],
    81: [(["magnitude", "length"], P, "|a| — the length of a vector"),
         (["angle"], S, "θ — the angle between the two vectors"),
         (["perpendicular", "normal"], T, "The result points perpendicular to both")],
}


def build_block(indent: str, eid: int) -> str:
    lines = [f'{indent}"glossary": [']
    for i, (words, color, tooltip) in enumerate(GLOSSARY[eid]):
        term = {"words": words, "highlightClass": f"g{eid}-{i}", "color": color, "tooltip": tooltip}
        lines.append(f"{indent}    " + json.dumps(term, ensure_ascii=False) + ",")
    lines.append(f"{indent}],")
    return "\n".join(lines)


def main() -> int:
    text = SEED.read_text(encoding="utf-8")
    lines = text.split("\n")
    so_re = re.compile(r'^\s*"sort_order":\s*(\d+),')
    empty_re = re.compile(r'^(\s*)"glossary":\s*\[\],\s*$')

    current = None
    replaced = 0
    out = []
    for line in lines:
        m = so_re.match(line)
        if m:
            current = int(m.group(1))
        eg = empty_re.match(line)
        if eg and current in GLOSSARY:
            out.append(build_block(eg.group(1), current))
            replaced += 1
            continue
        out.append(line)

    SEED.write_text("\n".join(out), encoding="utf-8")
    print(f"Populated {replaced} glossaries (of {len(GLOSSARY)} authored).")
    missing = replaced != len(GLOSSARY)
    if missing:
        print("WARNING: replaced count != authored count — check for already-filled entries.", file=sys.stderr)
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
