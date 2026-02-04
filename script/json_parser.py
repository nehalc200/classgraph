from datetime import date, datetime, timezone
import pandas as pd
import json

df = pd.read_csv('data/all_courses.csv')

test = df.iloc[916]

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
        "senior standing",
        "GRADUATE-STANDING",
        "NAN",
    ]

    if raw_str.strip() == "" or raw_str.strip().lower() == "none":
        return {
            "AND": [], "OR": [], "notes": [], False: success
        }

    # Use a temporary lowercased string for matching
    lowered = raw_str.lower()
    original = raw_str

    # remove special cases and append them into notes
    for case in special_cases:
        if case in lowered:
            # find the index in the original string for the matched case
            start = lowered.find(case)
            end = start + len(case)
            notes.append(original[start:end])
            # remove from both strings 
            lowered = lowered.replace(case, "")
            original = original[:start] + original[end:]
    lowered = lowered.replace(";;", ";").replace("  ", " ").strip("; ").strip()
    original = original.replace(";;", ";").replace("  ", " ").strip("; ").strip()

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
            or_list.append([s.upper() for s in subset])
        else:
            and_list.append(item.upper())

    return {
         "AND": and_list, "OR": or_list, "notes": notes, True: success
    }


def main():
    version = date.today().isoformat()
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    output = []

    for _, row in df.iterrows():
        AND_List, OR_list, notes, parsable = parse_prereqs(str(row["Prerequisites"])).values()

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
            "raw_prereq": str(row["Prerequisites"]) if row["Prerequisites"] else "",
            "parseable": parsable,
            "prereq": prereq_obj,
            "notes": notes,
        }


        output.append({
            "meta": {
                "version": version,
                "generated_at": generated_at
            },
            "course": course_obj
        })

    with open("data/webreg_data.json", "w") as f:
        json.dump(output, f, indent=2)



if __name__ == "__main__":
    main()