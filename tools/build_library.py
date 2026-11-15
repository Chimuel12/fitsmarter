#!/usr/bin/env python3
"""Builds data/exercises.json from free-exercise-db (public domain, github.com/yuhonas/free-exercise-db).

Every exercise gets a rating rule (base lift + ratio) so a set can be placed in a tier.
Curated entries (including Technogym Selection / Pure Strength machines) have hand-set ratios
and borrow the photos of the closest free-exercise-db movement; the rest get ratios from
name keywords, equipment and primary muscle, and are flagged as estimates.

usage: python3 tools/build_library.py path/to/exercises.json <commit-sha>
"""
import json, re, sys, os

src, sha = sys.argv[1], sys.argv[2]
DB = {x["id"]: x for x in json.load(open(src))}

MUS = {"abdominals": "abs", "chest": "chest", "shoulders": "shoulders", "biceps": "biceps", "triceps": "triceps", "forearms": "forearms",
       "lats": "lats", "middle back": "lats", "lower back": "lowerback", "traps": "traps", "neck": "traps", "quadriceps": "quads",
       "hamstrings": "hamstrings", "glutes": "glutes", "calves": "calves", "adductors": "adductors", "abductors": "glutes"}
EQ = {"barbell": "bb", "e-z curl bar": "bb", "dumbbell": "db", "kettlebells": "kb", "machine": "mc", "cable": "cab", "body only": "bw"}
LINE = {"bb": "Free weights", "db": "Free weights", "kb": "Free weights", "mc": "Machine", "cab": "Cable", "bw": "Bodyweight"}
SEL, PS = "Technogym Selection", "Technogym Pure Strength"

# id: (name, equipment, line, base, ratio, primary, secondary, photo, per-hand)
C = {
 "bench": ("Flat bench press", "bb", None, "bench", 1, ["chest"], ["triceps", "shoulders"], "Barbell_Bench_Press_-_Medium_Grip", 0),
 "inclinebench": ("Incline bench press", "bb", None, "bench", .84, ["chest"], ["shoulders", "triceps"], "Barbell_Incline_Bench_Press_-_Medium_Grip", 0),
 "dbbench": ("Dumbbell bench press", "db", None, "bench", .37, ["chest"], ["triceps", "shoulders"], "Dumbbell_Bench_Press", 1),
 "inclinedb": ("Incline dumbbell press", "db", None, "bench", .33, ["chest"], ["shoulders", "triceps"], "Incline_Dumbbell_Press", 1),
 "dbfly": ("Dumbbell fly", "db", None, "bench", .16, ["chest"], ["shoulders"], "Dumbbell_Flyes", 1),
 "selchest": ("Chest Press", "mc", SEL, "bench", 1.0, ["chest"], ["triceps", "shoulders"], "Machine_Bench_Press", 0),
 "selpec": ("Pectoral (pec deck)", "mc", SEL, "bench", .62, ["chest"], ["shoulders"], "Butterfly", 0),
 "pschest": ("Chest Press", "mc", PS, "bench", 1.05, ["chest"], ["triceps", "shoulders"], "Leverage_Chest_Press", 0),
 "psincline": ("Incline Chest Press", "mc", PS, "bench", .9, ["chest"], ["shoulders", "triceps"], "Leverage_Incline_Chest_Press", 0),
 "pswide": ("Wide Chest Press", "mc", PS, "bench", 1.0, ["chest"], ["shoulders"], "Leverage_Chest_Press", 0),
 "cablecross": ("Cable crossover", "cab", None, "bench", .22, ["chest"], ["shoulders"], "Cable_Crossover", 1),
 "pushup": ("Push-ups", "bw", None, "pushup", 1, ["chest"], ["triceps", "shoulders"], "Pushups", 0),
 "dip": ("Dips", "bw", None, "dip", 1, ["triceps", "chest"], ["shoulders"], "Dips_-_Triceps_Version", 0),
 "deadlift": ("Deadlift", "bb", None, "deadlift", 1, ["lowerback", "glutes", "hamstrings"], ["traps", "quads", "forearms"], "Barbell_Deadlift", 0),
 "sumodl": ("Sumo deadlift", "bb", None, "deadlift", 1, ["glutes", "adductors", "lowerback"], ["quads", "traps"], "Sumo_Deadlift", 0),
 "row": ("Barbell row", "bb", None, "row", 1, ["lats"], ["biceps", "traps", "lowerback"], "Bent_Over_Barbell_Row", 0),
 "dbrow": ("One-arm dumbbell row", "db", None, "row", .48, ["lats"], ["biceps", "traps"], "One-Arm_Dumbbell_Row", 1),
 "pullup": ("Pull-ups", "bw", None, "pullup", 1, ["lats"], ["biceps", "forearms"], "Pullups", 0),
 "chinup": ("Chin-ups", "bw", None, "pullup", 1.15, ["lats", "biceps"], ["forearms"], "Chin-Up", 0),
 "pulldown": ("Lat Machine (pulldown)", "mc", SEL, "row", 1.0, ["lats"], ["biceps"], "Wide-Grip_Lat_Pulldown", 0),
 "selvt": ("Vertical Traction", "mc", SEL, "row", .95, ["lats"], ["biceps"], "Close-Grip_Front_Lat_Pulldown", 0),
 "sellowrow": ("Low Row", "mc", SEL, "row", 1.05, ["lats"], ["traps", "biceps"], "Seated_Cable_Rows", 0),
 "selupper": ("Upper Back", "mc", SEL, "row", .9, ["traps", "lats"], ["shoulders"], "Leverage_High_Row", 0),
 "psrow": ("Row", "mc", PS, "row", 1.1, ["lats"], ["traps", "biceps"], "Leverage_Iso_Row", 0),
 "pslowrow": ("Low Row", "mc", PS, "row", 1.1, ["lats"], ["traps", "biceps"], "Seated_Cable_Rows", 0),
 "pstbar": ("T-Bar Row", "mc", PS, "row", 1.0, ["lats", "traps"], ["biceps", "lowerback"], "T-Bar_Row_with_Handle", 0),
 "pspulldown": ("Pulldown", "mc", PS, "row", 1.05, ["lats"], ["biceps"], "V-Bar_Pulldown", 0),
 "pspullover": ("Pullover", "mc", PS, "row", .7, ["lats"], ["chest"], "Straight-Arm_Dumbbell_Pullover", 0),
 "psdeadlift": ("Deadlift", "mc", PS, "deadlift", 1.0, ["lowerback", "glutes", "hamstrings"], ["traps", "quads"], "Leverage_Deadlift", 0),
 "cablerow": ("Seated cable row", "cab", None, "row", 1.0, ["lats"], ["biceps", "traps"], "Seated_Cable_Rows", 0),
 "facepull": ("Face pull", "cab", None, "curl", .8, ["shoulders", "traps"], [], "Face_Pull", 0),
 "shrug": ("Barbell shrug", "bb", None, "deadlift", .8, ["traps"], ["forearms"], "Barbell_Shrug", 0),
 "selback": ("Lower Back", "mc", SEL, "deadlift", .45, ["lowerback"], ["glutes"], "Hyperextensions_Back_Extensions", 0),
 "ohp": ("Overhead press", "bb", None, "ohp", 1, ["shoulders"], ["triceps"], "Standing_Military_Press", 0),
 "dbohp": ("Seated dumbbell press", "db", None, "ohp", .42, ["shoulders"], ["triceps"], "Dumbbell_Shoulder_Press", 1),
 "lateral": ("Lateral raise", "db", None, "curl", .3, ["shoulders"], [], "Side_Lateral_Raise", 1),
 "selshoulder": ("Shoulder Press", "mc", SEL, "ohp", 1.15, ["shoulders"], ["triceps"], "Machine_Shoulder_Military_Press", 0),
 "selrear": ("Rear Delt", "mc", SEL, "curl", .75, ["shoulders"], ["traps"], "Reverse_Machine_Flyes", 0),
 "psshoulder": ("Shoulder Press", "mc", PS, "ohp", 1.2, ["shoulders"], ["triceps"], "Leverage_Shoulder_Press", 0),
 "cablelateral": ("Cable lateral raise", "cab", None, "curl", .2, ["shoulders"], [], "Cable_Seated_Lateral_Raise", 1),
 "curl": ("Barbell curl", "bb", None, "curl", 1, ["biceps"], ["forearms"], "Barbell_Curl", 0),
 "dbcurl": ("Dumbbell curl", "db", None, "curl", .45, ["biceps"], ["forearms"], "Dumbbell_Bicep_Curl", 1),
 "hammer": ("Hammer curl", "db", None, "curl", .48, ["biceps", "forearms"], [], "Hammer_Curls", 1),
 "selcurl": ("Arm Curl", "mc", SEL, "curl", 1.1, ["biceps"], [], "Machine_Bicep_Curl", 0),
 "psbiceps": ("Biceps", "mc", PS, "curl", 1.15, ["biceps"], [], "Machine_Preacher_Curls", 0),
 "cablecurl": ("Cable curl", "cab", None, "curl", .9, ["biceps"], ["forearms"], "Standing_Biceps_Cable_Curl", 0),
 "skull": ("Skull crusher", "bb", None, "curl", .95, ["triceps"], [], "EZ-Bar_Skullcrusher", 0),
 "pushdown": ("Triceps pushdown", "cab", None, "curl", 1.0, ["triceps"], [], "Triceps_Pushdown", 0),
 "selext": ("Arm Extension", "mc", SEL, "curl", 1.2, ["triceps"], [], "Machine_Triceps_Extension", 0),
 "psdip": ("Seated Dip", "mc", PS, "bench", 1.2, ["triceps"], ["chest"], "Dip_Machine", 0),
 "squat": ("Back squat", "bb", None, "squat", 1, ["quads", "glutes"], ["adductors", "lowerback"], "Barbell_Squat", 0),
 "frontsquat": ("Front squat", "bb", None, "squat", .8, ["quads"], ["glutes", "abs"], "Front_Barbell_Squat", 0),
 "lunge": ("Dumbbell lunge", "db", None, "squat", .25, ["quads", "glutes"], ["hamstrings"], "Dumbbell_Lunges", 1),
 "bulgarian": ("Split squat", "db", None, "squat", .24, ["quads", "glutes"], [], "Split_Squat_with_Dumbbells", 1),
 "rdl": ("Romanian deadlift", "bb", None, "deadlift", .75, ["hamstrings", "glutes"], ["lowerback"], "Romanian_Deadlift", 0),
 "hipthrust": ("Barbell hip thrust", "bb", None, "squat", 1.1, ["glutes"], ["hamstrings"], "Barbell_Hip_Thrust", 0),
 "legpress": ("Leg Press", "mc", SEL, "squat", 1.9, ["quads", "glutes"], ["hamstrings"], "Leg_Press", 0),
 "legext": ("Leg Extension", "mc", SEL, "squat", .6, ["quads"], [], "Leg_Extensions", 0),
 "legcurl": ("Leg Curl (seated)", "mc", SEL, "squat", .5, ["hamstrings"], ["calves"], "Seated_Leg_Curl", 0),
 "pronecurl": ("Prone Leg Curl", "mc", SEL, "squat", .4, ["hamstrings"], [], "Lying_Leg_Curls", 0),
 "abductor": ("Abductor", "mc", SEL, "squat", .75, ["glutes"], [], "Thigh_Abductor", 0),
 "adductor": ("Adductor", "mc", SEL, "squat", .7, ["adductors"], [], "Thigh_Adductor", 0),
 "selglute": ("Glute", "mc", SEL, "squat", .5, ["glutes"], ["hamstrings"], "Glute_Kickback", 0),
 "selcalf": ("Calf", "mc", SEL, "squat", .9, ["calves"], [], "Standing_Calf_Raises", 0),
 "pslegpress": ("Leg Press", "mc", PS, "squat", 2.2, ["quads", "glutes"], ["hamstrings"], "Leg_Press", 0),
 "pslinear": ("Linear Leg Press", "mc", PS, "squat", 2.0, ["quads", "glutes"], ["hamstrings"], "Narrow_Stance_Leg_Press", 0),
 "pshack": ("Hack Squat", "mc", PS, "squat", 1.0, ["quads"], ["glutes"], "Hack_Squat", 0),
 "psbelt": ("Belt Squat", "mc", PS, "squat", 1.0, ["quads", "glutes"], ["adductors"], "Hack_Squat", 0),
 "pship": ("Hip Thrust", "mc", PS, "squat", 1.2, ["glutes"], ["hamstrings"], "Barbell_Hip_Thrust", 0),
 "pslegext": ("Leg Extension", "mc", PS, "squat", .6, ["quads"], [], "Leg_Extensions", 0),
 "pslegcurl": ("Standing Leg Curl", "mc", PS, "squat", .3, ["hamstrings"], [], "Standing_Leg_Curl", 0),
 "psabduct": ("Standing Abductor", "mc", PS, "squat", .5, ["glutes"], [], "Thigh_Abductor", 0),
 "pskick": ("Rear Kick", "mc", PS, "squat", .4, ["glutes"], ["hamstrings"], "One-Legged_Cable_Kickback", 0),
 "pscalf": ("Calf", "mc", PS, "squat", 1.0, ["calves"], [], "Standing_Calf_Raises", 0),
 "psseatcalf": ("Seated Calf", "mc", PS, "squat", .7, ["calves"], [], "Seated_Calf_Raise", 0),
 "calfraise": ("Standing calf raise", "bb", None, "squat", 1.0, ["calves"], [], "Standing_Barbell_Calf_Raise", 0),
 "selcrunch": ("Abdominal Crunch", "mc", SEL, "bench", .55, ["abs"], [], "Ab_Crunch_Machine", 0),
 "selrotary": ("Rotary Torso", "mc", SEL, "bench", .45, ["abs"], [], "Cable_Russian_Twists", 0),
 "cablecrunch": ("Cable crunch", "cab", None, "bench", .7, ["abs"], [], "Cable_Crunch", 0),
 "legraise": ("Hanging leg raise", "bw", None, "legraise", 1, ["abs"], ["forearms"], "Hanging_Leg_Raise", 0),
}

# keyword rules for the rest: (regex on name, base, ratio for barbell/machine, ratio per dumbbell)
RULES = [
 (r"bench press|floor press|board press|pin press", "bench", 1.0, .37), (r"decline.*press", "bench", 1.05, .38), (r"incline.*press", "bench", .84, .33),
 (r"chest press", "bench", 1.0, .37), (r"fly|flye|crossover|butterfly", "bench", .5, .16), (r"pullover", "row", .6, .3),
 (r"front squat", "squat", .8, .3), (r"hack squat|leg press|sled", "squat", 1.6, .3), (r"squat", "squat", 1.0, .3), (r"lunge|split squat|step-?up", "squat", .55, .25),
 (r"romanian|stiff.?leg|good morning", "deadlift", .75, .35), (r"deadlift|rack pull", "deadlift", 1.0, .4), (r"hip thrust|glute bridge", "squat", 1.1, .4),
 (r"military|overhead press|shoulder press|push press|arnold", "ohp", 1.0, .42), (r"upright row", "ohp", .9, .35),
 (r"lateral raise|front raise|rear delt|reverse fl", "curl", .7, .3), (r"shrug", "deadlift", .8, .35),
 (r"pulldown|pull-down", "row", 1.0, .45), (r"row", "row", 1.0, .48),
 (r"leg extension", "squat", .6, .2), (r"leg curl", "squat", .45, .2), (r"calf", "squat", 1.0, .35),
 (r"hammer curl", "curl", 1.0, .48), (r"curl", "curl", 1.0, .45),
 (r"pushdown|skull|triceps? (extension|press)|kickback|french press|jm press", "curl", 1.0, .25), (r"close-?grip.*bench", "bench", .9, .35),
 (r"crunch|twist|wood ?chop|ab roll", "bench", .5, .2), (r"hyperextension|back extension", "deadlift", .45, .2), (r"adductor|abductor", "squat", .7, .3),
]
BW_RULES = [(r"pull-?ups?|chin", "pullup"), (r"dip", "dip"), (r"push-?ups?|pushups", "pushup"), (r"leg raise|knee raise|crunch|sit-?up|v-?up|jackknife", "legraise"),
            (r"squat|lunge|step-?up|pistol", "bwlegs")]
FALLBACK = {"chest": ("bench", .5), "shoulders": ("ohp", .6), "lats": ("row", .8), "biceps": ("curl", .8), "triceps": ("curl", .9), "forearms": ("curl", .7),
            "traps": ("deadlift", .6), "lowerback": ("deadlift", .45), "quads": ("squat", .7), "hamstrings": ("squat", .45), "glutes": ("squat", .8),
            "calves": ("squat", .9), "adductors": ("squat", .6), "abs": ("bench", .4)}
BW_FALLBACK = {"abs": "legraise", "quads": "bwlegs", "glutes": "bwlegs", "hamstrings": "bwlegs", "calves": "bwlegs", "chest": "pushup", "triceps": "dip", "lats": "pullup", "biceps": "pullup"}

def muscles(x, key):
    return list(dict.fromkeys(MUS[m] for m in x[key] if m in MUS))

def entry(x):
    eq = EQ.get(x["equipment"]); name = x["name"]; low = name.lower()
    prim = muscles(x, "primaryMuscles"); sec = [m for m in muscles(x, "secondaryMuscles") if m not in prim]
    if not eq or not prim: return None
    if eq == "bw":
        base = next((b for r, b in BW_RULES if re.search(r, low)), BW_FALLBACK.get(prim[0]))
        if not base: return None
        return dict(n=name, eq=eq, line=LINE[eq], base=base, k=1, mus=prim, sec=sec, img=x["id"], hand=0, est=1)
    hand = 1 if eq in ("db", "kb") and not re.search(r"two-?arm|goblet|single dumbbell", low) else 0
    rule = next((r for r in RULES if re.search(r[0], low)), None)
    if rule: base, k = rule[1], (rule[3] if eq in ("db", "kb") else rule[2])
    else:
        base, k = FALLBACK[prim[0]]; k *= (.45 if eq in ("db", "kb") else 1)
    if eq == "cab" and rule: k *= .9
    return dict(n=name, eq=eq, line=LINE[eq], base=base, k=round(k, 3), mus=prim, sec=sec, img=x["id"], hand=hand, est=1)

out = {}
for cid, (n, eq, line, base, k, mus, sec, img, hand) in C.items():
    assert img in DB, img
    out[cid] = dict(n=n, eq=eq, line=line or LINE[eq], base=base, k=k, mus=mus, sec=sec, img=img, hand=hand,
                    lvl=DB[img]["level"], ins=DB[img]["instructions"])
used = {v[7] for v in C.values() if v[2] is None}  # free-weight photos already represented
for x in DB.values():
    if x["category"] not in ("strength", "powerlifting", "olympic weightlifting", "strongman") or x["id"] in used: continue
    e = entry(x)
    if e: e.update(lvl=x["level"], ins=x["instructions"]); out[x["id"]] = e

os.makedirs("data", exist_ok=True)
json.dump({"source": "free-exercise-db (Unlicense)", "sha": sha, "ex": out}, open("data/exercises.json", "w"), separators=(",", ":"), ensure_ascii=False)
print(len(out), "exercises,", os.path.getsize("data/exercises.json") // 1024, "KB")
