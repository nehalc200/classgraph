from datetime import date, datetime, timezone
from pathlib import Path
import json
import re
from dataclasses import dataclass
from typing import List, Union

import pandas as pd

# Course pattern
COURSE_RE = re.compile(r"^([A-Z]{2,6})\s*-?\s*(\d{1,3}[A-Z]{0,2})$")


@dataclass
class Course:
    code: str

@dataclass 
class OrExpr:
    items: List[Union['Course', 'OrExpr', 'AndExpr']]

@dataclass
class AndExpr:
    items: List[Union['Course', 'OrExpr', 'AndExpr']]


def looks_like_course(text: str) -> bool:
    return bool(COURSE_RE.match(text.replace(" ", "")))


def extract_dept(text: str) -> str | None:
    """Extract department from a course code."""
    match = COURSE_RE.match(text.replace(" ", ""))
    if match:
        return match.group(1)
    return None


def find_prereq_boundary(raw_str: str) -> str:
    # Split by semicolon - everything after is notes/restrictions
    if ';' in raw_str:
        raw_str = raw_str.split(';')[0]
    
    return raw_str.strip()


def tokenize(text: str) -> List[str]:
    # Normalize the text
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Remove grade requirements 
    text = re.sub(r'\s+with\s+a\s+grade\s+of\s+[A-Za-z0-9+-]+(\s+or\s+(above|better))?', '', text, flags=re.IGNORECASE)
    
    tokens = []
    prev_dept = None
    
    raw_tokens = text.split()
    
    i = 0
    while i < len(raw_tokens):
        token = raw_tokens[i].strip(' ,')
        
        if not token:
            i += 1
            continue
            
        token_lower = token.lower()
        
        # Check for AND/OR keywords
        if token_lower == 'and':
            tokens.append('AND')
            i += 1
            continue
        elif token_lower == 'or':
            tokens.append('OR')
            i += 1
            continue
        
        # Try to combine with next token to form course code (e.g., "CSE" + "12")
        token_upper = token.upper()
        
        # Check if this is a department code followed by a number
        if re.match(r'^[A-Z]{2,6}$', token_upper) and i + 1 < len(raw_tokens):
            next_token = raw_tokens[i + 1].strip(' ,').upper()
            # Check if next token is a course number or number with range
            if re.match(r'^\d{1,3}[A-Z]{0,2}(-[A-Z0-9]+)*$', next_token):
                # Combine them
                combined = token_upper + next_token
                # Handle ranges like "20A-B-C"
                if '-' in next_token:
                    parts = next_token.split('-')
                    base_num = re.match(r'^(\d{1,3})([A-Z]{0,2})', parts[0])
                    if base_num:
                        # First part is complete
                        first_course = token_upper + parts[0]
                        tokens.append(first_course)
                        prev_dept = token_upper
                        # Rest are letter suffixes
                        for part in parts[1:]:
                            part = part.strip()
                            if re.match(r'^[A-Z]{1,2}$', part):
                                tokens.append(token_upper + base_num.group(1) + part)
                            elif re.match(r'^\d{1,3}[A-Z]{0,2}$', part):
                                tokens.append(token_upper + part)
                else:
                    tokens.append(token_upper + next_token)
                    prev_dept = token_upper
                i += 2
                continue
        
        # Check if it's already a complete course code
        if looks_like_course(token_upper):
            tokens.append(token_upper)
            prev_dept = extract_dept(token_upper)
            i += 1
            continue
        
        # Check if it's a number/range that needs department filled in
        if prev_dept:
            # Handle ranges like "31BH" or "4A-B-C-D"
            if '-' in token_upper:
                parts = token_upper.split('-')
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue
                    if re.match(r'^\d{1,3}[A-Z]{0,2}$', part):
                        tokens.append(prev_dept + part)
                    elif re.match(r'^[A-Z]{1,2}$', part) and tokens:
                        # Letter continuation - get base from last token
                        last = tokens[-1]
                        base = re.match(r'^([A-Z]{2,6})(\d{1,3})', last)
                        if base:
                            tokens.append(base.group(1) + base.group(2) + part)
                i += 1
                continue
            elif re.match(r'^\d{1,3}[A-Z]{0,2}$', token_upper):
                tokens.append(prev_dept + token_upper)
                i += 1
                continue
        
        # Unknown token - skip it
        i += 1
    
    return tokens


def parse_to_groups(tokens: List[str]) -> Union[Course, OrExpr, AndExpr, None]:
    """
    Example: A and B or C and D 
    Parses as: A and (B or C) and D -> AndExpr([A, OrExpr([B, C]), D])
    """
    if not tokens:
        return None
    
    # Filter to only course tokens and operators
    filtered = []
    for t in tokens:
        if t in ('AND', 'OR') or looks_like_course(t):
            filtered.append(t)
    
    if not filtered:
        return None
    
    # Remove leading/trailing operators
    while filtered and filtered[0] in ('AND', 'OR'):
        filtered.pop(0)
    while filtered and filtered[-1] in ('AND', 'OR'):
        filtered.pop()
    
    if not filtered:
        return None
    
    # First pass: group by OR (higher precedence)
    and_groups = []
    current_or_group = []
    
    i = 0
    while i < len(filtered):
        token = filtered[i]
        
        if token == 'AND':
            # Finish current OR group, start new one
            if current_or_group:
                and_groups.append(current_or_group)
                current_or_group = []
        elif token == 'OR':
            # Continue building current OR group
            pass
        else:
            # It's a course
            current_or_group.append(Course(code=token))
        
        i += 1
    
    if current_or_group:
        and_groups.append(current_or_group)
    
    if not and_groups:
        return None
    
    # Each and_group is a list of courses connected by OR
    and_items = []
    for or_group in and_groups:
        if len(or_group) == 1:
            and_items.append(or_group[0])
        elif len(or_group) > 1:
            and_items.append(OrExpr(items=or_group))
    
    if len(and_items) == 1:
        return and_items[0]
    else:
        return AndExpr(items=and_items)


def ast_to_dict(node: Union[Course, OrExpr, AndExpr, None]) -> dict | None:
    if node is None:
        return None
    
    if isinstance(node, Course):
        return {
            "type": "COURSE",
            "course_id": node.code
        }
    elif isinstance(node, OrExpr):
        return {
            "type": "OR",
            "items": [ast_to_dict(item) for item in node.items]
        }
    elif isinstance(node, AndExpr):
        return {
            "type": "AND", 
            "items": [ast_to_dict(item) for item in node.items]
        }
    return None


def parse_prereqs(raw_str: str) -> dict:
    if not raw_str or raw_str.strip().lower() == "none" or raw_str.strip() == "":
        return {
            "ast": None,
            "parseable": False,
            "notes": []
        }
    
    # Extract notes 
    notes = []
    if ';' in raw_str:
        parts = raw_str.split(';')
        notes = [p.strip() for p in parts[1:] if p.strip()]
    
    # Get just the prerequisite part
    prereq_part = find_prereq_boundary(raw_str)
    
    # Tokenize
    tokens = tokenize(prereq_part)
    
    # Parse 
    groups = parse_to_groups(tokens)
    
    return {
        "groups": groups,
        "parseable": groups is not None,
        "notes": notes
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
        ast = parsed.get("ast")
        notes = parsed.get("notes", [])
        parseable = parsed.get("parseable", False)

        course_obj = {
            "code": row["Code"],
            "title": row["Title"],
            "raw_prereq": raw_prereq,
            "parseable": parseable,
            "notes": notes,
        }
        
        if ast is not None:
            course_obj["prereq"] = ast_to_dict(ast)

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
