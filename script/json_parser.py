from datetime import date, datetime, timezone
from pathlib import Path
import json
import re

import pandas as pd

COURSE_RE = re.compile(r"^[A-Z]{2,4}\s*-?\s*\d{1,3}[A-Z]?$")


def looks_like_course(text):
    return bool(COURSE_RE.match(text.replace(" ", "")) or COURSE_RE.match(text))


def _normalize_spacing(text):
    text = text.replace(";;", ";")
    text = re.sub(r"\s+", " ", text)
    return text.strip(" ;,").strip()


def parse_prereqs(raw_str):
    and_list = []
    or_list = []
    notes = []
    success = False

    special_cases = [
        "graduate standing",
        "consent of instructor",
        "upper-division standing",
        "department approval",
        "lower-division standing",
        "department stamp",
        "instructor approval",
        "junior standing",
        "senior standing"
    ]

    if raw_str.strip() == "" or raw_str.strip().lower() == "none":
        return {
            "AND": [], "OR": [], "notes": [], "parseable": success
        }

    # Use a temporary lowercased string for matching
    lowered = raw_str.lower()
    original = raw_str

    # remove special cases and append them into notes
    for case in special_cases:
        while case in lowered:
            start = lowered.find(case)
            end = start + len(case)
            notes.append(original[start:end])
            lowered = lowered[:start] + lowered[end:]
            original = original[:start] + original[end:]

    lowered = _normalize_spacing(lowered)
    original = _normalize_spacing(original)

    # case handling for actual section of ANDs ORs
    if '; ' in lowered:
        first, *rest = lowered.split('; ')
        orig_first, *orig_rest = original.split('; ')
        temp = orig_first.split(' and ')
        notes.extend(orig_rest)
    else:
        temp = original.split(' and ')

    success = True

    for item in temp:
        item = item.strip()
        if not item:
            continue
        if ' or ' in item:
            subset = [s.strip() for s in item.split(' or ')]
            valid_subset = []
            invalid_subset = []
            for s in subset:
                if looks_like_course(s.upper()):
                    valid_subset.append(s.upper())
                else:
                    invalid_subset.append(s)
            if valid_subset:
                or_list.append(valid_subset)
            if invalid_subset:
                notes.extend(invalid_subset)
        else:
            if looks_like_course(item.upper()):
                and_list.append(item.upper())
            else:
                notes.append(item)

    return {
         "AND": and_list, "OR": or_list, "notes": notes, "parseable": success
    }


def load_courses_csv(path):
    return pd.read_csv(path, encoding="utf-8")


def generate_webreg_json(df, output_path):
    version = date.today().isoformat()
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    output = []

    for _, row in df.iterrows():
        raw_prereq = row["Prerequisites"]
        if raw_prereq is None or pd.isna(raw_prereq):
            raw_prereq = ""
        raw_prereq = str(raw_prereq)

        parsed = parse_prereqs(raw_prereq)
        AND_List = parsed.get("AND", [])
        OR_list = parsed.get("OR", [])
        notes = parsed.get("notes", [])
        parsable = parsed.get("parseable", False)

        prereq_items = []


         # add add groups
        for course_id in AND_List:
            prereq_items.append({
                "type": "COURSE",
                "course_id": course_id
            })

        
        # add or groups
        for or_group in OR_list:
            prereq_items.append({
                "type": "OR",
                "items": [
                    {
                        "type": "COURSE",
                        "course_id": course_id
                    } for course_id in or_group if course_id
                ]
            })



        prereq_obj = {
            "type": "AND",
            "items": prereq_items
        }

        course_obj = {
            "code": row["Code"],
            "title": row["Title"],
            "raw_prereq": raw_prereq,
            "parseable": parsable,
            "notes": notes,
            "prereq": prereq_obj,
        }

        output.append({
            "meta": {
                "version": version,
                "generated_at": generated_at
            },
            "course": course_obj
        })

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    return output


def main():
    df = load_courses_csv("data/all_courses.csv")
    output_path = Path("data/webreg_data.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    generate_webreg_json(df, output_path)

if __name__ == "__main__":
    main()
