import json
import os
import re
from collections import defaultdict
from astclass import RootNode, ChildNode, ASTNode

def normalize_code(code):
    """Ensure course code is formatted as 'DEPT NUMBER' with a single space."""
    if not code:
        return code
    code = code.strip()
    # Don't normalize special codes like "OR"
    if code == "OR":
        return code
    # Match letters (dept) followed by optional space then the rest (number + suffix)
    match = re.match(r'^([A-Za-z/]+)\s*(.+)$', code)
    if match:
        dept = match.group(1).strip()
        number = match.group(2).strip()
        return f"{dept} {number}"
    return code

def build_global_course_dict(webreg_data):
    course_dict = {}
    for course_entry in webreg_data:
        course = course_entry.get("course", {})
        code = normalize_code(course.get("code", ""))
        if code:
            course_dict[code] = {
                "code": code,
                "title": course.get("title", ""),
                "prereq_ast": course.get("prereq").get("items") if course.get("prereq") else [],
            }
    return course_dict


def build(filestream, global_course_dict):
    return_list = []
    for course in filestream:
        course_id = normalize_code(course.get("code"))
        prereqs = course.get("prereq_ast", [])
        root = RootNode(course_id, find_children(prereqs, global_course_dict))
        return_list.append(root)
    return return_list

def find_children(prereq_nodes, course_dict, visited=None):
    if visited is None:
        visited = set()
    
    clist = []
    if not prereq_nodes: 
        return []
    
    for child in prereq_nodes:
        ctype = child.get("type")
        
        if ctype == "COURSE":
            course_id = normalize_code(child.get("course_id"))
            
            # prevent cycles
            if course_id in visited:
                clist.append(ChildNode(course_id, []))
                continue
            
            new_visited = visited | {course_id}
            
            # look up prereqs and recursion
            course_data = course_dict.get(course_id)
            if course_data and course_data.get("prereq_ast"):
                sub_prereqs = course_data.get("prereq_ast", [])
                children = find_children(sub_prereqs, course_dict, new_visited)
                clist.append(ChildNode(course_id, children))
            else:
                clist.append(ChildNode(course_id, []))

        elif ctype == "OR":
            sublist = []
            for subchild in child.get("items", []):
                course_id = normalize_code(subchild.get("course_id"))
                
                if course_id in visited:
                    sublist.append(ChildNode(course_id, []))
                    continue
                
                new_visited = visited | {course_id}
                
                # look ups and recursion
                course_data = course_dict.get(course_id)
                if course_data and course_data.get("prereq_ast"):
                    sub_prereqs = course_data.get("prereq_ast", [])
                    children = find_children(sub_prereqs, course_dict, new_visited)
                    sublist.append(ChildNode(course_id, children))
                else:
                    sublist.append(ChildNode(course_id, []))

            clist.append(ChildNode("OR", sublist))

    return clist


def filter_courses_by_department(webreg_data, dept_code):
    """Filter courses by department code and extract prerequisite AST."""
    courses = []
    for course_entry in webreg_data:
        course = course_entry.get("course", {})
        code = normalize_code(course.get("code", ""))
        
        if code.startswith(dept_code):
            courses.append({
                "code": code,
                "title": course.get("title", ""),
                "prereq_ast": course.get("prereq").get("items") if course.get("prereq") else [],
            })
    
    return courses


def get_department_code(course_code):
    if not course_code:
        return ""
    
    code = normalize_code(course_code)
    first_part = code.split()[0]
    
    if '/' in first_part:
        first_part = first_part.split('/')[0]
    
    return first_part


def process_all_departments(webreg_data, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    # Build global course dictionary for cross-department lookups
    global_course_dict = build_global_course_dict(webreg_data)
    
    # Group courses by department
    dept_courses = defaultdict(list)
    for course_entry in webreg_data:
        course = course_entry.get("course", {})
        code = normalize_code(course.get("code", ""))
        dept_code = get_department_code(code)
        
        if dept_code:
            dept_courses[dept_code].append({
                "code": code,
                "title": course.get("title", ""),
                "prereq_ast": course.get("prereq").get("items") if course.get("prereq") else [],
            })
    

    total_courses = 0
    for dept_code, courses in sorted(dept_courses.items()):
        dept_ast = build(courses, global_course_dict)
        dept_ast_dict = [root.to_dict() for root in dept_ast]
        

        output_file = os.path.join(output_dir, f"{dept_code.lower()}_ast.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(dept_ast_dict, f, indent=2, ensure_ascii=False)
        
        print(f"Processed {len(dept_ast)} {dept_code} courses -> {output_file}")
        total_courses += len(dept_ast)
    
    return len(dept_courses), total_courses


if __name__ == "__main__":
    # Load data
    with open("data/combined.json", "r", encoding="utf-8") as f:
        webreg_data = json.load(f)

    print("Processing all departments from combined.json...")
    print("-" * 50)
    
    # Process all departments
    output_dir = "data/ast"
    num_depts, total_courses = process_all_departments(webreg_data, output_dir)
    
    print("-" * 50)
    print(f"Summary: Processed {num_depts} departments with {total_courses} total courses")
    print(f"AST files saved to: {output_dir}/")