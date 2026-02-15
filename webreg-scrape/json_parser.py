from datetime import date, datetime, timezone
from pathlib import Path
import json
import re

import pandas as pd

# Updated regex: Accepts 2-6 uppercase letters, optional space/hyphen, 1-3 digits, and up to 2 trailing uppercase letters
COURSE_RE = re.compile(r"^[A-Z]{2,6}\s*-?\s*\d{1,3}[A-Z]{0,2}$")


def looks_like_course(text):
    return bool(COURSE_RE.match(text.replace(" ", "")) or COURSE_RE.match(text))


def _normalize_spacing(text):
    text = text.replace(";;", ";")
    # Remove commas that appear before ' and ' or ' or '
    text = re.sub(r',\s+(and|or)\s+', r' \1 ', text)
    # Remove trailing commas from course codes
    text = re.sub(r'([A-Z]{2,6}\s*-?\s*\d{1,3}[A-Z]{0,2}),', r'\1', text)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" ;,").strip()


def _fill_missing_dept(or_text, prev_dept):
    """
    If a course in an OR group is just a number or number+letters, prepend the previous department.
    """
    # Remove spaces/hyphens for matching
    compact = or_text.replace(" ", "").replace("-", "")
    # If it starts with digits, it's missing a department
    if re.match(r"^\d{1,3}[A-Z]{0,2}$", compact) and prev_dept:
        return prev_dept + compact
    return or_text


def _expand_course_range(text):
    """
    Expand course ranges like 'ECE 271A-B' into ['ECE 271A', 'ECE 271B']
    or 'MATH 20A-E' into ['MATH 20A', 'MATH 20B', ..., 'MATH 20E']
    """
    # Pattern: DEPT NUM LETTER-LETTER (e.g., "ECE 271A-B")
    range_pattern = r'^([A-Z]{2,6})\s*-?\s*(\d{1,3})([A-Z])-([A-Z])$'
    match = re.match(range_pattern, text.replace(" ", ""))
    
    if match:
        dept = match.group(1)
        num = match.group(2)
        start_letter = match.group(3)
        end_letter = match.group(4)
        
        # Generate range A-B, A-C, etc.
        courses = []
        for letter_code in range(ord(start_letter), ord(end_letter) + 1):
            letter = chr(letter_code)
            courses.append(f"{dept}{num}{letter}")
        return courses
    
    return [text]


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

    lowered = raw_str.lower()
    original = raw_str

    # remove special cases and append them into notes
    for case in special_cases:
        while case in lowered:
            start = lowered.find(case)
            end = start + len(case)
            notes.append(original[start:end])
            # Remove the special case and surrounding ' or ' / ' and '
            removed_text = original[start:end]
            lowered = lowered[:start] + lowered[end:]
            original = original[:start] + original[end:]
            
            # Clean up leftover ' or ' or ' and ' patterns
            original = re.sub(r'\s+(or|and)\s*$', '', original)
            original = re.sub(r'^\s*(or|and)\s+', '', original)
            lowered = original.lower()

    lowered = _normalize_spacing(lowered)
    original = _normalize_spacing(original)

    # Remove grade requirements and other trailing text from course codes
    # Pattern: "COURSE with a grade of X or above/better"
    grade_pattern = r'\s+with\s+a\s+grade\s+of\s+[^\s;]+(\s+or\s+(above|better))?'
    original = re.sub(grade_pattern, '', original, flags=re.IGNORECASE)
    lowered = original.lower()

    # Split by semicolon first to separate major sections
    sections = [s.strip() for s in original.split(';') if s.strip()]
    
    # Process only the first section as prerequisites, rest go to notes
    if sections:
        prereq_section = sections[0]
        if len(sections) > 1:
            # Check if remaining sections are courses or just notes
            for section in sections[1:]:
                section_upper = section.upper()
                # Check if it's a course range or single course
                expanded = _expand_course_range(section_upper)
                if len(expanded) > 1 or looks_like_course(expanded[0]):
                    prereq_section += " and " + section
                else:
                    notes.append(section)
        
        temp = prereq_section.split(' and ')
    else:
        temp = []

    success = True

    prev_dept = None
    for item in temp:
        item = item.strip()
        if not item:
            continue
        
        # Check if this is a course range (e.g., "ECE 271A-B")
        item_upper = item.upper()
        expanded_courses = _expand_course_range(item_upper)
        
        # If it's a range, add all courses as AND requirements
        if len(expanded_courses) > 1:
            and_list.extend(expanded_courses)
            # Extract department for future use
            match = re.match(r"^([A-Z]{2,6})\s*-?\s*\d{1,3}[A-Z]{0,2}$", expanded_courses[0].replace(" ", ""))
            if match:
                prev_dept = match.group(1)
            continue
        
        if ' or ' in item:
            subset = [s.strip() for s in item.split(' or ') if s.strip()]
            valid_subset = []
            invalid_subset = []
            for idx, s in enumerate(subset):
                s_up = s.upper()
                match = re.match(r"^([A-Z]{2,6})\s*-?\s*\d{1,3}[A-Z]{0,2}$", s_up.replace(" ", ""))
                if idx == 0 and match:
                    prev_dept = match.group(1)
                if idx > 0 and prev_dept:
                    s_up = _fill_missing_dept(s_up, prev_dept)
                if looks_like_course(s_up):
                    valid_subset.append(s_up)
                else:
                    invalid_subset.append(s)
            
            # Only create OR group if we have more than 1 valid course
            if len(valid_subset) > 1:
                or_list.append(valid_subset)
            elif len(valid_subset) == 1:
                # Single course in OR group should just be an AND requirement
                and_list.append(valid_subset[0])
            
            if invalid_subset:
                notes.extend(invalid_subset)
        else:
            s_up = item.upper()
            match = re.match(r"^([A-Z]{2,6})\s*-?\s*\d{1,3}[A-Z]{0,2}$", s_up.replace(" ", ""))
            if match:
                prev_dept = match.group(1)
            if looks_like_course(s_up):
                and_list.append(s_up)
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
