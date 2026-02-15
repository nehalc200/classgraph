import json
from astclass import RootNode, ChildNode, ASTNode


def build(filestream):
    # Create a lookup dict
    course_dict = {course.get("code"): course for course in filestream}
    
    return_list = []
    for course in filestream:
        course_id = course.get("code")
        prereqs = course.get("prereq_ast", [])
        root = RootNode(course_id, find_children(prereqs, course_dict))
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
            course_id = child.get("course_id")
            
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
                course_id = subchild.get("course_id")
                
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
        code = course.get("code", "")
        
        if code.startswith(dept_code):
            prereq_json = course_entry.get("prereq")
            
            courses.append({
                "code": code,
                "title": course.get("title", ""),
                "prereq_ast": course.get("prereq").get("items") if course.get("prereq") else [],
            })
    
    return courses


if __name__ == "__main__":
    # load data
    with open("data/combined.json", "r", encoding="utf-8") as f:
        webreg_data = json.load(f)

    print("Enter department code:")
    dept_code = input().strip().upper()
    
    # filter by department
    courses = filter_courses_by_department(webreg_data, dept_code)
    
    # built asts
    dept_courses = build(courses)
    dept_courses_dict = [root.to_dict() for root in dept_courses]

    # Save to file
    output_file = f"data/{dept_code}_ast.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(dept_courses_dict, f, indent=2, ensure_ascii=False)

    print(f"Processed {len(dept_courses)} {dept_code} courses")
    print(f"AST data saved to: {output_file}")